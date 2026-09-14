import httpx
import json
import re
from config import EXPERIENTIAL_API_KEY, EXPERIENTIAL_BASE_URL, LLM_MODEL

CONTENT_RULES = """Content Integrity Rules:
- Author affiliation must be the actual institution — never fabricate or leave a placeholder affiliation (e.g., do not write "Indian Institute of Technology" for a non-IIT student).
- Do not state quantitative results (latency numbers, satisfaction scores, benchmark data) unless they come from an actual measured test — otherwise phrase the section as "Proposed Architecture" / "System Design", not "Results."
- Every reference must correspond to a real, verifiable source. Do not invent arXiv IDs, conference proceedings, or blog URLs to fill a References list. If no real references are available, omit the References section entirely rather than inventing them.
- Single-author case: center the author block (use only the middle cell if the table has 3 columns, or a single centered cell — do not fabricate coauthors).
- Write in plain, direct academic English. Avoid jargon, buzzwords, and unnecessarily complex phrasing. Use active voice where possible.
- Prefer active voice over passive (e.g., "We trained the model" not "The model was trained").
- Use IEEE citation style: bracketed numbers [1], [2] in text, with full references in IEEE format.
- Do not invent numerical results, statistics, metrics, or data points not present in the source document."""

RESUME_CONTENT_RULE = """Content Integrity Rule:
- Do not fabricate job titles, companies, degrees, or dates. Only include information the user has provided."""

def call_llm(messages, temperature=0.7, max_tokens=4096, retries=3):
    headers = {"Content-Type": "application/json"}
    if EXPERIENTIAL_API_KEY and EXPERIENTIAL_API_KEY.strip():
        headers["Authorization"] = f"Bearer {EXPERIENTIAL_API_KEY.strip()}"
    last_err = None

    for attempt in range(retries):
        try:
            resp = httpx.post(
                f"{EXPERIENTIAL_BASE_URL}/chat/completions",
                headers=headers,
                json={
                    "model": LLM_MODEL,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
                timeout=120
            )
            resp.raise_for_status()
            msg = resp.json()["choices"][0]["message"]
            return msg.get("content") or msg.get("reasoning") or ""
        except Exception as e:
            last_err = e
            if attempt < retries - 1:
                import time
                time.sleep(1.0 * (attempt + 1))
    raise last_err or RuntimeError("call_llm failed")

def call_llm_json(messages, temperature=0.3, max_tokens=4096):
    text = call_llm(messages, temperature, max_tokens).strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0]
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        import re
        m = re.search(r'\{.*\}', text, re.DOTALL)
        if m:
            return json.loads(m.group())
        raise

# ─── Deep Document Audit (auditor-style analysis) ─────────────────────────────

AUDIT_SINGLE_PASS_LIMIT = 28000  # chars analyzed in one LLM call
AUDIT_CHUNK_SIZE = 9000          # chars per chunk for large documents

DEEP_AUDIT_PROMPT = """You are an expert document auditor. Read the FULL document below and produce a structured audit as JSON with EXACTLY these keys:

{
  "document_type": "one of: research paper, thesis, technical report, project proposal, lecture notes, technical notes, literature review, code repository, other",
  "title": "the title if clearly identifiable, else empty string",
  "abstract_summary": "1-3 sentence faithful summary of what the document is about",
  "present_sections": ["section headings found in the document"],
  "key_claims": [{"claim": "specific assertion the document makes", "evidence": "short verbatim quote supporting it"}],
  "key_findings": [{"finding": "concrete result or observation reported", "evidence": "short verbatim quote"}],
  "methodology": "what method/approach the document describes, or empty string if none",
  "data_points": ["specific numbers, statistics, or quantities actually stated"],
  "terminology": ["domain terms / acronyms used"],
  "uncertainties": [{"topic": "short label", "evidence": "quote showing the ambiguity", "question": "concrete question ONLY the author can answer"}],
  "needs_clarification": [{"topic": "...", "reason": "why it is needed", "question": "..."}],
  "authors": ["author names if present, else []"],
  "keywords": ["index terms"],
  "domain": "research domain",
  "has_abstract": true or false,
  "missing_sections": ["IEEE sections absent from the document"],
  "completeness_score": 0-100 integer measuring how complete the document is as a paper
}

RULES:
- NEVER invent content. Every claim, finding, and data point must exist in the document, with a short verbatim evidence quote.
- uncertainties: genuine ambiguities or under-specified details where ONLY the author can clarify. Max 6. Give each a concrete question.
- needs_clarification: essential details absent from the document. Max 6.
- If a field has nothing, use [] or "" — never fabricate.
- Return ONLY valid JSON.

DOCUMENT:
{DOCUMENT}"""

CHUNK_OBSERVATION_PROMPT = """You are an expert document auditor. Below is chunk {CHUNK} of {TOTAL} of a larger document. Extract raw observations as JSON:

{
  "notes": ["one-line summary of what this chunk covers"],
  "claims": [{"claim": "specific assertion made", "evidence": "short verbatim quote"}],
  "findings": [{"finding": "concrete result/observation", "evidence": "short verbatim quote"}],
  "data_points": ["specific numbers or statistics stated"],
  "terminology": ["domain terms / acronyms"],
  "uncertainties": [{"topic": "...", "evidence": "...", "question": "question only the author can answer"}]
}

RULES:
- NEVER invent; every item needs a short verbatim evidence quote.
- Max 8 claims, 6 findings, 8 data points, 10 terminology terms, 4 uncertainties.
- Return ONLY valid JSON.

CHUNK {CHUNK} / {TOTAL}:
{DOCUMENT}"""

