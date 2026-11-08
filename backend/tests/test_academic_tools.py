import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app, sessions
from services.academic_tools import (
    _format_author_initials,
    audit_ieee_compliance,
    search_arxiv,
    search_crossref,
    auto_populate_literature,
    enhance_section_text,
)

client = TestClient(app)

def test_format_author_initials():
    assert _format_author_initials("John Smith") == "J. Smith"
    assert _format_author_initials("Alan Mathison Turing") == "A. M. Turing"
    assert _format_author_initials("Einstein") == "Einstein"
    assert _format_author_initials("") == ""

def test_audit_ieee_compliance_perfect():
    sample_paper = {
        "title": "Quantum Attention Networks for High-Throughput Genomic Sequence Classification",
        "authors": [
            {"name": "Alice Chen", "affiliation": "MIT Department of EECS", "email": "achen@mit.edu"},
            {"name": "Bob Davis", "affiliation": "Stanford AI Lab", "email": "bdavis@stanford.edu"}
        ],
        "abstract": "Deep learning architectures have revolutionized genomic analysis, yet scaling multi-head attention mechanisms to gigabase sequences remains computationally intractable. In this paper, we propose Quantum Attention Networks (QAN), a novel quantum-classical hybrid framework that accelerates self-attention from quadratic to sub-linear time complexity. We evaluate QAN across the 1000 Genomes dataset, demonstrating a 4.2x throughput increase and 98.7% classification accuracy, surpassing standard Transformer baselines while reducing memory footprint by 64%.",
        "keywords": "Quantum Computing, Attention Mechanism, Genomic Classification, Deep Learning, High-Throughput Sequencing",
        "sections": [
            {"title": "I. Introduction", "content": "Genomic sequence classification is central to personalized medicine [1]. Prior works suffer from memory bottlenecks [2]."},
            {"title": "II. Related Work", "content": "Attention mechanisms have been explored widely [3]. Recent quantum advances offer new speedups [4]."},
            {"title": "III. Proposed Architecture", "content": "Our QAN architecture introduces unitary state projections to compress attention matrices."},
            {"title": "IV. Experimental Evaluation", "content": "Experiments conducted on 8 NVIDIA A100 GPUs reveal consistent latency gains."},
            {"title": "V. Conclusion", "content": "In conclusion, QAN enables scalable sequence classification with rigorous theoretical bounds."}
        ],
        "references": [
            "[1] J. Doe et al., 'Genomic modeling,' Nature, 2023.",
            "[2] A. Turing, 'Computing machinery,' Mind, 1950.",
            "[3] A. Vaswani et al., 'Attention is all you need,' NeurIPS, 2017.",
            "[4] P. Shor, 'Algorithms for quantum computation,' FOCS, 1994."
        ]
    }
    result = audit_ieee_compliance(sample_paper)
    assert result["score"] >= 85
    assert result["grade"].startswith("A")
    assert result["passed"] is True
    assert len(result["checks"]) == 6
    assert result["metrics"]["keyword_count"] == 5
    assert result["metrics"]["section_count"] == 5

def test_audit_ieee_compliance_deficiencies():
    deficient_paper = {
        "title": "short",
        "authors": [],
        "abstract": "Too short abstract.",
        "keywords": "",
        "sections": [],
        "references": []
    }
    result = audit_ieee_compliance(deficient_paper)
    assert result["score"] < 40
    assert result["passed"] is False
    assert result["grade"].startswith("D")

def test_search_arxiv_mocked():
    sample_xml = """<?xml version="1.0" encoding="UTF-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <id>http://arxiv.org/abs/2301.00001v1</id>
        <title>Deep Residual Learning for Image Recognition</title>
        <summary>Deeper neural networks are more difficult to train...</summary>
        <published>2023-01-01T00:00:00Z</published>
        <author><name>Kaiming He</name></author>
        <author><name>Xiangyu Zhang</name></author>
      </entry>
    </feed>"""
    with patch("httpx.Client.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = sample_xml
        mock_get.return_value = mock_resp

        results = search_arxiv("deep residual learning", max_results=1)
        assert len(results) == 1
        assert "He and X. Zhang" in results[0]["authors_display"]
        assert results[0]["year"] == "2023"
        assert "arXiv preprint arXiv:2301.00001v1" in results[0]["ieee_citation"]

def test_enhance_section_text_fallback():
    with patch("services.academic_tools.call_llm", side_effect=RuntimeError("API error")):
        orig = "We tested our model and it worked good."
        res = enhance_section_text(orig, mode="academic_tone")
        assert res == orig

def test_endpoint_search_literature():
    with patch("main.search_arxiv") as mock_arxiv:
        mock_arxiv.return_value = [{
            "id": "1234",
            "title": "Test Paper",
            "authors_display": "T. Author",
            "year": "2024",
            "summary": "Sample summary",
            "ieee_citation": "T. Author, 'Test Paper', 2024."
        }]
        resp = client.post("/api/tools/search-literature", json={"query": "test query", "source": "arxiv"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 1
        assert data["results"][0]["title"] == "Test Paper"

def test_endpoint_audit_and_citation_and_enhance():
    sid = "test-tools-session-123"
    sessions[sid] = {
        "analysis": {"title": "Scalable Neural Architecture Search", "domain": "AI"},
        "paper_json": {
            "title": "Scalable Neural Architecture Search",
            "authors": [{"name": "A. Researcher", "affiliation": "Lab", "email": "a@lab.org"}],
            "abstract": "Neural architecture search has transformed deep learning design by automating topology discovery. In this paper we present a scalable search method with linear complexity. We achieve 95% accuracy on CIFAR-10 with 3x faster convergence.",
            "keywords": ["NAS", "Optimization", "Neural Networks", "Deep Learning"],
            "sections": [
                {"title": "I. Introduction", "content": "NAS is important [1]."},
                {"title": "II. Proposed Method", "content": "We formulate search as differentiable relaxation."},
                {"title": "III. Conclusion", "content": "The proposed method scales effectively."}
            ],
            "references": ["[1] B. Baker et al., 'Designing neural network architectures,' ICLR, 2017."]
        }
    }

    # 1. Audit endpoint
    audit_resp = client.get(f"/api/tools/audit-paper/{sid}")
    assert audit_resp.status_code == 200
    audit_data = audit_resp.json()["audit"]
    assert "score" in audit_data
    assert audit_data["score"] > 60

    # 2. Add Citation endpoint
    cit_resp = client.post(f"/api/tools/add-citation/{sid}", json={
        "citation": "C. Liu et al., 'Progressive Neural Architecture Search,' ECCV, 2018."
    })
    assert cit_resp.status_code == 200
    cit_data = cit_resp.json()
    assert len(cit_data["references"]) == 2
    assert "[2] C. Liu et al." in cit_data["references"][1]
    assert len(sessions[sid]["paper_json"]["references"]) == 2

    # 3. Enhance section endpoint
    with patch("services.academic_tools.call_llm", return_value="We formalize the neural architecture space as a directed acyclic graph (DAG)."):
        enh_resp = client.post(f"/api/tools/enhance-section/{sid}", json={
            "target": "section",
            "section_index": 1,
            "mode": "strengthen_methodology"
        })
        assert enh_resp.status_code == 200
        sec_content = sessions[sid]["paper_json"]["sections"][1]["content"]
        assert "directed acyclic graph" in sec_content
