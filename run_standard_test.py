import os
import sys
import json
import time

sys.path.insert(0, os.path.abspath("backend"))

from fastapi.testclient import TestClient
from main import app, sessions
import fitz

client = TestClient(app)

def run_standard_pipeline():
    print("=" * 75)
    print("STANDARD IEEE CONFERENCE PAPER GENERATION (4+ PAGES TARGET)")
    print("=" * 75)

    # 1. Ingestion
    print("\n[STEP 1] Ingesting comprehensive 1,762-word technical document...")
    t0 = time.time()
    with open("standard_seismic_edge_ai_report.docx", "rb") as f:
        r = client.post("/api/upload", files={
            "file": ("standard_seismic_edge_ai_report.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        })
    assert r.status_code == 200, f"Upload failed: {r.text}"
    session_id = r.json()["session_id"]
    upload_time = time.time() - t0
    print(f"✓ Uploaded in {upload_time:.2f}s | Session: {session_id}")

    # 2. Set mode to IEEE (Deep audit)
    print("\n[STEP 2] Setting mode to 'ieee' (auditing rich technical data)...")
    t0 = time.time()
    r = client.post(f"/api/set-mode/{session_id}", json={"mode": "ieee"})
    assert r.status_code == 200, f"Set mode failed: {r.text}"
    audit_data = r.json()
    analysis = audit_data.get("analysis", {})
    audit_time = time.time() - t0
    print(f"✓ Deep audit complete in {audit_time:.2f}s")
    print(f"  • Title:   {analysis.get('title')}")
    print(f"  • Domain:  {analysis.get('domain')}")
    print(f"  • Claims:  {len(analysis.get('key_claims', []))} key claims extracted")

    # 3. Provide Author Metadata
    print("\n[STEP 3] Registering complete author byline & affiliations...")
    client.post(f"/api/answer-paper/{session_id}", json={
        "question": "Who are the authors, their affiliations, and contact emails?",
        "answer": "Samir Khadka, Distributed Systems & Robotics Laboratory, Department of Computer Science & Engineering, samir@example.com"
    })
    print("✓ Byline registered.")

    # 4. Stream & Generate Full IEEE Paper
    print("\n[STEP 4] Generating Full-Length IEEE Conference Paper...")
    t0 = time.time()
    resp = client.get(f"/api/generate-paper-stream/{session_id}")
    assert resp.status_code == 200, f"Stream failed: {resp.text}"

    done_res = None
    for line in resp.iter_lines():
        if line.startswith("data: "):
            try:
                payload = json.loads(line[6:])
                if payload.get("type") == "done":
                    done_res = payload.get("result")
            except Exception:
                pass

    gen_time = time.time() - t0
    print(f"✓ Full Paper generation complete in {gen_time:.2f}s")

    sess = sessions[session_id]
    paper_json = sess.get("paper_json") or {}
    sections = paper_json.get("sections", [])
    abstract = paper_json.get("abstract", "")
    references = paper_json.get("references", [])

    total_words = len(abstract.split()) + sum(len(s.get("content", "").split()) for s in sections)

    print(f"  • Total Generated Word Count: {total_words:,} words")
    print(f"  • Abstract Word Count:        {len(abstract.split())} words")
    print(f"  • Total Generated Sections:   {len(sections)}")
    for s in sections:
        sec_w = len(s.get("content", "").split())
        print(f"    - {s.get('title')} ({sec_w} words)")
    print(f"  • References Count:           {len(references)}")

    # 5. Run IEEE Compliance Audit Tool
    print("\n[STEP 5] Running Automated IEEE Compliance Audit...")
    r_audit = client.get(f"/api/tools/audit-paper/{session_id}")
    assert r_audit.status_code == 200
    report = r_audit.json()["audit"]
    print(f"✓ IEEE Quality Score: {report.get('score')}/100 ({report.get('grade')})")
    print(f"  • Publication Ready: {report.get('passed')}")

    # 6. Binary Exports (PDF & DOCX)
    print("\n[STEP 6] Rendering IEEE 2-Column PDF and DOCX...")
    # PDF
    r_pdf = client.get(f"/api/download-paper/{session_id}/pdf")
    assert r_pdf.status_code == 200
    pdf_path = "standard_ieee_paper_output.pdf"
    with open(pdf_path, "wb") as f:
        f.write(r_pdf.content)

    # DOCX
    r_docx = client.get(f"/api/download-paper/{session_id}/docx")
    assert r_docx.status_code == 200
    docx_path = "standard_ieee_paper_output.docx"
    with open(docx_path, "wb") as f:
        f.write(r_docx.content)

    # Inspect PDF Page Count
    doc_fitz = fitz.open(pdf_path)
    page_count = len(doc_fitz)

    print(f"✓ IEEE 2-Column PDF Exported: {pdf_path} ({len(r_pdf.content):,} bytes)")
    print(f"✓ IEEE Formatted DOCX Exported: {docx_path} ({len(r_docx.content):,} bytes)")
    print(f"\n[FINAL VERIFICATION] PDF Page Count: {page_count} PAGES")
    print("=" * 75)
    print(f"RESULT: Generated a STANDARD IEEE CONFERENCE PAPER of {page_count} PAGES ({total_words:,} words)!")
    print("=" * 75)

if __name__ == "__main__":
    run_standard_pipeline()
