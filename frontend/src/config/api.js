export const BASE = import.meta.env.VITE_API_BASE_URL !== undefined
  ? import.meta.env.VITE_API_BASE_URL
  : (import.meta.env.DEV ? 'http://localhost:8000' : '');

// ponytail: one fetch helper instead of repeating the ok-check everywhere
async function req(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    let errorMsg = `Request failed (${res.status})`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.detail || JSON.stringify(errJson);
    } catch {
      try {
        const text = await res.text();
        if (text) errorMsg = text;
      } catch (_) {}
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const apiService = {
  getSession(sessionId) {
    return req(`${BASE}/api/session/${sessionId}`);
  },

  uploadFile(file) {
    const form = new FormData();
    form.append('file', file);
    return req(`${BASE}/api/upload`, { method: 'POST', body: form });
  },

  askQuestion(sessionId) {
    return req(`${BASE}/api/ask-paper/${sessionId}`, { method: 'POST' });
  },

  submitAnswer(sessionId, question, answer) {
    return req(`${BASE}/api/answer-paper/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer }),
    });
  },

  getDownloadUrl(sessionId, fmt="html", paperFormat="procomm") {
    return `${BASE}/api/download-paper/${sessionId}/${fmt}?format=${paperFormat}`;
  },

  savePaper(sessionId, paperJson) {
    return req(`${BASE}/api/save-paper/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paper_json: paperJson }),
    });
  },

  editPaper(sessionId, instruction) {
    return req(`${BASE}/api/edit-paper/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction }),
    });
  },

  setMode(sessionId, mode) {
    return req(`${BASE}/api/set-mode/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
  },

  askResumeQuestion(sessionId) {
    return req(`${BASE}/api/ask-resume/${sessionId}`, { method: 'POST' });
  },

  submitResumeAnswer(sessionId, question, answer) {
    return req(`${BASE}/api/answer-resume/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer }),
    });
  },

  getResumeDownloadUrl(sessionId, fmt) {
    return `${BASE}/api/download-resume/${sessionId}/${fmt}`;
  },

  saveResume(sessionId, resumeText) {
    return req(`${BASE}/api/save-resume/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_text: resumeText }),
    });
  },

  editResume(sessionId, instruction) {
    return req(`${BASE}/api/edit-resume/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction }),
    });
  },

  // ─── Academic Intelligence Tools ──────────────────────────────────────────
  auditPaper(sessionId) {
    return req(`${BASE}/api/tools/audit-paper/${sessionId}`);
  },

  searchLiterature(query, maxResults = 5, source = 'all') {
    return req(`${BASE}/api/tools/search-literature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, max_results: maxResults, source }),
    });
  },

  autoLiterature(sessionId, maxResults = 5) {
    return req(`${BASE}/api/tools/auto-literature/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_results: maxResults }),
    });
  },

  enhanceSection(sessionId, { target = 'section', sectionIndex = 0, mode = 'academic_tone' } = {}) {
    return req(`${BASE}/api/tools/enhance-section/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, section_index: sectionIndex, mode }),
    });
  },

  addCitation(sessionId, citation) {
    return req(`${BASE}/api/tools/add-citation/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ citation }),
    });
  },

};