SYNTHESIS_PROMPT = """You are an expert document auditor. Below is the start of a document and raw observations extracted from every part of it. Produce a final structured audit JSON with EXACTLY these keys:

{
  "document_type": "one of: research paper, thesis, technical report, project proposal, lecture notes, technical notes, literature review, code repository, other",
  "title": "title if identifiable else \"\"",
  "abstract_summary": "1-3 sentence faithful summary",
  "present_sections": ["..."],
  "key_claims": [{"claim": "...", "evidence": "..."}],
  "key_findings": [{"finding": "...", "evidence": "..."}],
  "methodology": "... or \"\"",
  "data_points": ["..."],
  "terminology": ["..."],
  "uncertainties": [{"topic": "...", "evidence": "...", "question": "..."}],
  "needs_clarification": [{"topic": "...", "reason": "...", "question": "..."}],
  "authors": ["..."],
  "keywords": ["..."],
  "domain": "...",
  "has_abstract": true or false,
  "missing_sections": ["..."],
  "completeness_score": 0-100
}

Deduplicate observations across chunks. Never invent content. Max 6 uncertainties and 6 needs_clarification. Return ONLY valid JSON.

DOCUMENT START:
{DOCUMENT}

RAW OBSERVATIONS:
{OBSERVATIONS}"""


def _split_document(file_text: str, max_chunk: int = AUDIT_CHUNK_SIZE) -> list:
    """Split a document into roughly page-sized chunks on line boundaries."""
    if not (file_text or "").strip():
        return []
    parts = []
    current = []
    current_len = 0
    for line in (file_text or "").split("\n"):
        line_len = len(line) + 1
        if current_len + line_len > max_chunk and current:
            parts.append("\n".join(current))
            current, current_len = [], 0
        current.append(line)
        current_len += line_len
    if current:
        parts.append("\n".join(current))
    return parts


def _deep_audit(file_text: str) -> dict:
    prompt = DEEP_AUDIT_PROMPT.replace("{DOCUMENT}", file_text[:AUDIT_SINGLE_PASS_LIMIT])
    return call_llm_json([
        {"role": "system", "content": f"You are a rigorous document auditor. You extract only what is actually present in the document.\n\n{CONTENT_RULES}"},
        {"role": "user", "content": prompt}
    ], temperature=0.2, max_tokens=6000)


def _audit_chunk(chunk: str, chunk_idx: int, total: int) -> dict:
    prompt = (CHUNK_OBSERVATION_PROMPT
              .replace("{CHUNK}", str(chunk_idx))
              .replace("{TOTAL}", str(total))
              .replace("{DOCUMENT}", chunk))
    return call_llm_json([
        {"role": "system", "content": "You extract raw observations from document chunks. Return only valid JSON."},
        {"role": "user", "content": prompt}
    ], temperature=0.2, max_tokens=4000)


def _synthesize_audit(file_text: str, observations: list, total_chunks: int) -> dict:
    obs_text = json.dumps(observations, ensure_ascii=False, indent=1)[:30000]
    prompt = (SYNTHESIS_PROMPT
              .replace("{DOCUMENT}", file_text[:20000])
              .replace("{OBSERVATIONS}", obs_text))
    return call_llm_json([
        {"role": "system", "content": f"You synthesize document audits from per-chunk observations. Return only valid JSON.\n\n{CONTENT_RULES}"},
        {"role": "user", "content": prompt}
    ], temperature=0.2, max_tokens=6000)


def _fallback_analysis(file_text: str) -> dict:
    """Heuristic audit used when the LLM path is unavailable."""
    lines = [l.strip() for l in (file_text or "").split("\n") if l.strip()]
    title = ""
    if lines:
        first = lines[0].lstrip("#").strip()
        if 5 <= len(first.split()) <= 30 and not any(c in first for c in ["@", "http", "www"]):
            title = first[:120]
    email_m = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', file_text or "")
    keywords = []
    domain = "Technology"
    if "machine learning" in (file_text or "").lower() or "deep learning" in (file_text or "").lower():
        keywords, domain = ["machine learning"], "Machine Learning"
    elif "software" in (file_text or "").lower():
        keywords, domain = ["software engineering"], "Software Engineering"
    return {
        "document_type": "other",
        "title": title,
        "abstract_summary": (lines[1][:300] if len(lines) > 1 else ""),
        "present_sections": [],
        "key_claims": [],
        "key_findings": [],
        "methodology": "",
        "data_points": [],
        "terminology": [],
        "uncertainties": [],
        "needs_clarification": [],
        "authors": [],
        "contact_email": email_m.group(0) if email_m else "",
        "keywords": keywords,
        "domain": domain,
        "has_abstract": False,
        "missing_sections": ["Abstract", "Introduction", "Conclusion"],
        "completeness_score": 20,
    }


def analyze_document(file_text: str) -> dict:
    """Audit the uploaded document: claims, findings, methodology, data,
    terminology, ambiguities, and an overall completeness score."""
    import time as _time
    file_text = file_text or ""
    if len(file_text) <= AUDIT_SINGLE_PASS_LIMIT:
        for _ in range(2):
            try:
                return _deep_audit(file_text)
            except Exception:
                _time.sleep(1.0)
    else:
        try:
            chunks = _split_document(file_text)
            observations = []
            for i, chunk in enumerate(chunks, 1):
                try:
                    obs = _audit_chunk(chunk, i, len(chunks))
                    if isinstance(obs, dict) and obs:
                        observations.append(obs)
                except Exception:
                    continue
            if observations:
                for _ in range(2):
                    try:
                        return _synthesize_audit(file_text[:20000], observations, len(chunks))
                    except Exception:
                        _time.sleep(1.0)
        except Exception:
            pass
    return _fallback_analysis(file_text)

MAX_INTERVIEW_QUESTIONS = 12

def _adaptive_max_questions(analysis) -> int:
    """Question budget shrinks as the document becomes more complete."""
    try:
        score = float((analysis or {}).get("completeness_score", 50))
    except (TypeError, ValueError):
        score = 50
    if score >= 85:
        return 4
    if score >= 70:
        return 6
    if score >= 50:
        return 8
    return 12


def _authors_look_suspicious(authors) -> bool:
    joined = " ".join(str(a) for a in authors).lower()
    if any(x in joined for x in ("@", "http", "et al", "unknown", "author a", "author b", "none")):
        return True
    return len(authors) > 6


