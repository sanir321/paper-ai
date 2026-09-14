"""Unit tests for the auditor pipeline's pure logic (no network calls).

Run with:  python -m pytest backend/tests -q   (requires pytest installed)
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.llm_service import (
    _split_document,
    _adaptive_max_questions,
    _extract_references_from_text,
    _render_audit_for_generation,
    _authors_look_suspicious,
    _generate_fallback_paper,
    find_paper_start,
    _flow_like_paper,
    _dedupe_drafts,
)
from services.llm_service import MAX_INTERVIEW_QUESTIONS


# ── _split_document ───────────────────────────────────────────────────────────

def test_split_document_single_chunk_when_small():
    text = "\n".join(f"line {i}" for i in range(50))
    parts = _split_document(text, max_chunk=100000)
    assert len(parts) == 1
    assert parts[0] == text


def test_split_document_splits_large_texts():
    line = "x" * 200
    text = "\n".join([line] * 60)  # ~12k chars, chunk size 9000
    parts = _split_document(text, max_chunk=9000)
    assert len(parts) >= 2
    assert all(len(p) <= 9000 for p in parts)
    # No content lost, no content duplicated
    assert "".join(parts).replace("\n", "") == text.replace("\n", "")


def test_split_document_empty():
    assert _split_document("", max_chunk=9000) == []


# ── adaptive question budget ──────────────────────────────────────────────────

def test_adaptive_max_questions_boundaries():
    assert _adaptive_max_questions({"completeness_score": 90}) == 4
    assert _adaptive_max_questions({"completeness_score": 85}) == 4
    assert _adaptive_max_questions({"completeness_score": 84}) == 6
    assert _adaptive_max_questions({"completeness_score": 70}) == 6
    assert _adaptive_max_questions({"completeness_score": 69}) == 8
    assert _adaptive_max_questions({"completeness_score": 50}) == 8
    assert _adaptive_max_questions({"completeness_score": 49}) == 12
    assert _adaptive_max_questions({"completeness_score": 0}) == 12


def test_adaptive_max_questions_missing_score_defaults_eight():
    assert _adaptive_max_questions({}) == 8
    assert _adaptive_max_questions(None) == 8
    assert _adaptive_max_questions({"completeness_score": "bogus"}) == 8


def test_budget_never_exceeds_hard_cap():
    assert _adaptive_max_questions({"completeness_score": 0}) <= MAX_INTERVIEW_QUESTIONS


# ── author suspicion heuristics ───────────────────────────────────────────────

def test_authors_look_suspicious_cases():
    assert _authors_look_suspicious(["Author A", "Author B"])
    assert _authors_look_suspicious(["et al."])
    assert _authors_look_suspicious(["j.doe@uni.edu"])
    assert not _authors_look_suspicious(["Jane M. Smith", "Ahmed Patel"])


# ── reference extraction (fallback generator fidelity) ───────────────────────

def test_extract_references_from_text_picks_real_lines():
    doc = """
