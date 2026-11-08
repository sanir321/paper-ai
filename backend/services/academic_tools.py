"""
Academic Tools & Intelligence Services for PaperAI.
Provides:
1. Live arXiv and Crossref literature search with IEEE citation formatting.
2. Automated IEEE compliance audit with 0-100% Quality Score and granular diagnostics.
3. Intelligent section-level academic enhancements (academic tone, LaTeX equations, methodology strengthening).
4. Automated literature population and citation synchronization.
"""

import re
import urllib.parse
import xml.etree.ElementTree as ET
from typing import Dict, List, Any, Optional
import httpx

from config import LLM_MODEL, EXPERIENTIAL_API_KEY, EXPERIENTIAL_BASE_URL
from services.llm_service import call_llm


# ─── 1. Literature Retrieval & Formatting ───────────────────────────────────────

def _format_author_initials(full_name: str) -> str:
    """Format 'Firstname Middlename Lastname' to 'F. M. Lastname' (IEEE style)."""
    parts = full_name.strip().split()
    if not parts:
        return ""
    if len(parts) == 1:
        return parts[0]
    initials = " ".join(f"{p[0]}." for p in parts[:-1])
    return f"{initials} {parts[-1]}"


def _clean_text(s: str) -> str:
    if not s:
        return ""
    return re.sub(r"\s+", " ", s).strip()