def _ask_content_question(file_text: str, analysis: dict, answers: dict, questions_asked: list):
    """Ask the single most important document-grounded question the author can
    resolve. Returns a question dict, or None if nothing important remains."""
    uncertainties = analysis.get("uncertainties") or []
    clarifications = analysis.get("needs_clarification") or []
    claims = analysis.get("key_claims") or []
    if not (uncertainties or clarifications or claims):
        return None

    str_answers = {k: v for k, v in answers.items() if isinstance(k, str) and isinstance(v, str)}
    answers_text = "\n".join([f"Q: {q}\nA: {a}" for q, a in str_answers.items() if not q.startswith("_")]) if str_answers else "No answers yet."
    qa_text = "\n".join([f"- {q}" for q in questions_asked]) if questions_asked else "None"

    prompt = f"""You are auditing a document by interviewing its author. Your goal is accuracy: fill genuine gaps and verify claims that only the author can confirm.

DOCUMENT AUDIT:
- Uncertainties:
{json.dumps(uncertainties, ensure_ascii=False)[:3000]}
- Needs clarification:
{json.dumps(clarifications, ensure_ascii=False)[:3000]}
- Key claims found in the document:
{json.dumps([c.get('claim') if isinstance(c, dict) else str(c) for c in claims][:10], ensure_ascii=False)[:2000]}

INTERVIEW SO FAR:
{answers_text}

QUESTIONS ALREADY ASKED:
{qa_text}

DECISION: Pick the single most important unresolved point that ONLY the author can clarify — the one that would most improve the paper's accuracy if answered. Return exactly one of:

{{"ready": true}} — if everything essential is resolved or nothing important remains.

{{"ready": false, "question": "the question, in plain language, referencing the specific passage in the document", "context": "why this matters for the paper, citing the document", "options": [], "topic": "short label"}}

Rules:
- NEVER re-ask anything already asked.
- The question MUST be grounded in the document audit and reference the specific claim or passage.
- Ask ONE question at a time.
- If the document is already clear and accurate, return ready=true immediately."""
    try:
        r = call_llm_json([
            {"role": "system", "content": "You are a rigorous auditor interviewing an author to verify and complete their document. You return exactly one JSON decision per call."},
            {"role": "user", "content": f"Document excerpt:\n{file_text[:4000]}\n\n{prompt}"}
        ], temperature=0.3, max_tokens=1500)
    except Exception:
        return None

    if not isinstance(r, dict) or r.get("ready"):
        return None
    question = str(r.get("question") or "").strip()
    if len(question) < 8:
        return None
    return {
        "ready": False,
        "question": question,
        "options": r.get("options") or [],
        "context": r.get("context") or "",
        "type": "content",
        "topic": r.get("topic") or "",
    }


def generate_question(file_text: str, answers: dict, questions_asked: list, analysis: dict = None) -> dict:
    """Generate the next interview question. Bibliographic essentials are only
    asked when the document genuinely lacks them; the rest of the interview is
    driven by the auditor's list of document-grounded uncertainties."""
    analysis = analysis or {}
    str_answers = {k: v for k, v in answers.items() if isinstance(k, str) and isinstance(v, str)}
    answers_text = "\n".join([f"Q: {q}\nA: {a}" for q, a in str_answers.items() if not q.startswith("_")]) if str_answers else "No answers yet."
    qa_text = "\n".join([f"- {q}" for q in questions_asked]) if questions_asked else "None"

    max_q = _adaptive_max_questions(analysis)
    if len(questions_asked) >= max_q:
        return {"ready": True}

    title_val = str(analysis.get("title") or "").strip()
    authors_val = analysis.get("authors") or []
    if isinstance(authors_val, str):
        authors_val = [a.strip() for a in authors_val.replace(";", ",").split(",") if a.strip()]
    keywords_val = analysis.get("keywords") or []
    if isinstance(keywords_val, str):
        keywords_val = [k.strip() for k in keywords_val.split(",") if k.strip()]

    # 1. HARD GATE — title, only when the document has no usable title
    if answers.get("_need_typed_title"):
        return {
            "ready": False,
            "question": "Please type the correct paper title.",
            "options": [],
            "context": "The title at the top of the paper.",
            "type": "title_correct"
        }
    if (not title_val or title_val.lower() in ("unknown", "untitled", "document") or len(title_val) < 8) and not answers.get("_title_ok"):
        return {
            "ready": False,
            "question": "I couldn't find a clear title in your document. What should the paper be titled?",
            "options": ["Use the document's first line as the title", "I'll type the title"],
            "context": "A title is required for the paper.",
            "type": "title"
        }

    # 2. HARD GATE — authors, only when the document has none (or the scan is dubious)
    placeholder_authors = (not authors_val) or _authors_look_suspicious(authors_val)
    if placeholder_authors:
        if not any("author" in q.lower() for q in questions_asked):
            return {
                "ready": False,
                "question": "Your document doesn't list clear author names. Who should appear on the byline? (Separate multiple authors with semicolons.)",
                "options": [],
                "context": "Author names are needed for the IEEE byline.",
                "type": "authors"
            }
    elif not answers.get("_authors_ok") and _authors_look_suspicious(authors_val):
        names_str = "; ".join(authors_val)
        return {
            "ready": False,
            "question": f"I extracted these author name(s): {names_str}. Are they correct?",
            "options": ["Yes, correct", "No, let me type the correct names"],
            "context": "Confirming author names.",
            "type": "authors_confirm"
        }

    # 3. DYNAMIC — document-grounded audit questions (the heart of the auditor)
    content_q = _ask_content_question(file_text, analysis, answers, questions_asked)
    if content_q is not None:
        return content_q

    # 4. SOFT GATES — bibliographic extras, asked only after content is resolved
    if authors_val and not answers.get("_affiliation_ok") and not str(analysis.get("affiliation") or "").strip():
        return {
            "ready": False,
            "question": "What is the institutional affiliation (university, lab, or company) for the author(s)?",
            "options": [],
            "context": "Affiliation appears below each author name.",
            "type": "affiliation"
        }

    if authors_val and not answers.get("_email_ok") and not str(analysis.get("contact_email") or "").strip():
        return {
            "ready": False,
            "question": "And a contact email for the corresponding author, so readers can reach you?",
            "options": ["Skip — no email"],
            "context": "Email appears in the IEEE author block.",
            "type": "email"
        }

    if not keywords_val and not answers.get("_keywords_ok"):
        domain_hint = analysis.get("domain", "your topic area")
        return {
            "ready": False,
            "question": f"Lastly, what keywords should I index this paper under? (Comma-separated, e.g. {domain_hint}, machine learning, robotics)",
            "options": [],
            "context": "Index Terms help readers find the paper.",
            "type": "keywords"
        }

    return {"ready": True}