Some random body text that is not a reference at all.
[12] J. Doe, "A study," IEEE Trans. Comput., vol. 5, no. 2, pp. 10-20, 2020.
Smith, J., and Lee, K. (2019). Another paper about things. Journal of Things, 3(4), 5-9.
arXiv:2201.00123
Another ordinary sentence with no citation markers whatsoever.
"""
    refs = _extract_references_from_text(doc, limit=10)
    assert len(refs) == 3
    assert refs[0].startswith("J. Doe")
    assert "pp. 10-20" in refs[0]
    assert "Smith, J." in refs[1]
    assert "arXiv:2201.00123" in refs[2]


def test_extract_references_from_text_empty_when_none():
    doc = "Just a paragraph.\nAnother paragraph without citations anywhere."
    assert _extract_references_from_text(doc) == []
    assert _extract_references_from_text("") == []


def test_extract_references_deduplicates():
    doc = ("[1] Same. Reference. Text. Here\n" * 3) + ("[2] Different ref line here\n" * 2)
    refs = _extract_references_from_text(doc)
    assert len(refs) == 2


# ── audit block rendering ─────────────────────────────────────────────────────

def test_render_audit_for_generation_includes_findings():
    analysis = {
        "document_type": "technical report",
        "abstract_summary": "A summary.",
        "key_claims": [{"claim": "X improves latency", "evidence": "shown in table 2"}],
        "key_findings": [{"finding": "Latency dropped 40%", "evidence": "figure 3"}],
        "methodology": "benchmarking",
        "data_points": ["40%", "2.1x"],
        "terminology": ["GPU", "throughput"],
        "missing_sections": ["Methodology"],
        "completeness_score": 55,
    }
    out = _render_audit_for_generation(analysis)
    assert "X improves latency" in out
    assert "Latency dropped 40%" in out
    assert "Methodology" in out  # flagged as absent → must not be fabricated
    assert "55" in out


def test_render_audit_for_generation_empty_analysis():
    out = _render_audit_for_generation({})
    assert out == ""
    assert _render_audit_for_generation(None) == ""


# ── fallback paper fidelity ───────────────────────────────────────────────────

def test_fallback_paper_uses_document_and_omits_fake_results():
    file_text = (
        "# My Real Title\n\n"
        "This is a genuinely long first paragraph about the topic that the paper should reuse.\n"
        "Another long paragraph with meaningful content about implementation details.\n"
        "[1] A. Real, \"Real paper,\" Real Journal, vol. 9, no. 1, pp. 1-9, 2021.\n"
    )
    analysis = {
        "title": "My Real Title",
        "domain": "Technology",
        "keywords": ["systems"],
        "abstract_summary": "A faithful summary.",
        "key_findings": [{"finding": "The system works."}],
        "methodology": "A simple method.",
        "authors": [],
        "completeness_score": 60,
    }
    paper = "".join(_generate_fallback_paper(file_text, {}, analysis))

    assert "My Real Title" in paper
    assert "## Abstract" in paper
    assert "A faithful summary." in paper
    # Real content from the document is included as bullets
    assert "genuinely long first paragraph" in paper
    # Real reference surfaced from the document
    assert "A. Real" in paper and "Real Journal" in paper
    # No invented sections
    assert "## Results and Discussion" not in paper
    assert "## Literature Review" not in paper
    assert "## Methodology" in paper  # comes from the actual analysis value


def test_fallback_paper_omits_references_and_authors_when_absent():
    file_text = "Only a body of text with nothing looking like a citation anywhere at all."
    analysis = {"title": "", "keywords": [], "abstract_summary": ""}
    paper = "".join(_generate_fallback_paper(file_text, {}, analysis))
    assert "## References" not in paper
    assert "## About the Authors" not in paper
    assert "Research Paper" in paper  # default title


# ── output cleansing (chain-of-thought stripping) ────────────────────────────

_DRAFT = (
    "## Abstract\n"
    "CNNs detect lung nodules in CT scans.\n"
    "## Introduction\n"
    "Early screening improves outcomes.\n"
    "## Methods\n"
    "We trained on LUNA16 with 10,000 scans using 5-fold cross-validation.\n"
    "## Results\n"
    "Accuracy of 92 percent was achieved.\n"
    "## Conclusion\n"
    "CNNs improve diagnostic accuracy.\n"
)


def test_find_paper_start_prefers_last_marker():
    text = "thinking..." + "====PAPER_START====" + _DRAFT + "====PAPER_START====" + _DRAFT
    start = find_paper_start(text)
    assert "thinking" not in start
    assert start.count("## Abstract") == 1
    assert start.strip().startswith("## Abstract")


def test_find_paper_start_falls_back_to_first_headed_body():
    text = "someone introduced the paper.\n## Abstract\nwordy but substantial paragraph text\n" + "y" * 200 + "\n## Methods\nmore body here\n"
    start = find_paper_start(text)
    assert start.strip().startswith("## Abstract")
    assert "introduced" not in start


def test_find_paper_start_returns_whole_text_without_markers_or_headings():
    text = "just a plain blob with no structure at all"
    assert find_paper_start(text) == text


def test_find_paper_start_recognizes_resume_marker():
    text = "reasoning here\n====RESUME_START====\n## Summary\nA resume body that is substantial.\n" + ("x" * 200)
    start = find_paper_start(text)
    assert "reasoning" not in start
    assert start.strip().startswith("## Summary")


def test_flow_like_paper_strips_reasoning_and_duplicate_drafts():
    raw = "Sure! The user wants me to write a paper. Let me draft it a few times.\n"
    raw += "====PAPER_START====" + _DRAFT + "====PAPER_START====" + _DRAFT + "====PAPER_START====" + _DRAFT
    out = "".join(_flow_like_paper(raw[i:i + 7] for i in range(0, len(raw), 7)))
    assert "The user wants me" not in out
    assert out.count("## Abstract") == 1
    assert "10,000 scans" in out


def test_flow_like_paper_requires_some_content():
    out = "".join(_flow_like_paper(["", "  ", "\n"]))
    assert out == ""


def test_dedupe_drafts_keeps_first_when_identical_runs():
    two = _DRAFT + _DRAFT
    assert _dedupe_drafts(two).count("## Abstract") == 1


def test_dedupe_drafts_noop_for_short_or_unstructured():
    assert _dedupe_drafts("short") == "short"
    blob = "no headings here\njust plain paragraph content repeated twice\njust plain paragraph content repeated twice\n"
    assert _dedupe_drafts(blob) == blob