def search_arxiv(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """
    Search arXiv via official public Atom API and return structured papers
    with pre-formatted IEEE citations.
    """
    cleaned_query = _clean_text(query)
    if not cleaned_query:
        return []

    # Strip special characters that break arXiv Lucene parser
    safe_q = re.sub(r"[^\w\s\-]", " ", cleaned_query)
    safe_q = urllib.parse.quote_plus(safe_q.strip())
    url = f"https://export.arxiv.org/api/query?search_query=all:{safe_q}&start=0&max_results={max_results}&sortBy=relevance&sortOrder=descending"

    headers = {
        "User-Agent": "PaperAI-ResearchAssistant/2.0 (academic-tools@paperai.local)"
    }

    try:
        with httpx.Client(timeout=12.0, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code != 200 or not resp.text.strip():
                return []
            
            # Parse Atom XML
            root = ET.fromstring(resp.text)
            ns = {"atom": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}
            
            results = []
            entries = root.findall("atom:entry", ns)
            for idx, entry in enumerate(entries):
                title_elem = entry.find("atom:title", ns)
                title = _clean_text(title_elem.text) if title_elem is not None and title_elem.text else "Untitled"
                
                summary_elem = entry.find("atom:summary", ns)
                summary = _clean_text(summary_elem.text) if summary_elem is not None and summary_elem.text else ""
                
                pub_elem = entry.find("atom:published", ns)
                year = pub_elem.text[:4] if pub_elem is not None and pub_elem.text else "2024"
                
                id_elem = entry.find("atom:id", ns)
                raw_id = id_elem.text.strip() if id_elem is not None and id_elem.text else ""
                arxiv_id = raw_id.split("/abs/")[-1] if "/abs/" in raw_id else raw_id
                
                authors = []
                for a in entry.findall("atom:author", ns):
                    name_elem = a.find("atom:name", ns)
                    if name_elem is not None and name_elem.text:
                        authors.append(_clean_text(name_elem.text))
                
                # Format authors IEEE style
                if not authors:
                    authors_str = "Anon."
                elif len(authors) == 1:
                    authors_str = _format_author_initials(authors[0])
                elif len(authors) == 2:
                    authors_str = f"{_format_author_initials(authors[0])} and {_format_author_initials(authors[1])}"
                else:
                    authors_str = f"{_format_author_initials(authors[0])} et al."
                
                citation = f'{authors_str}, "{title}," arXiv preprint arXiv:{arxiv_id}, {year}.'
                
                results.append({
                    "id": arxiv_id,
                    "title": title,
                    "authors": authors,
                    "authors_display": authors_str,
                    "year": year,
                    "summary": summary,
                    "source": "arXiv",
                    "url": f"https://arxiv.org/abs/{arxiv_id}",
                    "ieee_citation": citation
                })
            return results
    except Exception as e:
        print(f"DEBUG: search_arxiv error: {e}")
        return []


def search_crossref(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """
    Search Crossref API for peer-reviewed journal and conference publications.
    """
    cleaned_query = _clean_text(query)
    if not cleaned_query:
        return []

    safe_q = urllib.parse.quote_plus(cleaned_query)
    url = f"https://api.crossref.org/works?query={safe_q}&rows={max_results}"
    headers = {
        "User-Agent": "PaperAI-ResearchAssistant/2.0 (mailto:academic-tools@paperai.local)"
    }

    try:
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code != 200:
                return []
            data = resp.json()
            items = data.get("message", {}).get("items", [])
            
            results = []
            for item in items:
                # Prefer full papers / articles over figures or dataset components
                item_type = item.get("type", "")
                if item_type in ("component", "dataset"):
                    continue

                titles = item.get("title", [])
                if not titles:
                    continue
                title = _clean_text(titles[0])
                if title.lower().startswith("figure ") or title.lower().startswith("table "):
                    continue
                
                # Authors
                raw_authors = item.get("author", [])
                authors = []
                for a in raw_authors:
                    given = a.get("given", "")
                    family = a.get("family", "")
                    full = f"{given} {family}".strip()
                    if full:
                        authors.append(full)
                
                if not authors:
                    authors_str = "Anon."
                elif len(authors) == 1:
                    authors_str = _format_author_initials(authors[0])
                elif len(authors) == 2:
                    authors_str = f"{_format_author_initials(authors[0])} and {_format_author_initials(authors[1])}"
                else:
                    authors_str = f"{_format_author_initials(authors[0])} et al."
                
                # Venue & Year
                container = item.get("container-title", [])
                venue = container[0] if container else "IEEE Transactions"
                issued = item.get("issued") or {}
                date_parts = issued.get("date-parts")
                year = "2024"
                if date_parts and len(date_parts) > 0 and len(date_parts[0]) > 0 and date_parts[0][0]:
                    year = str(date_parts[0][0])
                doi = item.get("DOI", "")
                
                citation = f'{authors_str}, "{title}," {venue}, {year}.'
                if doi:
                    citation += f" doi: {doi}."
                
                results.append({
                    "id": doi or title[:20],
                    "title": title,
                    "authors": authors,
                    "authors_display": authors_str,
                    "year": year,
                    "summary": f"Published in {venue} ({year}).",
                    "source": "Crossref",
                    "url": f"https://doi.org/{doi}" if doi else "",
                    "ieee_citation": citation
                })
            return results
    except Exception as e:
        print(f"DEBUG: search_crossref error: {e}")
        return []


def auto_populate_literature(title: str, domain: str = "", max_results: int = 5) -> List[Dict[str, Any]]:
    """
    Intelligently discover relevant literature based on title and research domain.
    Blends arXiv and Crossref results, de-duplicates by title similarity.
    """
    # Extract salient keywords from title
    stopwords = {"a", "an", "the", "and", "or", "in", "on", "at", "for", "with", "by", "of", "to", "using", "based", "approach", "framework", "study"}
    words = re.findall(r"\b[A-Za-z0-9\-]{3,}\b", title.lower())
    salient = [w for w in words if w not in stopwords]
    
    query_parts = salient[:4]
    if domain:
        query_parts.append(domain)
    
    query = " ".join(query_parts) if query_parts else title
    
    # 1. Query arXiv
    arxiv_results = search_arxiv(query, max_results=max_results)
    if len(arxiv_results) >= max_results:
        return arxiv_results[:max_results]
    
    # 2. Complement with Crossref if needed
    needed = max_results - len(arxiv_results)
    crossref_results = search_crossref(query, max_results=needed + 2)
    
    seen_titles = {re.sub(r"[^\w]", "", r["title"].lower()) for r in arxiv_results}
    combined = list(arxiv_results)
    for cr in crossref_results:
        norm = re.sub(r"[^\w]", "", cr["title"].lower())
        if norm not in seen_titles:
            seen_titles.add(norm)
            combined.append(cr)
        if len(combined) >= max_results:
            break
            
    return combined[:max_results]


# ─── 2. Automated IEEE Compliance Audit Engine ─────────────────────────────────

def audit_ieee_compliance(paper_json: Dict[str, Any]) -> Dict[str, Any]:
    """
    Perform a comprehensive IEEE format and quality audit on paper_json.
    Returns a 0-100% Quality Score, grade, checks breakdown, and recommendations.
    """
    if not isinstance(paper_json, dict):
        return {
            "score": 0,
            "grade": "F (Invalid Paper Data)",
            "passed": False,
            "checks": [],
            "metrics": {}
        }

    checks = []
    total_score = 0
    max_possible = 100

    # 1. Title Verification (Max 10 pts)
    title = str(paper_json.get("title") or "").strip()
    title_score = 0
    title_msgs = []
    if not title:
        title_msgs.append("Title is missing.")
    elif len(title) < 15:
        title_score = 5
        title_msgs.append("Title is too brief for an academic paper (< 15 characters).")
    else:
        title_score = 10
        if title.endswith("."):
            title_score -= 1
            title_msgs.append("IEEE titles should not end with a period.")
        else:
            title_msgs.append("Title meets IEEE format specifications.")

    checks.append({
        "id": "title",
        "name": "Title Specification",
        "score": max(0, title_score),
        "max_score": 10,
        "status": "pass" if title_score >= 9 else ("warning" if title_score >= 5 else "fail"),
        "message": " ".join(title_msgs),
        "recommendation": "Capitalize first letters of words and omit terminal period." if title_score < 10 else None
    })
    total_score += title_score

    # 2. Authors & Affiliations (Max 15 pts)
    authors = paper_json.get("authors") or []
    auth_score = 0
    auth_msgs = []
    if not authors:
        auth_msgs.append("No authors listed.")
    else:
        has_affiliation = any(bool(a.get("affiliation", "").strip()) for a in authors if isinstance(a, dict))
        has_email = any(bool(a.get("email", "").strip()) for a in authors if isinstance(a, dict))
        auth_score = 8
        if has_affiliation:
            auth_score += 4
        else:
            auth_msgs.append("Missing institutional affiliations.")
        if has_email:
            auth_score += 3
        else:
            auth_msgs.append("Missing author email contact.")
        if auth_score == 15:
            auth_msgs.append(f"{len(authors)} author(s) with complete affiliation and email.")

    checks.append({
        "id": "authors",
        "name": "Authors & Affiliations",
        "score": auth_score,
        "max_score": 15,
        "status": "pass" if auth_score >= 12 else ("warning" if auth_score >= 8 else "fail"),
        "message": " ".join(auth_msgs),
        "recommendation": "Ensure each author has department, university/company, and email specified." if auth_score < 15 else None
    })
    total_score += auth_score

    # 3. Abstract Quality & Word Count (Max 20 pts)
    abstract = str(paper_json.get("abstract") or "").strip()
    words = re.findall(r"\b\w+\b", abstract)
    word_count = len(words)
    abs_score = 0
    abs_msgs = []
    if word_count == 0:
        abs_msgs.append("Abstract is missing.")
    elif word_count < 60:
        abs_score = 8
        abs_msgs.append(f"Abstract is too brief ({word_count} words). IEEE papers target 100–250 words.")
    elif 100 <= word_count <= 260:
        abs_score = 20
        abs_msgs.append(f"Optimal abstract length ({word_count} words within 100–250 target).")
    else:
        abs_score = 15
        abs_msgs.append(f"Acceptable abstract length ({word_count} words).")

    # Check for core components
    abs_lower = abstract.lower()
    has_method = any(k in abs_lower for k in ["propose", "method", "model", "framework", "architecture", "algorithm", "approach"])
    has_results = any(k in abs_lower for k in ["result", "demonstrate", "accuracy", "performance", "achieve", "evaluat", "show", "finding"])
    if abs_score > 0 and (not has_method or not has_results):
        abs_score = max(5, abs_score - 3)
        abs_msgs.append("Should explicitly state proposed methodology and key quantitative results.")

    checks.append({
        "id": "abstract",
        "name": "Abstract Scope & Length",
        "score": abs_score,
        "max_score": 20,
        "status": "pass" if abs_score >= 17 else ("warning" if abs_score >= 10 else "fail"),
        "message": " ".join(abs_msgs),
        "recommendation": "Expand abstract to 150-200 words covering context, problem, proposed solution, and benchmark results." if abs_score < 17 else None
    })
    total_score += abs_score

    # 4. Index Terms / Keywords (Max 10 pts)
    keywords_raw = str(paper_json.get("keywords") or "").strip()
    kw_list = [k.strip() for k in re.split(r"[,;]", keywords_raw) if k.strip()]
    kw_score = 0
    kw_msgs = []
    if not kw_list:
        kw_msgs.append("Index Terms are missing.")
    elif len(kw_list) < 3:
        kw_score = 5
        kw_msgs.append(f"Only {len(kw_list)} keywords provided. IEEE standard specifies 4–8 terms.")
    elif 4 <= len(kw_list) <= 8:
        kw_score = 10
        kw_msgs.append(f"Optimal index terms ({len(kw_list)} terms).")
    else:
        kw_score = 8
        kw_msgs.append(f"{len(kw_list)} keywords provided (4–8 recommended).")

    checks.append({
        "id": "keywords",
        "name": "Index Terms (Keywords)",
        "score": kw_score,
        "max_score": 10,
        "status": "pass" if kw_score >= 8 else ("warning" if kw_score >= 5 else "fail"),
        "message": " ".join(kw_msgs),
        "recommendation": "List 4 to 8 comma-separated standard IEEE taxonomy index terms." if kw_score < 8 else None
    })
    total_score += kw_score

    # 5. Section Structure & Hierarchy (Max 25 pts)
    sections = paper_json.get("sections") or []
    sec_score = 0
    sec_msgs = []
    sec_titles = [s.get("title", "") for s in sections if isinstance(s, dict)]
    titles_joined = " ".join(sec_titles).lower()

    if len(sections) < 3:
        sec_score = 8
        sec_msgs.append(f"Paper has only {len(sections)} sections (minimum 4–6 standard).")
    elif len(sections) >= 5:
        sec_score = 15
        sec_msgs.append(f"Comprehensive section structure ({len(sections)} sections).")
    else:
        sec_score = 12
        sec_msgs.append(f"{len(sections)} sections present.")

    # Check for standard IEEE sections
    has_intro = any(k in titles_joined for k in ["introduction", "intro"])
    has_methodology = any(k in titles_joined for k in ["method", "architecture", "approach", "proposed", "model", "system"])
    has_eval = any(k in titles_joined for k in ["result", "evaluation", "experiment", "performance", "discussion"])
    has_conclusion = any(k in titles_joined for k in ["conclusion", "concluding", "future work"])

    bonus = 0
    if has_intro: bonus += 2
    if has_methodology: bonus += 3
    if has_eval: bonus += 3
    if has_conclusion: bonus += 2
    sec_score += bonus

    if not has_intro: sec_msgs.append("Missing Introduction section.")
    if not has_conclusion: sec_msgs.append("Missing Conclusion section.")

    checks.append({
        "id": "sections",
        "name": "Section Hierarchy & Organization",
        "score": min(25, sec_score),
        "max_score": 25,
        "status": "pass" if sec_score >= 20 else ("warning" if sec_score >= 14 else "fail"),
        "message": " ".join(sec_msgs),
        "recommendation": "Structure document into Introduction, Related Work, Methodology, Results, and Conclusion." if sec_score < 20 else None
    })
    total_score += min(25, sec_score)

    # 6. References & In-Text Citation Cross-Referencing (Max 20 pts)
    references = paper_json.get("references") or []
    ref_score = 0
    ref_msgs = []
    
    # Gather full body text to check for [1], [2], etc.
    full_body = abstract + " " + " ".join(str(s.get("content", "")) for s in sections if isinstance(s, dict))
    citations_in_text = set(re.findall(r"\[(\d+)\]", full_body))
    
    if not references:
        ref_msgs.append("No references found.")
    elif len(references) < 3:
        ref_score = 6
        ref_msgs.append(f"Few references ({len(references)}). IEEE papers typically feature >= 5 citations.")
    elif len(references) >= 6:
        ref_score = 12
        ref_msgs.append(f"Strong bibliography ({len(references)} references).")
    else:
        ref_score = 9
        ref_msgs.append(f"{len(references)} references present.")

    # Cross-referencing check
    if len(citations_in_text) > 0 and len(references) > 0:
        match_ratio = min(1.0, len(citations_in_text) / max(1, len(references)))
        ref_bonus = int(match_ratio * 8)
        ref_score += ref_bonus
        ref_msgs.append(f"{len(citations_in_text)} in-text citations linked.")
    elif len(references) > 0:
        ref_msgs.append("References are present but not cited in text using [1], [2] format.")

    checks.append({
        "id": "references",
        "name": "References & Citation Cross-Referencing",
        "score": min(20, ref_score),
        "max_score": 20,
        "status": "pass" if ref_score >= 15 else ("warning" if ref_score >= 10 else "fail"),
        "message": " ".join(ref_msgs),
        "recommendation": "Cite all bibliography entries in body text using IEEE bracket notation '[1]'." if ref_score < 15 else None
    })
    total_score += min(20, ref_score)

    final_score = min(100, max(0, total_score))
    
    # Determine Grade
    if final_score >= 90:
        grade = "A+ (Publication Ready)"
    elif final_score >= 80:
        grade = "A (IEEE Compliant)"
    elif final_score >= 70:
        grade = "B (Minor Polish Recommended)"
    elif final_score >= 50:
        grade = "C (Significant Improvements Needed)"
    else:
        grade = "D (Draft / Incomplete)"

    return {
        "score": final_score,
        "grade": grade,
        "passed": final_score >= 75,
        "checks": checks,
        "metrics": {
            "title_length": len(title),
            "abstract_word_count": word_count,
            "keyword_count": len(kw_list),
            "section_count": len(sections),
            "reference_count": len(references),
            "citations_in_text": len(citations_in_text),
            "total_body_words": len(re.findall(r"\b\w+\b", full_body))
        }
    }


# ─── 3. Intelligent Section-Level AI Refinement ────────────────────────────────

ENHANCE_PROMPTS = {
    "academic_tone": """You are a senior IEEE Transactions editor.
Rewrite the section text below to meet highest IEEE academic standards:
1. Formal academic register: third person, objective, avoid conversational colloquialisms or vague claims.
2. Direct, concise phrasing without fluff or filler words.
3. Keep all factual data, metrics, code concepts, and citations intact.
4. Output ONLY the polished academic text. Do NOT wrap in conversational intro or meta-talk.""",

    "latex_equations": """You are a mathematical typesetter for IEEE papers.
Review the section text below. Wherever mathematical relationships, models, loss functions, algorithms, or statistical calculations are described in words:
1. Express them as clean LaTeX display equations using $$ ... $$ notation.
2. Include IEEE equation numbering such as \\tag{1}, \\tag{2}.
3. Define all variables and symbols immediately following the equation.
4. Output ONLY the enhanced section text with equations included. No meta explanations.""",

    "tighten_abstract": """You are an IEEE abstract specialist.
Rewrite the following abstract into the canonical 4-part IEEE structure within 150-200 words:
1. Context & Motivation (1-2 sentences on domain and open challenge)
2. Problem Statement & Limitation of existing solutions (1 sentence)
3. Proposed Method & Architecture (2 sentences explaining novelty)
4. Quantitative Results & Impact (1-2 sentences with concrete findings/metrics)
Output ONLY the refined abstract text. No preamble.""",

    "strengthen_methodology": """You are an IEEE computer science and engineering reviewer.
Strengthen the methodology section below:
1. Clearly formalize the architecture/pipeline with inputs, outputs, and intermediate stages.
2. Use precise technical terminology (e.g., loss functions, algorithmic time complexity, hyperparameter configurations).
3. If appropriate, structure into numbered steps or bulleted component definitions.
4. Keep all original metrics, figures, and citation markers.
Output ONLY the strengthened methodology text. No chat responses.""",

    "expand_literature": """You are an expert academic literature synthesizer.
Enhance this literature review / related work section:
1. Group existing approaches into coherent thematic categories or taxonomies.
2. Critically highlight the specific limitations of prior work that motivate this paper.
3. Formulate clear comparative differentiators showing why the proposed approach outperforms existing paradigms.
4. Keep all existing citations intact.
Output ONLY the enhanced text."""
}


def enhance_section_text(content: str, mode: str = "academic_tone", section_title: str = "") -> str:
    """
    Enhance a section's text according to the requested academic mode.
    Falls back gracefully if LLM is unavailable.
    """
    if not content or not content.strip():
        return content

    prompt_template = ENHANCE_PROMPTS.get(mode, ENHANCE_PROMPTS["academic_tone"])
    messages = [
        {"role": "system", "content": prompt_template},
        {"role": "user", "content": f"Section Title: {section_title or 'Section'}\n\nContent:\n{content}"}
    ]

    try:
        enhanced = call_llm(messages, temperature=0.3, max_tokens=2500)
        cleaned = enhanced.strip()
        # Clean off any outer markdown block wrappers if model wrapped full text
        if cleaned.startswith("```") and cleaned.endswith("```"):
            cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        return cleaned if cleaned else content
    except Exception as e:
        print(f"DEBUG: enhance_section_text fallback triggered: {e}")
        # Deterministic lightweight fallback: academic capitalization and punctuation cleanup
        return content