def edit_paper(paper_text: str, instruction: str, current_title: str = "") -> str:
    prompt = f"""You are editing an IEEE-format research paper based on the user's instruction.

CURRENT TITLE: {current_title or "(unknown)"}

CURRENT PAPER:
{paper_text}

INSTRUCTION: {instruction}

Rewrite the COMPLETE paper applying the instruction. Strictly preserve the existing ##-prefixed section structure of the CURRENT PAPER — only include the sections that are already present, in their current order. Do NOT invent or add new sections (such as Literature Review, Methodology, Results, Limitations, or About the Authors) unless the instruction explicitly asks for them. Preserve all unchanged content verbatim. Do NOT invent numerical results, statistics, or metrics not already present.
If the instruction changes the paper title, output the new title as the VERY FIRST LINE in the exact format: # New Title
Otherwise, do not include any top-level title line.
Never include reasoning, chain-of-thought, or commentary — output only the revised paper.
Begin your ENTIRE final answer with the exact single line:
{_PAPER_MARKER}
Then, on the following line, the revised paper itself. Nothing else before that marker line."""
    messages = [
        {"role": "system", "content": f"You edit IEEE-format research papers using only ##-prefixed section headings. Output only the paper, never reasoning or commentary. Never add sections that aren't in the current paper.\n\n{CONTENT_RULES}"},
        {"role": "user", "content": prompt}
    ]
    text = call_llm(messages, temperature=0.4, max_tokens=16384)
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0]
    text = find_paper_start(text)
    return text.strip()

def _render_audit_for_generation(analysis: dict) -> str:
    """Render the auditor's findings into a compact, grounding-usable block."""
    analysis = analysis or {}
    parts = []

    def add(label, val):
        if val:
            parts.append(f"{label}: {val}")

    add("Document type", analysis.get("document_type"))
    add("Abstract summary", analysis.get("abstract_summary"))

    claims = analysis.get("key_claims") or []
    if claims:
        parts.append("Key claims (with verbatim evidence quotes from the source):")
        for i, c in enumerate(claims, 1):
            claim = c.get("claim") if isinstance(c, dict) else str(c)
            evidence = c.get("evidence") if isinstance(c, dict) else ""
            parts.append(f"  {i}. {claim}" + (f' — evidence: "{evidence}"' if evidence else ""))

    findings = analysis.get("key_findings") or []
    if findings:
        parts.append("Key findings reported in the document:")
        for i, f_ in enumerate(findings, 1):
            finding = f_.get("finding") if isinstance(f_, dict) else str(f_)
            evidence = f_.get("evidence") if isinstance(f_, dict) else ""
            parts.append(f"  {i}. {finding}" + (f' — evidence: "{evidence}"' if evidence else ""))

    add("Methodology described in the document", analysis.get("methodology"))

    data_points = analysis.get("data_points") or []
    if data_points:
        parts.append("Data points stated in the document: " + ", ".join(str(d) for d in data_points))

    terminology = analysis.get("terminology") or []
    if terminology:
        parts.append("Terminology used in the document: " + ", ".join(str(t) for t in terminology))

    missing = analysis.get("missing_sections") or []
    if missing:
        parts.append("Sections ABSENT from the document (do NOT fabricate them): " + ", ".join(str(m) for m in missing))

    add("Completeness score", analysis.get("completeness_score"))
    return "\n".join(parts)


_PAPER_MARKER = "====PAPER_START===="
_RESUME_MARKER = "====RESUME_START===="
_OUTPUT_MARKERS = (_PAPER_MARKER, _RESUME_MARKER)


def find_paper_start(text: str) -> str:
    """Return the sub-string of `text` that is real output (paper/report/resume).
    Prefers the LAST explicit output marker (free models may echo the marker and
    draft the paper several times inside their chain-of-thought; the final marker
    precedes the actual deliverable). Falls back to the first heading line that is
    followed by a substantial body paragraph (>=150 chars before the next heading)."""
    import re as _re
    for marker in _OUTPUT_MARKERS:
        idx = text.rfind(marker)
        if idx != -1:
            return text[idx + len(marker):].lstrip("\n\r")
    _h = lambda s: bool(_re.match(r'^(#{1,3})[ \t]+\S', s.strip())) and len(s.strip()) > 2
    lines = text.split("\n")
    for i, line in enumerate(lines):
        if not _h(line):
            continue
        body = []
        for j in range(i + 1, len(lines)):
            if _h(lines[j]):
                break
            body.append(lines[j])
        if len("".join(body).strip()) >= 150:
            return "\n".join(lines[i:])
    return text


def _dedupe_drafts(text: str) -> str:
    """Collapse repeated paper drafts. Free-tier models sometimes emit the paper
    several times (identical section blocks) inside one response; keep only the
    first full run. Operates on heading-structured text and is a no-op otherwise."""
    if not text or "\n" not in text:
        return text
    import re as _re
    heading_re = _re.compile(r'^\s*#{1,3}[ \t]+\S')
    lines = text.split("\n")
    idx = [i for i, l in enumerate(lines) if heading_re.match(l)]

    def nxt(j: int) -> int:
        return idx[j + 1] if j + 1 < len(idx) else len(lines)

    def sig(j: int) -> str:
        return _re.sub(r"\s+", " ", " ".join(lines[idx[j]:nxt(j)])).strip()

    if len(idx) < 4:
        return text
    sigs = [sig(j) for j in range(len(idx))]
    for length in range(len(idx) // 2, 3, -1):
        for start in range(0, len(idx) - 2 * length + 1):
            if sigs[start:start + length] == sigs[start + length:start + 2 * length]:
                cut = idx[start + length]
                return "\n".join(lines[:cut]).strip()
    return text


def _flow_like_paper(tokens):
    """Buffer the entire stream and emit only the final deliverable. This keeps
    chain-of-thought out of the preview: nothing is yielded until the response
    finishes, then the text is sliced at the LAST output marker (free models echo
    the marker and draft the paper repeatedly inside their thinking), duplicate
    draft blocks are collapsed, and the clean remainder is emitted in chunks."""
    buf = []
    for token in tokens:
        buf.append(token)
    text = "".join(buf)
    start = find_paper_start(text)
    if not start.strip():
        return
    cleaned = _dedupe_drafts(start)
    if cleaned.strip():
        start = cleaned
    for i in range(0, len(start), 1200):
        yield start[i:i + 1200]


def _extract_references_from_text(file_text: str, limit: int = 10) -> list:
    """Pull real, reference-looking lines out of the source document (or none)."""
    refs = []
    seen = set()
    for s in (file_text or "").split("\n"):
        s = s.strip()
        if not s:
            continue
        low = s.lower()
        looks_like_ref = (
            re.search(r'\[\d+\]', s)
            or "et al." in low
            or re.search(r'\b(pp\.|vol\.|doi:?|arxiv:|isbn\s)', low)
            or "conference proceedings" in low
            or "ieee trans" in low
            or re.search(r'\(\d{4}\)\.\s*[A-Z]', s)  # author-year citation
        )
        if looks_like_ref:
            clean = re.sub(r'^\[\d+\]\s*', '', s).strip()
            short_identifier = bool(re.match(r'^\s*(arxiv:?|doi:?|isbn\s*[\d\-xX])', clean, re.IGNORECASE))
            if (20 < len(clean) < 400) or (short_identifier and len(clean) >= 8):
                key = clean[:60].lower()
                if key not in seen:
                    seen.add(key)
                    refs.append(clean)
    return refs[:limit]


def generate_paper_stream(file_text: str, answers: dict, analysis: dict, images_info: str = ""):
    answers_text = "\n".join([f"Q: {q}\nA: {a}" for q, a in answers.items()]) if answers else ""

    title = (analysis or {}).get("title", "Research Paper")
    domain = (analysis or {}).get("domain", "")
    keywords = (analysis or {}).get("keywords") or []
    if isinstance(keywords, str):
        keywords = [k.strip() for k in keywords.split(",") if k.strip()]

    domain_instruction = f" The paper should focus on {domain}." if domain else ""
    kw_instruction = f" Key topics: {', '.join(keywords)}." if keywords else ""
    audit_text = _render_audit_for_generation(analysis)

    prompt = f"""Write a complete IEEE-format research paper that is a faithful, accurate transformation of the uploaded document and the author's interview answers.

TITLE: {title}{domain_instruction}{kw_instruction}

=== DOCUMENT AUDIT (verified against the source) ===
{audit_text}

=== SOURCE DOCUMENT (excerpt) ===
{file_text[:16000]}

=== AUTHOR INTERVIEW TRANSCRIPT ===
{answers_text or "No interview answers provided."}

{images_info}

STRICT ACCURACY RULES:
1. GROUNDING: Every paragraph must be traceable to the source document or the interview answers. Do NOT introduce new facts, names, numbers, statistics, research results, or claims anywhere.
2. When a statement comes from the document, phrase it faithfully (e.g., "the document describes ...", "the author reports ...", "this work presents ...").
3. SECTIONS: Build sections from what the document actually contains. Do NOT include a section the document does not support. If there is no methodology, no results, or no experiments in the source, do NOT create "Methodology" or "Results and Discussion" sections — use "Overview", "Background", "Discussion", "Conclusion" as appropriate. A suggested skeleton is: ## Abstract, ## Introduction, then document-driven sections, ## Conclusion.
4. REFERENCES: Cite ONLY references that appear in the source document or the interview. If the source has none, OMIT the References section entirely. Never invent DOIs, volumes, pages, years, or author names.
5. DATA: Use only the data points listed in the audit or present in the source excerpt. If no quantitative results exist, do not fabricate any numbers.
6. ABOUT THE AUTHORS: Include this section ONLY if the interview answers provide author names and bios. Otherwise omit it.
7. You may include one markdown table (using | separators) ONLY if the document provides tabular data, with a "Table 1. ..." caption line above it.
8. YOU MAY include images using markdown syntax: ![Figure caption](img_filename). Place them in the relevant body section. The system renders them as embedded figures.
9. Never include reasoning, chain-of-thought, thinking blocks, or meta-commentary. Output only the paper content.
10. Begin your ENTIRE final answer with the exact single line:
====PAPER_START====
Then, on the following line, the paper itself. Nothing else before that marker line."""
    messages = [
        {"role": "system", "content": f"You are an IEEE paper ghostwriter that transforms the user's own uploaded document into an IEEE-format paper with strict fidelity to the source. You never fabricate facts, references, or results. You use only ##-prefixed section headings.\n\n{CONTENT_RULES}"},
        {"role": "user", "content": prompt}
    ]
    try:
        headers = {"Content-Type": "application/json"}
        if EXPERIENTIAL_API_KEY and EXPERIENTIAL_API_KEY.strip():
            headers["Authorization"] = f"Bearer {EXPERIENTIAL_API_KEY.strip()}"

        def _raw_paper_stream():
            reasoning_fallback = []
            saw_content = False
            try:
                with httpx.Client(timeout=300) as client:
                    with client.stream(
                        "POST",
                        f"{EXPERIENTIAL_BASE_URL}/chat/completions",
                        headers=headers,
                        json={
                            "model": LLM_MODEL,
                            "messages": messages,
                            "temperature": 0.5,
                            "max_tokens": 4096,
                            "stream": True,
                        },
                    ) as resp:
                        resp.raise_for_status()
                        for line in resp.iter_lines():
                            if not line or not line.startswith("data: "):
                                continue
                            payload = line[6:].strip()
                            if payload == "[DONE]":
                                break
                            try:
                                chunk = json.loads(payload)
                                choices = chunk.get("choices")
                                if not choices:
                                    continue
                                delta = choices[0].get("delta", {})
                                content = delta.get("content", "")
                                reasoning = delta.get("reasoning", "")
                                if content:
                                    saw_content = True
                                    yield content
                                elif reasoning:
                                    reasoning_fallback.append(reasoning)
                            except (json.JSONDecodeError, IndexError, KeyError):
                                continue
            except Exception:
                pass
            if not saw_content and reasoning_fallback:
                for token in "".join(reasoning_fallback).split("\n"):
                    if token.strip():
                        yield token + "\n"

        streamed_any = False
        for token in _flow_like_paper(_raw_paper_stream()):
            streamed_any = True
            yield token
        if not streamed_any:
            text = call_llm(messages, temperature=0.5, max_tokens=4096)
            if text.startswith("```"):
                text = text.split("\n", 1)[-1].rsplit("```", 1)[0]
            for chunk in [text[i:i+80] for i in range(0, len(text), 80)]:
                yield chunk
                import time
                time.sleep(0.01)
            streamed_any = True
        if not streamed_any:
            raise RuntimeError("LLM output empty")
    except Exception:
        for token in _generate_fallback_paper(file_text, answers, analysis):
            yield token

def _generate_fallback_paper(file_text: str, answers: dict, analysis: dict):
    """Document-faithful fallback paper. Uses the auditor's findings and real
    lines from the document; manufactures no results, sections, or references."""
    analysis = analysis or {}
    title = str(analysis.get("title") or "").strip() or "Research Paper"

    authors = analysis.get("authors") or []
    if isinstance(authors, str):
        authors = [a.strip() for a in authors.replace(";", ",").split(",") if a.strip()]
    affiliation = str(analysis.get("affiliation") or "").strip()
    email = str(analysis.get("contact_email") or "").strip()
    keywords = analysis.get("keywords") or []
    if isinstance(keywords, str):
        keywords = [k.strip() for k in keywords.split(",") if k.strip()]
    kw_str = ", ".join(keywords) if keywords else "the topic described in the document"

    doc_lines = [l.strip() for l in (file_text or "").split("\n") if l.strip()]
    content_lines = [
        l for l in doc_lines
        if 40 <= len(l) <= 400
        and not re.match(r'^(\[\d+\]?\.?\s*)$', l)
    ]
    points = content_lines[:15] or doc_lines[:15]

    abstract = str(analysis.get("abstract_summary") or "").strip()
    if not abstract and doc_lines:
        abstract = doc_lines[0][:400]
    if not abstract:
        abstract = f"This paper provides an overview of {kw_str} based on the uploaded document."

    findings = analysis.get("key_findings") or []
    claims = analysis.get("key_claims") or []

    sections = []

    intro_bullets = []
    for c in claims[:5]:
        if isinstance(c, dict) and c.get("claim"):
            intro_bullets.append(f"- {c['claim']}")
    if analysis.get("methodology"):
        intro_bullets.append(f"- Methodology described in the document: {analysis['methodology']}")
    if not intro_bullets:
        intro_bullets = [f"- {p}" for p in points[:6]]

    sections.append((
        "## Introduction",
        f"This paper presents the content of the uploaded document in a structured form. "
        f"The document focuses on {kw_str}.\n\n" + "\n".join(intro_bullets)
    ))

    if points:
        sections.append(("## Key Points from the Document", "\n".join(f"- {p}" for p in points)))

    if findings:
        f_lines = []
        for f_ in findings[:6]:
            if isinstance(f_, dict) and f_.get("finding"):
                f_lines.append(f"- {f_['finding']}")
            elif isinstance(f_, str):
                f_lines.append(f"- {f_}")
        if f_lines:
            sections.append(("## Key Findings", "\n".join(f_lines)))

    methodology = str(analysis.get("methodology") or "").strip()
    if methodology:
        sections.append(("## Methodology", methodology))

    sections.append((
        "## Conclusion",
        f"This paper synthesized the material contained in the uploaded document on {kw_str}. "
        "The key concepts and findings presented provide a foundation for further work and discussion."
    ))

    refs = _extract_references_from_text(file_text)
    if refs:
        sections.append(("## References", "\n".join(f"[{i}] {r}" for i, r in enumerate(refs, 1))))

    paper = [f"# {title}", "", "## Abstract", abstract, ""]
    for sec_title, sec_body in sections:
        paper.append(sec_title)
        paper.append(sec_body)
        paper.append("")

    if authors:
        paper.append("## About the Authors")
        names = "; ".join(authors)
        affil_part = f"{affiliation}" if affiliation else "an institutional affiliation not stated in the interview"
        email_part = f" Email: {email}." if email else ""
        paper.append(f"**{names}** is with {affil_part}.{email_part}")
        paper.append("")

    text = "\n".join(paper)
    for chunk in [text[i:i+100] for i in range(0, len(text), 100)]:
        yield chunk
        import time
        time.sleep(0.02)


def _generate_fallback_resume(file_text: str, answers: dict, analysis: dict):
    analysis = analysis or {}
    name = analysis.get("name") or "Your Name"
    email = analysis.get("email") or ""
    phone = analysis.get("phone") or ""
    education = analysis.get("education") or []
    experience = analysis.get("experience") or []
    skills = analysis.get("skills") or []
    summary = analysis.get("summary") or ""
    projects = analysis.get("projects") or []
    certifications = analysis.get("certifications") or []

    contact_parts = [p for p in [email, phone] if p]
    contact_line = " | ".join(contact_parts)

    lines = [f"# {name}"]
    if contact_line:
        lines.append(contact_line)
    lines.extend(["", "## Summary", summary or "Dedicated and experienced professional with a strong track record of success."])

    if education:
        lines.append("")
        lines.append("## Education")
        for e in education:
            lines.append(f"- **{e}**" if not str(e).startswith("**") else f"- {e}")
    if experience:
        lines.append("")
        lines.append("## Experience")
        for e in experience:
            if "—" in str(e) or "-" in str(e):
                lines.append(f"### {e}")
            else:
                lines.append(f"- {e}")
    if skills:
        lines.append("")
        lines.append("## Skills")
        for s in skills:
            lines.append(f"- {s}")
    if projects:
        lines.append("")
        lines.append("## Projects")
        for p in projects:
            lines.append(f"- **{p}**" if not str(p).startswith("**") else f"- {p}")
    if certifications:
        lines.append("")
        lines.append("## Certifications")
        for c in certifications:
            lines.append(f"- {c}")

    text = "\n".join(lines)
    for chunk in [text[i:i+100] for i in range(0, len(text), 100)]:
        yield chunk
        import time
        time.sleep(0.02)


def _extract_resume_metadata_heuristic(file_text: str) -> dict:
    import re
    res = {
        "name": "",
        "email": "",
        "phone": "",
        "education": [],
        "experience": [],
        "skills": [],
        "summary": "",
        "projects": [],
        "certifications": []
    }
    lines = [l.strip() for l in file_text.split("\n") if l.strip()]
    if lines:
        first = lines[0].lstrip("#").strip()
        if len(first.split()) <= 4 and not any(c in first for c in ["@", "http", ".com"]):
            res["name"] = first

    em = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', file_text)
    if em:
        res["email"] = em.group(0)

    ph = re.search(r'[\+]?[\d\-\(\)\s]{7,}', file_text)
    if ph and sum(c.isdigit() for c in ph.group(0)) >= 7:
        res["phone"] = ph.group(0).strip()

    return res


def analyze_document_for_resume(file_text: str) -> dict:
    """Extract resume-relevant info from a document."""
    prompt = f"""Read this document and extract resume/CV information as JSON:
{{
  "name": "full name or empty string",
  "email": "email or empty string",
  "phone": "phone or empty string",
  "education": ["Degree — School, Year"],
  "experience": ["Role — Company, Dates — brief description"],
  "skills": ["skill1", "skill2"],
  "summary": "brief professional summary or empty string",
  "projects": ["Project name — brief description"],
  "certifications": ["cert1"]
}}

If a field is not found, use an empty string or empty array. Do not invent information.

Document content:
{file_text[:15000]}"""
    try:
        return call_llm_json([
            {"role": "system", "content": "You extract resume metadata from documents. Return only valid JSON."},
            {"role": "user", "content": prompt}
        ])
    except Exception:
        return _extract_resume_metadata_heuristic(file_text)


def generate_resume_question(file_text: str, answers: dict, questions_asked: list, analysis: dict = None) -> dict:
    """Generate the next resume-specific interview question."""
    analysis = analysis or {}
    str_answers = {k: v for k, v in answers.items() if isinstance(k, str) and isinstance(v, str)}
    answers_text = "\n".join([f"Q: {q}\nA: {a}" for q, a in str_answers.items() if not q.startswith("_")]) if str_answers else "No answers yet."
    qa_text = "\n".join([f"- {q}" for q in questions_asked]) if questions_asked else "None"

    if len(questions_asked) >= MAX_INTERVIEW_QUESTIONS:
        return {"ready": True}

    # Check what we already have from the document or user
    has_name = bool(analysis.get("name"))
    has_email = bool(analysis.get("email"))
    has_phone = bool(analysis.get("phone"))
    has_education = bool(analysis.get("education"))
    has_experience = bool(analysis.get("experience"))
    has_skills = bool(analysis.get("skills"))
    has_summary = bool(analysis.get("summary"))

    # Structured gates first (like IEEE does for title/authors)
    if has_name and not answers.get("_name_ok"):
        return {
            "ready": False,
            "question": f"I found the name \"{analysis['name']}\" in your document. Is that correct?",
            "options": ["Yes, that's correct", "No, I'll type my name"],
            "context": "Confirming your full name.",
            "type": "name_confirm"
        }

    if not has_name and not answers.get("_name_ok"):
        return {
            "ready": False,
            "question": "What is your full name?",
            "options": [],
            "context": "Your name for the resume header.",
            "type": "name"
        }

    if has_email and not answers.get("_email_ok"):
        return {
            "ready": False,
            "question": f"I found the email \"{analysis['email']}\". Is that your contact email?",
            "options": ["Yes, that's correct", "No, I'll type a different email"],
            "context": "Contact email for the resume.",
            "type": "email_confirm"
        }

    if not has_email and not answers.get("_email_ok"):
        return {
            "ready": False,
            "question": "What is your email address for the resume?",
            "options": [],
            "context": "Contact email.",
            "type": "email"
        }

    if not has_phone and not answers.get("_phone_ok"):
        return {
            "ready": False,
            "question": "What is your phone number?",
            "options": [],
            "context": "Phone number for the resume header.",
            "type": "phone"
        }

    # Let the LLM handle the rest (education, experience, skills, summary gaps)
    user_said_no_more = any(
        isinstance(a, str) and a.strip().lower().startswith("no") and any(w in q.lower() for w in ("more", "additional", "details"))
        for q, a in answers.items()
    )

    found = []
    if has_education: found.append("education")
    if has_experience: found.append("work experience")
    if has_skills: found.append("skills")
    if has_summary: found.append("a professional summary")
    found_str = ", ".join(found) if found else "very little structured content"

    prompt = f"""You are helping build a professional resume from an uploaded document.

What was found in the document: {found_str}.
Name: {analysis.get('name', 'not provided')}.
Email: {analysis.get('email', 'not provided')}.
Phone: {analysis.get('phone', 'not provided')}.
Education: {analysis.get('education', [])}
Experience: {analysis.get('experience', [])}
Skills: {analysis.get('skills', [])}

Previous answers from the user:
{answers_text}

Questions already asked: {qa_text}

Your job: decide if you have enough to write a complete resume. You MUST return ready=true unless a critical section (education or experience) is completely empty and the user has no more data to provide.

{'The user has indicated they have no more data. Set ready=true and write the resume from what is available.' if user_said_no_more else ''}

Rules:
- Return ready=true if you have ANY content from the document. The AI can format and expand it.
- ONLY ask a question if the document has basically no resume-relevant content at all.
- Do NOT re-ask for name, email, or phone — those are already collected.

If leaving a gap: {{"ready": false, "question": "...", "options": [], "context": "why needed"}}"""
    try:
        return call_llm_json([
            {"role": "system", "content": "You help build resumes. You ALWAYS return ready=true unless the document has essentially no resume content. Be decisive."},
            {"role": "user", "content": f"Document: {file_text[:5000]}\n\n{prompt}"}
        ])
    except Exception:
        return {"ready": True}


def generate_resume_stream(file_text: str, answers: dict, analysis: dict):
    """Stream a complete resume as markdown, section by section."""
    answers_text = "\n".join([f"Q: {q}\nA: {a}" for q, a in answers.items() if not q.startswith("_")]) if answers else ""

    name = analysis.get("name", "Your Name")
    email = analysis.get("email", "")
    phone = analysis.get("phone", "")
    education = analysis.get("education", [])
    experience = analysis.get("experience", [])
    skills = analysis.get("skills", [])
    summary = analysis.get("summary", "")

    prompt = f"""Write a professional resume in clean markdown format.

Contact Info:
- Name: {name}
- Email: {email}
- Phone: {phone}

Format instructions:
1. Start with `# {name}` at the very top as the main heading.
2. On the next line, list contact details separated by |: `{email} | {phone}`
3. Use these ##-prefixed sections in order:
- ## Summary
- ## Education
- ## Experience
- ## Skills
- ## Projects
- ## Certifications

Rules:
- Start with ## Summary (2-3 sentence professional summary based on the document).
- For ## Education, list each entry as: - **Degree** — School, Year with GPA if available.
- For ## Experience, use ### sub-headings: ### Role | Company | Location | Dates then bullet points for achievements. Always use the | separator format.
- For ## Skills, group by category (Languages, Frameworks, Tools, etc.) as bullet points. Eg: "- Languages: Python, Java, C++"
- For ## Projects, use format: - **Project Name** | Tech: ... then bullet points.
- For ## Certifications, simple bullet list.
- Only include sections that have content. Skip empty sections.
- Never invent specific numbers, metrics, or achievements not mentioned in the source document.
- Never include reasoning or commentary — output only the resume content.
- Begin your ENTIRE final answer with the exact single line:
====RESUME_START====
Then, on the following line, the resume itself. Nothing else before that marker line.

Document context: {file_text[:12000]}

Additional details from user: {answers_text}"""
    messages = [
        {"role": "system", "content": "You write professional resumes in clean markdown. Use only ##-prefixed section headings. Output only the resume, never commentary."},
        {"role": "user", "content": prompt}
    ]
    try:
        headers = {"Content-Type": "application/json"}
        if EXPERIENTIAL_API_KEY and EXPERIENTIAL_API_KEY.strip():
            headers["Authorization"] = f"Bearer {EXPERIENTIAL_API_KEY.strip()}"

        def _raw_resume_stream():
            reasoning_fallback = []
            saw_content = False
            try:
                with httpx.Client(timeout=300) as client:
                    with client.stream(
                        "POST",
                        f"{EXPERIENTIAL_BASE_URL}/chat/completions",
                        headers=headers,
                        json={
                            "model": LLM_MODEL,
                            "messages": messages,
                            "temperature": 0.5,
                            "max_tokens": 4096,
                            "stream": True,
                        },
                    ) as resp:
                        resp.raise_for_status()
                        for line in resp.iter_lines():
                            if not line or not line.startswith("data: "):
                                continue
                            payload = line[6:].strip()
                            if payload == "[DONE]":
                                break
                            try:
                                chunk = json.loads(payload)
                                choices = chunk.get("choices")
                                if not choices:
                                    continue
                                delta = choices[0].get("delta", {})
                                content = delta.get("content", "")
                                reasoning = delta.get("reasoning", "")
                                if content:
                                    saw_content = True
                                    yield content
                                elif reasoning:
                                    reasoning_fallback.append(reasoning)
                            except (json.JSONDecodeError, IndexError, KeyError):
                                continue
            except Exception:
                pass
            if not saw_content and reasoning_fallback:
                for token in "".join(reasoning_fallback).split("\n"):
                    if token.strip():
                        yield token + "\n"

        streamed_any = False
        for token in _flow_like_paper(_raw_resume_stream()):
            streamed_any = True
            yield token
        if not streamed_any:
            text = call_llm(messages, temperature=0.5, max_tokens=4096)
            if text.startswith("```"):
                text = text.split("\n", 1)[-1].rsplit("```", 1)[0]
            for chunk in [text[i:i+80] for i in range(0, len(text), 80)]:
                yield chunk
                import time
                time.sleep(0.01)
            streamed_any = True
        if not streamed_any:
            raise RuntimeError("LLM output empty")
    except Exception:
        for token in _generate_fallback_resume(file_text, answers, analysis):
            yield token


def edit_resume(resume_text: str, instruction: str) -> str:
    """Edit a resume based on user instruction."""
    prompt = f"""You are editing a professional resume based on the user's instruction.

CURRENT RESUME:
{resume_text}

INSTRUCTION: {instruction}

Rewrite the COMPLETE resume applying the instruction. Strictly preserve the existing ##-prefixed section structure — only include sections that are already present, in their current order. Do NOT invent or add new sections unless the instruction explicitly asks for them. Preserve all unchanged content verbatim. Do NOT invent specific numbers, metrics, or achievements not already present.
Never include reasoning, chain-of-thought, or commentary — output only the revised resume.
Begin your ENTIRE final answer with the exact single line:
{_RESUME_MARKER}
Then, on the following line, the revised resume itself. Nothing else before that marker line."""
    messages = [
        {"role": "system", "content": "You edit professional resumes using only ##-prefixed section headings. Output only the resume, never reasoning or commentary."},
        {"role": "user", "content": prompt}
    ]
    try:
        text = call_llm(messages, temperature=0.4, max_tokens=16384)
        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0]
        text = find_paper_start(text)
        return text.strip()
    except Exception:
        return resume_text
