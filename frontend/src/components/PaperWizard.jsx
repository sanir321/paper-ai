import { useState, useRef, useEffect, useCallback } from 'react';
import { apiService, BASE } from '../config/api';
import LogoMark from './LogoMark';

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

const FORMAT_INFO = [
  { label: 'PDF', desc: 'Extracts text, diagrams & metadata' },
  { label: 'DOCX', desc: 'Reads formatted content & tables' },
  { label: 'Images', desc: 'OCR extracts text from screenshots & scans' },
  { label: 'Code', desc: 'Parses .py, .js, .tsx, .ipynb & more' },
  { label: 'Text', desc: 'TXT, Markdown, CSV, HTML, XML' },
  { label: 'LaTeX', desc: 'Reads .tex with equations & structure' },
];

const steps = ['Upload', 'Analysis', 'Interview', 'Generate'];

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 ml-1">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce bg-primary"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }} />
      ))}
    </span>
  );
}

function DocIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color || '#6c6a64'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function Sidebar({ current, history, onSelectDoc, onReset }) {
  let profile = null;
  try { const p = localStorage.getItem('userProfile'); if (p) profile = JSON.parse(p); } catch {}

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 min-h-0 h-full">
      <div className="flex-1 rounded-2xl border border-hairline bg-surface-card flex flex-col overflow-y-auto min-h-0"
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-hairline shrink-0 flex items-center gap-2.5 text-ink">
          <LogoMark size={16} />
          <span className="text-sm font-medium">Research Paper AI</span>
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {history.length === 0 && !current && (
            <div className="text-center py-8">
              <p className="text-xs font-mono uppercase mb-1 text-muted">Empty</p>
              <p className="text-xs text-muted-soft">Upload a file to get started</p>
            </div>
          )}

          {history.map((doc, i) => {
            const isActive = current && current.name === doc.name && current.lastModified === doc.lastModified;
            return (
              <button key={`${doc.name}-${i}`}
                onClick={() => onSelectDoc(doc)}
                className="w-full text-left rounded-xl px-3 py-2.5 transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: isActive ? 'var(--canvas)' : 'transparent',
                  border: isActive ? '1px solid var(--hairline)' : '1px solid transparent',
                }}>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0"><DocIcon /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate font-medium text-ink">{doc.name}</p>
                    {doc.title && (
                      <p className="text-[11px] truncate mt-0.5 text-muted-soft">{doc.title}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono text-muted-soft">
                        {formatSize(doc.size)}
                      </span>
                      <span className="text-[10px] text-muted-soft">
                        {new Date(doc.uploadedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-primary" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Current session details */}
        {current && (
          <div className="px-4 py-3 border-t border-hairline shrink-0">
            <p className="text-[10px] font-mono uppercase mb-1.5 text-muted">Active Session</p>
            <div className="rounded-xl px-3 py-2 bg-canvas">
              <p className="text-xs font-medium truncate text-ink">{current.name}</p>
              <p className="text-[10px] mt-0.5 text-muted-soft">
                {current.sections || 0} sections · {current.qaCount || 0} Q&A
              </p>
            </div>
          </div>
        )}

        {/* New Session button */}
        <div className="p-3 border-t border-hairline shrink-0">
          <button onClick={onReset}
            className="w-full text-xs rounded-full px-3 py-2 text-center transition-all hover:opacity-80 active:scale-[0.95] flex items-center justify-center gap-1.5 bg-canvas text-muted">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6c6a64" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Session
          </button>
        </div>

        {/* Profile at bottom */}
        {profile && (
          <div className="px-4 py-3 border-t border-hairline shrink-0 bg-canvas">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                style={{ backgroundColor: '#cc785c', color: '#fff' }}>
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate text-ink">{profile.name}</p>
                <p className="text-[10px] truncate text-muted">{profile.course} · {profile.year}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default function PaperWizard({ onNewSession }) {
  const [step, setStep] = useState(0);
  const [prevStep, setPrevStep] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [question, setQuestion] = useState(null);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUp, setFollowUp] = useState(null);
  const [messages, setMessages] = useState([]);
  const [aiTyping, setAiTyping] = useState(false);
  const [ready, setReady] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [livePaper, setLivePaper] = useState('');
  const [result, setResult] = useState(null);
  const streamDone = useRef(false);
  const evtSourceRef = useRef(null);
  const evtSourceResumeRef = useRef(null);
  const [customAnswer, setCustomAnswer] = useState('');
  const [customFollowUp, setCustomFollowUp] = useState('');
  const chatEnd = useRef(null);
  const fileRef = useRef(null);

  const [editMode, setEditMode] = useState(false);
  const [editable, setEditable] = useState(null);
  const [saving, setSaving] = useState(false);
  const [aiEditInput, setAiEditInput] = useState('');
  const [aiEditing, setAiEditing] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [editError, setEditError] = useState('');
  const [uploadHistory, setUploadHistory] = useState(() => {
    try {
      const raw = localStorage.getItem('uploadHistory');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [selectedFormat, setSelectedFormat] = useState('procomm');

  // Resume mode state
  const [mode, setMode] = useState(''); // '' | 'ieee' | 'resume'
  const [resumeQuestion, setResumeQuestion] = useState(null);
  const [resumeMessages, setResumeMessages] = useState([]);
  const [resumeReady, setResumeReady] = useState(false);
  const [resumeGenerating, setResumeGenerating] = useState(false);
  const [liveResume, setLiveResume] = useState('');
  const [resumeResult, setResumeResult] = useState(null);
  const [resumeEditMode, setResumeEditMode] = useState(false);
  const [resumeEditable, setResumeEditable] = useState('');
  const [resumeSaving, setResumeSaving] = useState(false);
  const [resumeAiEditInput, setResumeAiEditInput] = useState('');
  const [resumeAiEditing, setResumeAiEditing] = useState(false);
  const [resumePreviewKey, setResumePreviewKey] = useState(0);
  const [resumeCustomAnswer, setResumeCustomAnswer] = useState('');
  const [guidelineTab, setGuidelineTab] = useState('ieee'); // 'ieee' | 'resume'

  // ─── Academic Intelligence Tools State ─────────────────────────────────────
  const [auditData, setAuditData] = useState(null);
  const [auditing, setAuditing] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showLitSearchModal, setShowLitSearchModal] = useState(false);
  const [litQuery, setLitQuery] = useState('');
  const [litSource, setLitSource] = useState('all');
  const [litResults, setLitResults] = useState([]);
  const [litSearching, setLitSearching] = useState(false);
  const [litAddedIds, setLitAddedIds] = useState(new Set());
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceSuccessMsg, setEnhanceSuccessMsg] = useState('');

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, aiTyping]);
  // Keep upload history in localStorage so a reload can restore the session
  // list. Without this the sidebar resets to EMPTY and the user loses their
  // documents, answers and generated output.
  useEffect(() => {
    try {
      localStorage.setItem('uploadHistory', JSON.stringify(uploadHistory));
    } catch {}
  }, [uploadHistory]);

  useEffect(() => {
    return () => {
      evtSourceRef.current?.close();
      evtSourceResumeRef.current?.close();
    };
  }, []);

  const goStep = useCallback((s) => {
    setPrevStep(step);
    setStep(s);
  }, [step]);

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); setFile(e.dataTransfer.files[0]); };
  const handleFileSelect = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) { setError('Select a file'); return; }
    setLoading(true); setError('');
    try {
      const data = await apiService.uploadFile(file);
      setSessionId(data.session_id);
      const docEntry = {
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        sessionId: data.session_id,
        title: '',
        uploadedAt: Date.now(),
        sections: 0,
        qaCount: 0,
      };
      setUploadHistory(prev => {
        const filtered = prev.filter(d => d.name !== file.name || d.lastModified !== file.lastModified);
        return [docEntry, ...filtered].slice(0, 50);
      });
      goStep(1);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleLoadSample = async (sampleType, autoGenerate = false) => {
    setLoading(true); setError('');
    try {
      const data = await apiService.loadSample(sampleType);
      setSessionId(data.session_id);
      setMode(data.mode);
      const isPaper = data.mode === 'ieee';
      setFile({
        name: data.filename,
        size: isPaper ? 11893 : 2043,
        lastModified: Date.now(),
      });
      const docEntry = {
        name: data.filename,
        size: isPaper ? 11893 : 2043,
        lastModified: Date.now(),
        sessionId: data.session_id,
        title: isPaper ? (data.analysis?.title || 'Distributed Anomaly Detection') : 'Samir Khadka Resume',
        uploadedAt: Date.now(),
        sections: isPaper ? 8 : 6,
        qaCount: 0,
      };
      setUploadHistory(prev => {
        const filtered = prev.filter(d => d.sessionId !== data.session_id);
        return [docEntry, ...filtered].slice(0, 50);
      });

      if (isPaper) {
        setAnalysis(data.analysis || {});
        setReady(true);
        setMessages([
          { role: 'ai', text: `Loaded sample research paper notes on TinyML Edge AI: "${data.analysis?.title || 'Distributed Anomaly Detection'}". Standard 4-page target ready for generation!` }
        ]);
        if (autoGenerate) {
          goStep(3);
          setGenerating(true);
          handleGenerate(data.session_id);
          return;
        }
        goStep(1);
      } else {
        setResumeReady(true);
        setResumeMessages([
          { role: 'ai', text: `Loaded complete sample resume for Samir Khadka (AI Systems & Full-Stack Engineer). Ready to generate standard single-column ATS resume!` }
        ]);
        if (autoGenerate) {
          goStep(3);
          setResumeGenerating(true);
          handleResumeGenerate(data.session_id);
          return;
        }
        goStep(1);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const answerQuestion = async (answer) => {
    if (!question || !answer.trim()) return;
    setLoading(true);
    const qObj = question;
    setQuestion(null);
    const q = typeof qObj === 'object' ? (qObj.question || '') : qObj;
    setMessages(prev => [...prev, { role: 'user', text: answer }]);
    setAiTyping(true);
    try {
      const data = await apiService.submitAnswer(sessionId, q, answer);
      setCustomAnswer('');
      setShowFollowUp(false);
      await new Promise(r => setTimeout(r, 700));
      if (data.needs_clarification) {
        setFollowUp(data);
        setQuestion(data);
        setShowFollowUp(true);
        setAiTyping(false);
        setMessages(prev => [...prev, { role: 'ai', text: `Could you clarify? ${data.follow_up || ''}` }]);
      } else if (data.ready) {
        setReady(true); setAiTyping(false);
        setMessages(prev => [...prev, { role: 'ai', text: 'Great — I have enough information to generate the paper!' }]);
        goStep(3);
      } else {
        setQuestion(data); setAiTyping(false);
        setMessages(prev => [...prev, { role: 'ai', text: data.question || '' }]);
      }
    } catch (e) {
      // Restore the question and stop the typing indicator, otherwise the
      // interview deadlocks: question is already cleared and aiTyping stays
      // true, leaving no input and a permanent "Waiting for AI response...".
      setAiTyping(false);
      setQuestion(qObj);
      setMessages(prev => prev.slice(0, -1));
      setError(e.message);
    }
    finally { setLoading(false); }
  };

  const handleFollowUpAnswer = async (answer) => {
    if (!answer.trim()) return;
    setLoading(true);
    setShowFollowUp(false);
    setMessages(prev => [...prev, { role: 'user', text: answer }]);
    setAiTyping(true);
    try {
      const followUpQ = followUp?.follow_up || followUp?.question || 'Clarification';
      const data = await apiService.submitAnswer(sessionId, followUpQ, answer);
      setCustomFollowUp('');
      await new Promise(r => setTimeout(r, 700));
      if (data.ready) {
        setReady(true); setAiTyping(false);
        setMessages(prev => [...prev, { role: 'ai', text: 'Great — I have enough information!' }]);
        goStep(3);
      } else {
        setQuestion(data); setAiTyping(false);
        setMessages(prev => [...prev, { role: 'ai', text: data.question || '' }]);
      }
    } catch (e) {
      setAiTyping(false);
      setFollowUp(followUp);
      setQuestion(followUp);
      setShowFollowUp(true);
      setMessages(prev => prev.slice(0, -1));
      setError(e.message);
    }
    finally { setLoading(false); }
  };

  const skipInterview = async () => {
    setLoading(true);
    try {
      const data = await apiService.askQuestion(sessionId);
      if (data.ready) {
        setReady(true); setQuestion(null);
        setMessages(prev => [...prev, { role: 'ai', text: 'Skipping — enough information to generate the paper!' }]);
        goStep(3);
      } else {
        setQuestion(data);
        setMessages(prev => [...prev, { role: 'ai', text: `${data.question}` }]);
        goStep(2);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleGenerate = (id = sessionId) => {
    setGenerating(true); setError('');
    setLivePaper('');
    streamDone.current = false;
    evtSourceRef.current?.close();
    const es = new EventSource(`${BASE}/api/generate-paper-stream/${id}`);
    evtSourceRef.current = es;
    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type === 'token') {
          setLivePaper(prev => prev + (data.content || ''));
        } else if (data.type === 'error') {
          streamDone.current = true;
          setError(data.message || 'Generation failed');
          setGenerating(false);
          es.close();
        } else if (data.type === 'done') {
          streamDone.current = true;
          setResult(data.result);
          setStep(3);
          setGenerating(false);
          es.close();
        }
      } catch (e) {}
    };
    es.onerror = () => {
      if (streamDone.current) return;
      setError('Connection lost during generation');
      setGenerating(false);
      es.close();
    };
  };

  const enterEdit = () => {
    const pj = result.paper_json || {};
    setEditable({
      title: pj.title || '',
      authors: (pj.authors || []).map(a => ({ name: a.name || '', affiliation: a.affiliation || '', email: a.email || '' })),
      abstract: pj.abstract || '',
      keywords: Array.isArray(pj.keywords) ? pj.keywords.join(', ') : (pj.keywords || ''),
      sections: (pj.sections || []).map(s => ({ title: s.title || '', content: s.content || '' })),
      references: (pj.references || []).map(r => (typeof r === 'string' ? r : (r.citation || ''))),
    });
    setEditError('');
    setEditMode(true);
  };

  const updateEditable = (patch) => setEditable(prev => ({ ...prev, ...patch }));

  const updateAuthor = (i, patch) => setEditable(prev => ({
    ...prev,
    authors: prev.authors.map((a, j) => (j === i ? { ...a, ...patch } : a)),
  }));

  const updateSection = (i, patch) => setEditable(prev => ({
    ...prev,
    sections: prev.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)),
  }));

  const updateReference = (i, value) => setEditable(prev => ({
    ...prev,
    references: prev.references.map((r, j) => (j === i ? value : r)),
  }));

  const handleSave = async () => {
    setSaving(true); setEditError('');
    try {
      const data = await apiService.savePaper(sessionId, editable);
      setResult(prev => ({ ...prev, html_content: data.html_content, paper_json: data.paper_json }));
      setEditMode(false);
      setPreviewKey(k => k + 1);
    } catch (e) { setEditError(e.message); }
    finally { setSaving(false); }
  };

  const handleAiEdit = async () => {
    if (!aiEditInput.trim()) return;
    setAiEditing(true); setEditError('');
    try {
      const data = await apiService.editPaper(sessionId, aiEditInput);
      setResult(data);
      setEditMode(false);
      setPreviewKey(k => k + 1);
      setAiEditInput('');
      fetchAudit(sessionId);
    } catch (e) { setEditError(e.message); }
    finally { setAiEditing(false); }
  };

  // ─── Academic Intelligence Actions ─────────────────────────────────────────
  const fetchAudit = async (sid = sessionId) => {
    if (!sid) return;
    setAuditing(true);
    try {
      const data = await apiService.auditPaper(sid);
      if (data && data.audit) {
        setAuditData(data.audit);
      }
    } catch (e) {
      console.warn('Audit error:', e);
    } finally {
      setAuditing(false);
    }
  };

  useEffect(() => {
    if (result && sessionId && mode !== 'resume' && !auditData) {
      fetchAudit(sessionId);
    }
  }, [result, sessionId, mode]);

  const handleSearchLiterature = async (customQ) => {
    const q = (customQ || litQuery || '').trim();
    if (!q) return;
    setLitSearching(true);
    try {
      const data = await apiService.searchLiterature(q, 6, litSource);
      setLitResults(data.results || []);
    } catch (e) {
      console.warn('Lit search error:', e);
    } finally {
      setLitSearching(false);
    }
  };

  const handleAutoPopulateLiterature = async () => {
    if (!sessionId) return;
    setLitSearching(true);
    try {
      const data = await apiService.autoLiterature(sessionId, 6);
      setLitResults(data.results || []);
      if (data.title && !litQuery) {
        setLitQuery(data.title);
      }
    } catch (e) {
      console.warn('Auto lit error:', e);
    } finally {
      setLitSearching(false);
    }
  };

  const handleAddCitation = async (citation, itemKey) => {
    if (!sessionId || !citation) return;
    try {
      const data = await apiService.addCitation(sessionId, citation);
      if (data && data.result) {
        setResult(prev => ({
          ...prev,
          html_content: data.result.html_content,
          paper_json: data.result.paper_json,
        }));
        setPreviewKey(k => k + 1);
        setLitAddedIds(prev => new Set(prev).add(itemKey || citation));
        fetchAudit(sessionId);
      }
    } catch (e) {
      alert('Failed to add citation: ' + e.message);
    }
  };

  const handleEnhanceAbstract = async (enhanceMode = 'tighten_abstract') => {
    if (!sessionId) return;
    setEnhancing(true);
    setEnhanceSuccessMsg('');
    try {
      const data = await apiService.enhanceSection(sessionId, { target: 'abstract', mode: enhanceMode });
      if (data && data.result) {
        setResult(prev => ({
          ...prev,
          html_content: data.result.html_content,
          paper_json: data.result.paper_json,
        }));
        setPreviewKey(k => k + 1);
        setEnhanceSuccessMsg('Abstract successfully refined to IEEE standard!');
        setTimeout(() => setEnhanceSuccessMsg(''), 4000);
        fetchAudit(sessionId);
      }
    } catch (e) {
      alert('Refinement failed: ' + e.message);
    } finally {
      setEnhancing(false);
    }
  };

  const handleEnhanceSectionInEdit = async (i, enhanceMode) => {
    if (!sessionId || !editable || !editable.sections[i]) return;
    setEnhancing(true);
    try {
      const data = await apiService.enhanceSection(sessionId, {
        target: 'section',
        sectionIndex: i,
        mode: enhanceMode,
      });
      if (data && data.result && data.result.paper_json) {
        const updatedSecs = data.result.paper_json.sections || [];
        if (updatedSecs[i]) {
          updateSection(i, { content: updatedSecs[i].content });
        }
      }
    } catch (e) {
      alert('Section enhancement failed: ' + e.message);
    } finally {
      setEnhancing(false);
    }
  };

  // ─── Mode selection ──────────────────────────────────────────────────────
  const handleSelectMode = async (selectedMode) => {
    setMode(selectedMode);
    setLoading(true); setError('');
    try {
      const data = await apiService.setMode(sessionId, selectedMode);
      if (selectedMode === 'resume') {
        if (data.ready) {
          setResumeReady(true);
          setResumeQuestion(null);
          setResumeMessages([{ role: 'ai', text: `I've analyzed "${file?.name || 'your document'}". Ready to generate your resume!` }]);
          goStep(3);
        } else if (data.question) {
          setResumeQuestion(data);
          const qText = typeof data.question === 'string' ? data.question : (data.question?.question || '');
          setResumeMessages([{ role: 'ai', text: `I've analyzed your document for resume content. Let me ask a few questions.\n\n${qText}` }]);
          goStep(2);
        }
      } else {
        // IEEE mode — set analysis and first question
        setAnalysis(data.analysis);
        const docTitle = data.analysis?.title || file?.name || 'Untitled';
        setUploadHistory(prev => prev.map(d =>
          d.sessionId === sessionId ? { ...d, title: docTitle } : d
        ));
        if (data.question) {
          setQuestion(data);
          setAiTyping(true);
          const qText = typeof data.question === 'string' ? data.question : (data.question?.question || '');
          setTimeout(() => {
            setAiTyping(false);
            setMessages([{ role: 'ai', text: `I've analyzed "${file?.name || 'your document'}". Let me ask a few questions.\n\n${qText}` }]);
            goStep(2);
          }, 600);
        } else {
          setReady(true);
          setMessages([{ role: 'ai', text: `I've analyzed "${file?.name || 'your document'}". The analysis is clear enough to generate a paper!` }]);
          goStep(3);
        }
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ─── Resume interview ────────────────────────────────────────────────────
  const answerResumeQuestion = async (answer) => {
    if (!resumeQuestion || !answer.trim()) return;
    setLoading(true);
    const qObj = resumeQuestion;
    setResumeQuestion(null);
    const q = typeof qObj === 'object' ? (qObj.question || '') : qObj;
    setResumeMessages(prev => [...prev, { role: 'user', text: answer }]);
    setAiTyping(true);
    try {
      const data = await apiService.submitResumeAnswer(sessionId, q, answer);
      setResumeCustomAnswer('');
      await new Promise(r => setTimeout(r, 700));
      if (data.ready) {
        setResumeReady(true);
        setResumeQuestion(null);
        setAiTyping(false);
        setResumeMessages(prev => [...prev, { role: 'ai', text: 'Great — I have enough information to generate your resume!' }]);
        goStep(3);
      } else {
        setResumeQuestion(data);
        setAiTyping(false);
        const qText = typeof data.question === 'string' ? data.question : (data.question?.question || '');
        setResumeMessages(prev => [...prev, { role: 'ai', text: qText }]);
      }
    } catch (e) {
      setAiTyping(false);
      setResumeQuestion(qObj);
      setResumeMessages(prev => prev.slice(0, -1));
      setError(e.message);
    }
    finally { setLoading(false); }
  };

  // ─── Resume generation ───────────────────────────────────────────────────
  const handleResumeGenerate = (id = sessionId) => {
    setResumeGenerating(true); setError('');
    setLiveResume('');
    streamDone.current = false;
    evtSourceResumeRef.current?.close();
    const es = new EventSource(`${BASE}/api/generate-resume-stream/${id}`);
    evtSourceResumeRef.current = es;
    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type === 'token') {
          setLiveResume(prev => prev + (data.content || ''));
        } else if (data.type === 'error') {
          streamDone.current = true;
          setError(data.message || 'Generation failed');
          setResumeGenerating(false);
          es.close();
        } else if (data.type === 'done') {
          streamDone.current = true;
          setResumeResult(data.result);
          setStep(3);
          setResumeGenerating(false);
          es.close();
        }
      } catch (e) {}
    };
    es.onerror = () => {
      if (streamDone.current) return;
      setError('Connection lost during generation');
      setResumeGenerating(false);
      es.close();
    };
  };

  // ─── Resume editing ──────────────────────────────────────────────────────
  const enterResumeEdit = () => {
    setResumeEditable(resumeResult.resume_text || '');
    setEditError('');
    setResumeEditMode(true);
  };

  const handleResumeSave = async () => {
    setResumeSaving(true); setEditError('');
    try {
      const data = await apiService.saveResume(sessionId, resumeEditable);
      setResumeResult(prev => ({ ...prev, ...data }));
      setResumeEditMode(false);
      setResumePreviewKey(k => k + 1);
    } catch (e) { setEditError(e.message); }
    finally { setResumeSaving(false); }
  };

  const handleResumeAiEdit = async () => {
    if (!resumeAiEditInput.trim()) return;
    setResumeAiEditing(true); setEditError('');
    try {
      const data = await apiService.editResume(sessionId, resumeAiEditInput);
      setResumeResult(data);
      setResumeEditMode(false);
      setResumePreviewKey(k => k + 1);
      setResumeAiEditInput('');
    } catch (e) { setEditError(e.message); }
    finally { setResumeAiEditing(false); }
  };

  const handleSelectDoc = async (doc) => {
    if (!doc?.sessionId) return;
    if (doc.sessionId === sessionId) return;

    setLoading(true);
    setError('');
    try {
      const sess = await apiService.getSession(doc.sessionId);
      setSessionId(sess.session_id);
      setFile({ name: sess.filename || doc.name, size: doc.size || 0, lastModified: doc.lastModified || Date.now() });

      // Close running event streams
      evtSourceRef.current?.close();
      evtSourceResumeRef.current?.close();
      setGenerating(false);
      setResumeGenerating(false);
      setLivePaper('');
      setLiveResume('');
      setEditMode(false);
      setResumeEditMode(false);

      const sessMode = sess.mode || '';
      setMode(sessMode);

      if (sessMode === 'resume') {
        if (sess.resume_html || sess.resume_text || sess.resume_data) {
          const rd = sess.resume_data || {};
          const name = (rd.name || 'Resume').replace(/\s+/g, '_');
          setResumeResult({
            resume_data: rd,
            html_content: sess.resume_html,
            resume_text: sess.resume_text,
            download_html: `/api/download-resume/${sess.session_id}/html`,
            download_pdf: `/api/download-resume/${sess.session_id}/pdf`,
            filename_html: `${name}_Resume.html`,
          });
          setResumeEditable(sess.resume_text || '');
          goStep(3);
        } else if (sess.resume_ready) {
          setResumeReady(true);
          setResumeQuestion(null);
          setResumeMessages([{ role: 'ai', text: 'Document ready for resume generation!' }]);
          goStep(3);
        } else {
          goStep(2);
        }
      } else if (sessMode === 'ieee') {
        setAnalysis(sess.analysis || {});
        if (sess.html_content || sess.paper_text || sess.paper_json) {
          const title = (sess.paper_json?.title || sess.analysis?.title || 'Research_Paper').replace(/\s+/g, '_');
          setResult({
            paper_json: sess.paper_json,
            html_content: sess.html_content,
            paper_text: sess.paper_text,
            preview_html: `/api/preview/${sess.session_id}/html`,
            download_html: `/api/download/${sess.session_id}/html`,
            download_docx: `/api/download/${sess.session_id}/docx`,
            filename_html: `${title}.html`,
            filename_docx: `${title}.docx`,
          });
          setEditable(sess.paper_text || '');
          goStep(3);
        } else if (sess.ready) {
          setReady(true);
          setQuestion(null);
          setMessages([{ role: 'ai', text: 'Document analysis is ready for paper generation!' }]);
          goStep(3);
        } else {
          goStep(2);
        }
      } else {
        goStep(1);
      }
    } catch (err) {
      setError(`Could not restore session: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const currentDocInfo = file ? {
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    sections: analysis?.present_sections?.length || 0,
    qaCount: messages.filter(m => m.role === 'user').length,
  } : null;

  const handleReset = () => {
    evtSourceRef.current?.close();
    evtSourceResumeRef.current?.close();
    setFile(null);
    setSessionId(null);
    setAnalysis(null);
    setQuestion(null);
    setMessages([]);
    setReady(false);
    setGenerating(false);
    setLivePaper('');
    setResult(null);
    setEditMode(false);
    setEditable(null);
    setAiEditInput('');
    setAiEditing(false);
    setEditError('');
    setError('');

    // Reset resume state
    setMode('');
    setResumeQuestion(null);
    setResumeMessages([]);
    setResumeReady(false);
    setResumeGenerating(false);
    setLiveResume('');
    setResumeResult(null);
    setResumeEditMode(false);
    setResumeEditable('');
    setResumeAiEditInput('');
    setResumeAiEditing(false);
    setResumeCustomAnswer('');

    goStep(0);
  };

  return (
    <div className="flex flex-1 min-h-0 p-3 md:p-4 gap-3 md:gap-6">
      <Sidebar
        current={currentDocInfo}
        history={uploadHistory}
        onSelectDoc={handleSelectDoc}
        onReset={handleReset}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <div className={`flex-1 flex flex-col max-w-5xl w-full mx-auto min-h-0 ${(result || generating || resumeResult || resumeGenerating) ? 'py-0 space-y-0' : 'py-6 space-y-6'}`}>

          {!result && !generating && (
          <div className="flex justify-center items-center gap-0.5 md:gap-1 flex-wrap">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 text-xs font-mono transition-all duration-500 rounded-full"
                  style={
                    i === step
                      ? { backgroundColor: '#cc785c', color: '#ffffff', boxShadow: '0 2px 8px rgba(204,120,92,0.25)' }
                      : i < step
                      ? { backgroundColor: '#efe9de', color: '#141413' }
                      : { backgroundColor: 'transparent', color: '#6c6a64' }
                  }>
                  {i < step ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#cc785c" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] leading-none font-mono"
                      style={{ backgroundColor: i === step ? '#ffffff' : '#e6dfd8', color: i === step ? '#cc785c' : '#6c6a64' }}>
                      {i + 1}
                    </span>
                  )}
                  <span className="hidden sm:inline">{s}</span>
                </div>
                {i < steps.length - 1 && <div className="w-6 md:w-8 h-px bg-hairline shrink-0" />}
              </div>
            ))}
          </div>
          )}

          {error && (
            <div className="rounded-2xl p-4 text-sm border shrink-0"
              style={{ backgroundColor: '#fdf0ef', borderColor: '#e8b4b4', color: '#c64545' }}>{error}</div>
          )}

          {step === 0 && (
            <div className="space-y-4">
              <div
                className="rounded-2xl border-2 transition-all duration-300 cursor-pointer select-none flex flex-col items-center justify-center text-center"
                style={{
                  borderStyle: file ? 'solid' : 'dashed',
                  borderColor: dragOver ? '#cc785c' : file ? '#cc785c' : '#e6dfd8',
                  backgroundColor: file ? '#faf9f5' : dragOver ? 'rgba(204,120,92,0.04)' : '#efe9de',
                  padding: file ? '28px 24px' : '44px 32px',
                  transform: dragOver ? 'scale(1.01)' : 'scale(1)',
                  boxShadow: dragOver ? '0 0 0 4px rgba(204,120,92,0.12), 0 4px 20px rgba(0,0,0,0.06)' : 'none',
                }}
                onClick={() => fileRef.current?.click()}
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>

                {!file && (
                  <>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: '#e6dfd8', transform: dragOver ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.3s' }}>
                      <LogoMark size={28} />
                    </div>
                    <p className="text-base md:text-lg mb-1 font-medium" style={{ color: '#141413' }}>
                      {dragOver ? 'Release to upload' : 'Upload your research documents or resume'}
                    </p>
                    <p className="text-xs md:text-sm mb-5" style={{ color: '#6c6a64' }}>
                      Drag & drop or{' '}
                      <span style={{ color: '#cc785c', textDecoration: 'underline', textUnderlineOffset: '2px' }}>browse</span>
                      {' '}— PDF, DOCX, TXT, MD supported
                    </p>
                    <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 w-full max-w-lg mt-1">
                      {FORMAT_INFO.map(fmt => (
                        <div key={fmt.label} className="rounded-xl px-2 py-1.5 text-center" style={{ backgroundColor: '#e6dfd8' }}>
                          <p className="text-[11px] font-semibold" style={{ color: '#141413' }}>{fmt.label}</p>
                          <p className="text-[9px] mt-0.5 leading-tight" style={{ color: '#6c6a64' }}>{fmt.desc}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {file && (
                  <>
                    <div className="w-full max-w-md mb-4">
                      <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-left"
                        style={{ backgroundColor: 'rgba(204,120,92,0.06)', border: '1px solid rgba(204,120,92,0.15)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cc785c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate font-medium" style={{ color: '#141413' }}>{file.name}</p>
                          <p className="text-xs" style={{ color: '#6c6a64' }}>{formatSize(file.size)}</p>
                        </div>
                        <button onClick={e => { e.stopPropagation(); setFile(null); }}
                          className="text-xs hover:opacity-70 shrink-0" style={{ color: '#c64545' }}>✕</button>
                      </div>
                    </div>
                    <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} />
                    <button onClick={e => { e.stopPropagation(); handleUpload(); }} disabled={loading}
                      className="rounded-full text-sm font-medium px-5 py-2.5 bg-primary text-white transition-all active:scale-[0.95] disabled:opacity-40 disabled:cursor-not-allowed">
                      {loading ? <>Uploading<TypingDots /></> : 'Upload & Analyze'}
                    </button>
                  </>
                )}
              </div>

              {/* Quick Sample Loaders & Format Guidelines */}
              <div className="rounded-2xl border p-4 md:p-5 bg-surface-card border-hairline shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm md:text-base font-semibold text-ink flex items-center gap-2">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cc785c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      Required Document Format & 1-Click Samples
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      Generate instantly using pre-configured benchmark samples, or review required inputs below.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleLoadSample('paper', true)}
                      disabled={loading || generating}
                      className="text-xs font-semibold px-4 py-2 rounded-full bg-gradient-to-r from-primary to-accent-teal text-white shadow-md transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <span>⚡</span> One-Click Demo: Instant 4-Page IEEE Paper
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadSample('paper')}
                      disabled={loading}
                      className="text-xs font-medium px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      <span>📄</span> Load Sample IEEE Paper (4-Page)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadSample('resume')}
                      disabled={loading}
                      className="text-xs font-medium px-3 py-1.5 rounded-full bg-primary text-white hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      <span>👤</span> Load Sample Resume (1-Page)
                    </button>
                  </div>
                </div>

                {/* Mode Guidelines Tabs */}
                <div className="flex gap-4 border-b border-hairline mb-3">
                  <button
                    type="button"
                    onClick={() => setGuidelineTab('ieee')}
                    className={`text-xs font-mono pb-2 px-1 transition-all ${
                      guidelineTab === 'ieee'
                        ? 'border-b-2 border-primary text-primary font-semibold'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    IEEE Research Paper (4+ Pages Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuidelineTab('resume')}
                    className={`text-xs font-mono pb-2 px-1 transition-all ${
                      guidelineTab === 'resume'
                        ? 'border-b-2 border-primary text-primary font-semibold'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    Professional Resume (1-Page ATS Standard)
                  </button>
                </div>

                {guidelineTab === 'ieee' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-canvas border border-hairline">
                      <p className="font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                        Required Fields
                      </p>
                      <ul className="space-y-1 text-muted leading-relaxed">
                        <li>• <strong>Paper Title</strong> & Technical Domain</li>
                        <li>• <strong>Authors & Affiliation</strong> with email</li>
                        <li>• <strong>Abstract</strong> (150–250 words summary)</li>
                        <li>• <strong>Methodology</strong> or Architecture spec</li>
                        <li>• <strong>Citations</strong> (3–8 prior art references)</li>
                      </ul>
                    </div>
                    <div className="p-3 rounded-xl bg-canvas border border-hairline">
                      <p className="font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                        Recommended for 4+ Pages
                      </p>
                      <ul className="space-y-1 text-muted leading-relaxed">
                        <li>• Mathematical equations & model formulas</li>
                        <li>• Benchmark comparative data & tables</li>
                        <li>• Figures/diagrams or architectural charts</li>
                        <li>• Hardware constraints (RAM, CPU, latency)</li>
                        <li>• Comprehensive notes (&gt;1,200 words)</li>
                      </ul>
                    </div>
                    <div className="p-3 rounded-xl bg-canvas border border-hairline">
                      <p className="font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                        AI Edit & Academic Tools
                      </p>
                      <ul className="space-y-1 text-muted leading-relaxed">
                        <li>• <strong>Tone Polishing</strong> (formal IEEE academic style)</li>
                        <li>• <strong>Literature Search</strong> (live arXiv / CrossRef)</li>
                        <li>• <strong>Auto-Literature</strong> (1-click reference injection)</li>
                        <li>• <strong>Audit Compliance</strong> (page count & citations)</li>
                        <li>• Direct section markdown & DOCX/PDF export</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-canvas border border-hairline">
                      <p className="font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                        Required Fields
                      </p>
                      <ul className="space-y-1 text-muted leading-relaxed">
                        <li>• <strong>Candidate Name</strong> (Header title)</li>
                        <li>• <strong>Contact Info</strong> (Email, Phone, Location)</li>
                        <li>• <strong>Professional Summary</strong> (2-4 sentences)</li>
                        <li>• <strong>Work Experience</strong> (Role, Company, Dates)</li>
                        <li>• <strong>Education</strong> (Degree, University, Year)</li>
                      </ul>
                    </div>
                    <div className="p-3 rounded-xl bg-canvas border border-hairline">
                      <p className="font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                        High-Impact Additions
                      </p>
                      <ul className="space-y-1 text-muted leading-relaxed">
                        <li>• Quantified bullet points (e.g. "improved 40%")</li>
                        <li>• <strong>Categorized Skills</strong> (Languages, Cloud, Tools)</li>
                        <li>• <strong>Key Projects</strong> with tech stack & links</li>
                        <li>• Certifications, awards & licenses</li>
                        <li>• GitHub and LinkedIn profile handles</li>
                      </ul>
                    </div>
                    <div className="p-3 rounded-xl bg-canvas border border-hairline">
                      <p className="font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                        AI Edit & ATS Features
                      </p>
                      <ul className="space-y-1 text-muted leading-relaxed">
                        <li>• <strong>ATS-Optimized Formatting</strong> (clean single column)</li>
                        <li>• <strong>Prompt-Based AI Edits</strong> (e.g. "make more senior")</li>
                        <li>• <strong>Zero Text Overlap</strong> in generated PDF</li>
                        <li>• Live Markdown & HTML split preview</li>
                        <li>• Instant high-res PDF & HTML export</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 1 && !loading && !analysis && (
            <div className="rounded-2xl border transition-all duration-200 bg-surface-card border-hairline">
              <div className="p-5 md:p-8 text-center">
                <h2 className="text-xl md:text-2xl font-display mb-2 font-normal text-ink" style={{ letterSpacing: '-0.5px' }}>Choose your output</h2>
                <p className="text-sm text-muted mb-6">What would you like to generate from this document?</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button onClick={() => handleSelectMode('resume')}
                    className="rounded-full text-sm font-medium px-6 py-3 bg-primary text-white transition-all active:scale-[0.95] hover:shadow-md">
                    Generate Resume
                  </button>
                  <button onClick={() => handleSelectMode('ieee')}
                    className="rounded-full text-sm font-medium px-6 py-3 border border-hairline text-ink transition-all active:scale-[0.95] hover:bg-canvas">
                    Generate IEEE Paper
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 1 && !loading && analysis && mode === 'ieee' && (
            <div className="rounded-2xl border transition-all duration-200 bg-surface-card border-hairline">
              <div className="p-5 md:p-8">
                <h2 className="text-xl md:text-2xl font-display mb-4 font-normal text-ink" style={{ letterSpacing: '-0.5px' }}>Analysis complete</h2>

                {typeof analysis.completeness_score === 'number' && (
                  <div className="mb-6">
                    <div className="flex justify-between mb-1.5">
                      <p className="text-xs font-mono uppercase text-muted">Completeness</p>
                      <p className="text-xs font-mono text-muted">{analysis.completeness_score}%</p>
                    </div>
                    <div className="h-2 rounded-full bg-canvas border border-hairline overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, analysis.completeness_score))}%`,
                          backgroundColor: analysis.completeness_score >= 70 ? '#4a9d6f' : analysis.completeness_score >= 40 ? '#d9a13b' : '#c64545' }} />
                    </div>
                    <p className="text-xs mt-1.5 text-muted">
                      {analysis.completeness_score >= 70 ? 'Well structured — just a few questions to verify accuracy.' :
                        analysis.completeness_score >= 40 ? 'Readable, but some key details are missing or unclear.' :
                        'Mostly notes — the interview will gather what the document lacks.'}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="rounded-2xl p-4 border border-hairline bg-canvas">
                    <p className="text-xs font-mono uppercase mb-1 text-muted">Title</p>
                    <p className="font-medium text-ink">{analysis.title || 'Auto-detected'}</p>
                  </div>
                  <div className="rounded-2xl p-4 border border-hairline bg-canvas">
                    <p className="text-xs font-mono uppercase mb-1 text-muted">Domain</p>
                    <p className="font-medium text-ink">{analysis.domain || 'General'}</p>
                  </div>
                </div>

                {analysis.abstract_summary && (
                  <div className="mb-6">
                    <p className="text-xs font-mono uppercase mb-2 text-muted">What the document is about</p>
                    <p className="text-sm text-ink leading-relaxed">{analysis.abstract_summary}</p>
                  </div>
                )}

                {analysis.key_claims?.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-mono uppercase mb-2 text-muted">Key Claims</p>
                    <div className="space-y-2">
                      {analysis.key_claims.map((c, i) => (
                        <div key={i} className="rounded-xl px-4 py-3 bg-canvas border border-hairline">
                          <p className="text-sm text-ink">{typeof c === 'string' ? c : c.claim}</p>
                          {typeof c === 'object' && c.evidence && (
                            <p className="text-xs mt-1 text-muted italic">&ldquo;{c.evidence}&rdquo;</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.key_findings?.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-mono uppercase mb-2 text-muted">Key Findings</p>
                    <div className="space-y-2">
                      {analysis.key_findings.map((f, i) => (
                        <div key={i} className="rounded-xl px-4 py-3 bg-canvas border border-hairline">
                          <p className="text-sm text-ink">{typeof f === 'string' ? f : f.finding}</p>
                          {typeof f === 'object' && f.evidence && (
                            <p className="text-xs mt-1 text-muted italic">&ldquo;{f.evidence}&rdquo;</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.present_sections && (
                  <div className="mb-6">
                    <p className="text-xs font-mono uppercase mb-2 text-muted">Detected Sections</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.present_sections.map(s => (
                        <span key={s} className="px-3 py-1 text-sm rounded-full bg-canvas border border-hairline text-muted">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {(analysis.missing_info?.length > 0 || analysis.missing_sections?.length > 0) && (
                  <div className="mb-6">
                    <p className="text-xs font-mono uppercase mb-2 text-muted">Missing Information</p>
                    <div className="flex flex-wrap gap-2">
                      {(analysis.missing_info || analysis.missing_sections || []).map(m => (
                        <span key={m} className="px-3 py-1 text-sm rounded-full"
                          style={{ backgroundColor: '#fdf0ef', border: '1px solid #e8b4b4', color: '#c64545' }}>{m}</span>
                      ))}
                    </div>
                  </div>
                )}

                {((analysis.uncertainties?.length > 0) || (analysis.needs_clarification?.length > 0)) && (
                  <div className="mb-6">
                    <p className="text-xs font-mono uppercase mb-2 text-muted">Will ask you about</p>
                    <div className="space-y-2">
                      {(analysis.uncertainties || []).map((u, i) => (
                        <div key={`u-${i}`} className="rounded-xl px-4 py-3 border"
                          style={{ backgroundColor: '#fffbef', borderColor: '#ecd9a8' }}>
                          <p className="text-sm text-ink">{typeof u === 'string' ? u : (u.question || u.topic)}</p>
                          {typeof u === 'object' && u.evidence && (
                            <p className="text-xs mt-1 text-muted italic">Document says: &ldquo;{u.evidence}&rdquo;</p>
                          )}
                        </div>
                      ))}
                      {(analysis.needs_clarification || []).map((n, i) => (
                        <div key={`n-${i}`} className="rounded-xl px-4 py-3 border"
                          style={{ backgroundColor: '#fffbef', borderColor: '#ecd9a8' }}>
                          <p className="text-sm text-ink">{typeof n === 'string' ? n : (n.question || n.topic)}</p>
                          {typeof n === 'object' && n.reason && (
                            <p className="text-xs mt-1 text-muted">{n.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.terminology?.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-mono uppercase mb-2 text-muted">Terminology</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.terminology.map(t => (
                        <span key={t} className="px-3 py-1 text-sm rounded-full border border-hairline text-ink opacity-80">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.data_points?.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-mono uppercase mb-2 text-muted">Data Points Found</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.data_points.map(d => (
                        <span key={d} className="px-3 py-1 text-sm rounded-full" style={{ backgroundColor: '#eef4ef', border: '1px solid #cfe2d4', color: '#2f6d4f' }}>{d}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 1 && loading && (
            <div className="rounded-2xl p-8 border animate-pulse bg-surface-card border-hairline">
              <div className="h-6 w-48 rounded-full mb-4 bg-hairline" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="h-20 rounded-2xl bg-hairline" />
                <div className="h-20 rounded-2xl bg-hairline" />
              </div>
              <div className="h-8 w-32 rounded-full bg-hairline" />
            </div>
          )}

          {mode !== 'resume' && (step === 2 || (step === 1 && question)) && !ready && (
            <div className="flex flex-col border rounded-2xl overflow-hidden flex-1 min-h-0 bg-canvas border-hairline"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <div className="px-4 md:px-6 py-3 border-b border-hairline text-sm shrink-0 flex items-center gap-2 text-muted">
                <span className="w-2 h-2 rounded-full bg-accent-teal" />
                <span className="hidden sm:inline">AI Interview —</span> answering questions
              </div>
              <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-4" style={{ scrollBehavior: 'smooth' }}>
                {messages.length === 0 && !aiTyping && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted">
                    <span className="w-12 h-12 rounded-full flex items-center justify-center mb-3 text-lg bg-surface-card">💬</span>
                    <p className="text-sm">The interview will begin after analysis.</p>
                  </div>
                )}
                {messages.map((m, i) => {
                  const prevRole = i > 0 ? messages[i-1].role : null;
                  const isConsecutive = m.role === prevRole;
                  return (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} ${isConsecutive ? 'mt-1' : 'mt-4'} ${i === messages.length - 1 ? 'animate-fadeIn' : ''}`}>
                      <div className="flex items-start gap-2 max-w-[80%]">
                        {m.role === 'ai' && (
                          <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold bg-primary text-white">AI</span>
                        )}
                        <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
                          style={m.role === 'user'
                            ? { backgroundColor: 'var(--primary)', color: '#ffffff', borderBottomRightRadius: '6px' }
                            : { backgroundColor: 'var(--surface-card)', color: '#252523', borderBottomLeftRadius: '6px' }}>
                          {m.text.split('\n').map((l, j) => (
                            <p key={j} className={j > 0 ? 'mt-2' : ''}>{l}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {aiTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold bg-primary text-white">AI</span>
                      <div className="rounded-2xl px-4 py-3 bg-surface-card" style={{ borderBottomLeftRadius: '6px' }}>
                        <TypingDots />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEnd} />
              </div>
              <div className="px-4 md:px-6 py-4 border-t border-hairline shrink-0 bg-canvas">
                {showFollowUp && question && (
                  <div className="mb-3 p-4 rounded-2xl border" style={{ backgroundColor: '#fdf0ef', borderColor: '#e8b4b4' }}>
                    <p className="text-xs font-mono uppercase flex items-center gap-1.5 mb-2 text-error">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      Clarify: {followUp?.follow_up?.replace(/\*\*(.*?)\*\*/g, '$1')}
                    </p>
                    {followUp?.options?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {followUp.options.map((o, i) => (
                          <button key={i} onClick={() => handleFollowUpAnswer(o)} disabled={loading}
                            className="rounded-full text-sm px-4 py-2 transition-all active:scale-[0.95] hover:opacity-85 bg-canvas border border-hairline text-ink">
                            {o}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input className="flex-1 rounded-full px-4 py-2 text-sm outline-none border transition-all duration-200 bg-canvas text-ink"
                        style={{ borderColor: '#e8b4b4', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)' }}
                        placeholder="Type your answer..."
                        value={customFollowUp} onChange={e => setCustomFollowUp(e.target.value)}
                        onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(204,120,92,0.15)'; }}
                        onBlur={e => { e.target.style.borderColor = '#e8b4b4'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.04)'; }}
                        onKeyDown={e => e.key === 'Enter' && handleFollowUpAnswer(customFollowUp)} />
                      <button onClick={() => handleFollowUpAnswer(customFollowUp)} disabled={loading || !customFollowUp.trim()}
                        className="rounded-full text-sm font-medium px-4 py-2 bg-error text-white transition-all active:scale-[0.95] disabled:opacity-40">
                        Send
                      </button>
                    </div>
                  </div>
                )}
                {question && !showFollowUp && (
                  <div>
                    <p className="text-xs font-mono uppercase mb-2.5 flex items-center gap-1.5 text-muted">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      {question.options?.length > 0 ? 'Choose an option or type a custom answer' : 'Type your answer'}
                    </p>
                    {question.options?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {question.options.map((o, i) => (
                          <button key={i} onClick={() => answerQuestion(o)} disabled={loading}
                            className="rounded-full text-sm px-4 py-2 transition-all active:scale-[0.95] hover:opacity-85 bg-canvas border border-hairline text-ink">
                            {o}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input className="flex-1 rounded-full px-5 py-2.5 text-sm outline-none border transition-all duration-200 bg-canvas border-hairline text-ink"
                        style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)' }}
                        placeholder={question.options?.length > 0 ? 'Or type a custom answer...' : 'Type your answer...'}
                        value={customAnswer} onChange={e => setCustomAnswer(e.target.value)}
                        onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(204,120,92,0.15)'; }}
                        onBlur={e => { e.target.style.borderColor = 'var(--hairline)'; e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.04)'; }}
                        onKeyDown={e => e.key === 'Enter' && answerQuestion(customAnswer)} />
                      <button onClick={() => answerQuestion(customAnswer)} disabled={loading || !customAnswer.trim()}
                        className="rounded-full text-sm font-medium px-5 py-2.5 bg-primary text-white transition-all active:scale-[0.95] disabled:opacity-40">
                        Send
                      </button>
                    </div>
                  </div>
                )}
                {!question && !showFollowUp && messages.length > 0 && (
                  <p className="text-xs text-center text-muted">Waiting for AI response...</p>
                )}
              </div>
            </div>
          )}

          {mode !== 'resume' && (step === 3 || ready) && !result && !generating && (
            <div className="rounded-2xl border transition-all duration-200 bg-surface-card border-hairline">
              <div className="p-5 md:p-8 text-center">
                <p className="text-base md:text-lg mb-4 font-display text-ink" style={{ letterSpacing: '-0.3px' }}>Ready to generate your paper</p>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className="text-xs font-mono uppercase text-muted">Format:</span>
                  <button onClick={() => setSelectedFormat('procomm')}
                    className={`rounded-full text-sm font-medium px-4 py-1.5 transition-all active:scale-[0.95] ${selectedFormat === 'procomm' ? 'bg-primary text-white' : 'bg-canvas text-muted border border-hairline'}`}>
                    IEEE ProComm
                  </button>
                  <button onClick={() => setSelectedFormat('iemt')}
                    className={`rounded-full text-sm font-medium px-4 py-1.5 transition-all active:scale-[0.95] ${selectedFormat === 'iemt' ? 'bg-primary text-white' : 'bg-canvas text-muted border border-hairline'}`}>
                    IEMT
                  </button>
                </div>
                <button onClick={() => handleGenerate()}
                  className="rounded-full text-sm font-medium px-5 py-2.5 bg-primary text-white transition-all active:scale-[0.95]">
                  Generate Paper
                </button>
              </div>
            </div>
          )}

          {generating && (
            <div className="flex flex-col border rounded-2xl overflow-hidden bg-surface-dark border-surface-dark-elevated min-h-0"
              style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.15)', maxHeight: 'calc(100vh - 180px)' }}>
              <div className="px-5 py-3 border-b border-surface-dark-elevated shrink-0 flex items-center gap-2 text-muted">
                <span className="w-2 h-2 rounded-full animate-pulse bg-accent-teal" />
                <span className="text-xs font-mono">Generating paper</span>
                <TypingDots />
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <pre className="text-sm whitespace-pre-wrap font-serif leading-relaxed" style={{ color: '#d4d0c8' }}>
                  {livePaper || <span className="text-muted">Waiting for response...</span>}
                </pre>
              </div>
            </div>
          )}

          {/* ─── Resume interview (step 2, mode=resume) ──────────────────── */}
          {mode === 'resume' && (step === 2 || (step === 1 && resumeQuestion)) && !resumeReady && (
            <div className="flex flex-col border rounded-2xl overflow-hidden flex-1 min-h-0 bg-canvas border-hairline"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <div className="px-4 md:px-6 py-3 border-b border-hairline text-sm shrink-0 flex items-center gap-2 text-muted">
                <span className="w-2 h-2 rounded-full bg-accent-teal" />
                <span className="hidden sm:inline">Resume Interview —</span> answering questions
              </div>
              <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-4" style={{ scrollBehavior: 'smooth' }}>
                {resumeMessages.map((m, i) => {
                  const prevRole = i > 0 ? resumeMessages[i-1].role : null;
                  const isConsecutive = m.role === prevRole;
                  return (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} ${isConsecutive ? 'mt-1' : 'mt-4'} ${i === resumeMessages.length - 1 ? 'animate-fadeIn' : ''}`}>
                      <div className="flex items-start gap-2 max-w-[80%]">
                        {m.role === 'ai' && (
                          <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold bg-primary text-white">AI</span>
                        )}
                        <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
                          style={m.role === 'user'
                            ? { backgroundColor: 'var(--primary)', color: '#ffffff', borderBottomRightRadius: '6px' }
                            : { backgroundColor: 'var(--surface-card)', color: '#252523', borderBottomLeftRadius: '6px' }}>
                          {m.text.split('\n').map((l, j) => (
                            <p key={j} className={j > 0 ? 'mt-2' : ''}>{l}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {aiTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold bg-primary text-white">AI</span>
                      <div className="rounded-2xl px-4 py-3 bg-surface-card" style={{ borderBottomLeftRadius: '6px' }}>
                        <TypingDots />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEnd} />
              </div>
              <div className="px-4 md:px-6 py-4 border-t border-hairline shrink-0 bg-canvas">
                {resumeQuestion && (
                  <div>
                    <p className="text-xs font-mono uppercase mb-2.5 flex items-center gap-1.5 text-muted">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      {resumeQuestion.options?.length > 0 ? 'Choose an option or type a custom answer' : 'Type your answer'}
                    </p>
                    {resumeQuestion.options?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {resumeQuestion.options.map((o, i) => (
                          <button key={i} onClick={() => answerResumeQuestion(o)} disabled={loading}
                            className="rounded-full text-sm px-4 py-2 transition-all active:scale-[0.95] hover:opacity-85 bg-canvas border border-hairline text-ink">
                            {o}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input className="flex-1 rounded-full px-5 py-2.5 text-sm outline-none border transition-all duration-200 bg-canvas border-hairline text-ink"
                        style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)' }}
                        placeholder={resumeQuestion.options?.length > 0 ? 'Or type a custom answer...' : 'Type your answer...'}
                        value={resumeCustomAnswer} onChange={e => setResumeCustomAnswer(e.target.value)}
                        onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(204,120,92,0.15)'; }}
                        onBlur={e => { e.target.style.borderColor = 'var(--hairline)'; e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.04)'; }}
                        onKeyDown={e => e.key === 'Enter' && answerResumeQuestion(resumeCustomAnswer)} />
                      <button onClick={() => answerResumeQuestion(resumeCustomAnswer)} disabled={loading || !resumeCustomAnswer.trim()}
                        className="rounded-full text-sm font-medium px-5 py-2.5 bg-primary text-white transition-all active:scale-[0.95] disabled:opacity-40">
                        Send
                      </button>
                    </div>
                  </div>
                )}
                {!resumeQuestion && resumeMessages.length > 0 && (
                  <p className="text-xs text-center text-muted">Waiting for AI response...</p>
                )}
              </div>
            </div>
          )}

          {/* ─── Resume ready to generate (step 3, mode=resume) ──────────── */}
          {mode === 'resume' && (step === 3 || resumeReady) && !resumeResult && !resumeGenerating && (
            <div className="rounded-2xl border transition-all duration-200 bg-surface-card border-hairline">
              <div className="p-5 md:p-8 text-center">
                <p className="text-base md:text-lg mb-4 font-display text-ink" style={{ letterSpacing: '-0.3px' }}>Ready to generate your resume</p>
                <button onClick={() => handleResumeGenerate()}
                  className="rounded-full text-sm font-medium px-5 py-2.5 bg-primary text-white transition-all active:scale-[0.95]">
                  Generate Resume
                </button>
              </div>
            </div>
          )}

          {/* ─── Resume generating ────────────────────────────────────────── */}
          {mode === 'resume' && resumeGenerating && (
            <div className="flex flex-col border rounded-2xl overflow-hidden bg-surface-dark border-surface-dark-elevated min-h-0"
              style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.15)', maxHeight: 'calc(100vh - 180px)' }}>
              <div className="px-5 py-3 border-b border-surface-dark-elevated shrink-0 flex items-center gap-2 text-muted">
                <span className="w-2 h-2 rounded-full animate-pulse bg-accent-teal" />
                <span className="text-xs font-mono">Generating resume</span>
                <TypingDots />
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed" style={{ color: '#d4d0c8' }}>
                  {liveResume || <span className="text-muted">Waiting for response...</span>}
                </pre>
              </div>
            </div>
          )}

          {result && mode !== 'resume' && (
            <div className="flex flex-col rounded-2xl border bg-surface-dark border-surface-dark-elevated overflow-hidden min-h-0"
              style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.15)', maxHeight: 'calc(100vh - 180px)' }}>
              <div className="px-5 md:px-8 py-4 border-b border-surface-dark-elevated shrink-0 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-display text-on-dark flex items-center gap-2">
                    Paper generated <span className="text-accent-teal">✓</span>
                  </h2>
                  {auditData && (
                    <button
                      onClick={() => setShowAuditModal(true)}
                      className={`rounded-full px-3 py-1 text-xs font-mono font-medium inline-flex items-center gap-1.5 transition-all active:scale-[0.95] ${
                        auditData.score >= 80
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                          : auditData.score >= 65
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                          : 'bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25'
                      }`}
                      title="Click to view IEEE Compliance Audit diagnostics">
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {auditData.score}% IEEE Quality Score ({auditData.grade?.split(' ')[0]})
                    </button>
                  )}
                  {auditing && (
                    <span className="text-xs text-muted font-mono flex items-center gap-1">
                      <TypingDots /> Auditing compliance...
                    </span>
                  )}
                  {enhanceSuccessMsg && (
                    <span className="text-xs text-emerald-400 font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      {enhanceSuccessMsg}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setShowLitSearchModal(true);
                      if (litResults.length === 0) handleAutoPopulateLiterature();
                    }}
                    className="rounded-full text-xs md:text-sm font-medium px-3.5 py-1.5 transition-all active:scale-[0.95] inline-flex items-center gap-1.5 bg-surface-dark-elevated text-on-dark border border-surface-dark-elevated hover:border-accent-teal/50 hover:text-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    Find Literature
                  </button>

                  <button
                    onClick={() => handleEnhanceAbstract('tighten_abstract')}
                    disabled={enhancing}
                    className="rounded-full text-xs md:text-sm font-medium px-3.5 py-1.5 transition-all active:scale-[0.95] inline-flex items-center gap-1.5 bg-surface-dark-elevated text-on-dark border border-surface-dark-elevated hover:border-primary/50 hover:text-white disabled:opacity-50">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    {enhancing ? 'Polishing…' : 'Refine Abstract'}
                  </button>

                  {!editMode && (
                    <button onClick={enterEdit}
                      className="rounded-full text-sm font-medium px-4 py-1.5 transition-all active:scale-[0.95] inline-flex items-center gap-1.5 border border-surface-dark-elevated text-muted hover:border-on-dark-soft hover:text-white">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Edit Document
                    </button>
                  )}
                  <a href={apiService.getDownloadUrl(sessionId, "pdf", selectedFormat)}
                    className="rounded-full text-sm font-medium px-4 py-1.5 transition-all active:scale-[0.95] inline-flex items-center gap-1.5 bg-primary text-white"
                    download={result.filename_html.replace('.html', '.pdf')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    Download PDF
                  </a>
                  <a href={apiService.getDownloadUrl(sessionId, "docx")}
                    className="rounded-full text-sm font-medium px-4 py-1.5 border transition-all active:scale-[0.95] border-surface-dark-elevated text-muted hover:border-on-dark-soft hover:text-white"
                    download={result.filename_docx || result.filename_html.replace('.html', '.docx')}>
                    Download DOCX
                  </a>
                </div>
              </div>

              {editMode && editable ? (
                <div className="flex-1 min-h-0 overflow-y-auto p-5 md:p-8 space-y-6">
                  <div>
                    <p className="text-xs font-mono uppercase mb-1.5 text-muted">Title</p>
                    <input className="w-full rounded-xl px-4 py-2.5 text-sm outline-none bg-surface-dark-elevated text-on-dark border border-transparent focus:border-primary"
                      value={editable.title} onChange={e => updateEditable({ title: e.target.value })} />
                  </div>

                  <div>
                    <p className="text-xs font-mono uppercase mb-2 text-muted">Authors</p>
                    <div className="space-y-2">
                      {editable.authors.map((a, i) => (
                        <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input className="rounded-xl px-3 py-2 text-sm outline-none bg-surface-dark-elevated text-on-dark border border-transparent focus:border-primary" placeholder="Name"
                            value={a.name} onChange={e => updateAuthor(i, { name: e.target.value })} />
                          <input className="rounded-xl px-3 py-2 text-sm outline-none bg-surface-dark-elevated text-on-dark border border-transparent focus:border-primary" placeholder="Affiliation"
                            value={a.affiliation} onChange={e => updateAuthor(i, { affiliation: e.target.value })} />
                          <input className="rounded-xl px-3 py-2 text-sm outline-none bg-surface-dark-elevated text-on-dark border border-transparent focus:border-primary" placeholder="Email"
                            value={a.email} onChange={e => updateAuthor(i, { email: e.target.value })} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-mono uppercase text-muted">Abstract</p>
                      <button
                        type="button"
                        onClick={() => handleEnhanceAbstract('tighten_abstract')}
                        disabled={enhancing}
                        className="text-xs text-primary hover:underline flex items-center gap-1 disabled:opacity-40">
                        ✨ Polish Abstract with IEEE Guidelines
                      </button>
                    </div>
                    <textarea className="w-full rounded-xl px-4 py-3 text-sm outline-none bg-surface-dark-elevated text-on-dark border border-transparent focus:border-primary resize-y min-h-[90px]"
                      value={editable.abstract} onChange={e => updateEditable({ abstract: e.target.value })} />
                  </div>

                  <div>
                    <p className="text-xs font-mono uppercase mb-1.5 text-muted">Index Terms (comma separated)</p>
                    <input className="w-full rounded-xl px-4 py-2.5 text-sm outline-none bg-surface-dark-elevated text-on-dark border border-transparent focus:border-primary"
                      value={editable.keywords} onChange={e => updateEditable({ keywords: e.target.value })} />
                  </div>

                  <div>
                    <p className="text-xs font-mono uppercase mb-2 text-muted">Sections</p>
                    <div className="space-y-4">
                      {editable.sections.map((s, i) => (
                        <div key={i} className="rounded-xl p-4 border border-surface-dark-elevated">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <input className="flex-1 min-w-[200px] rounded-lg px-3 py-2 text-sm font-medium outline-none bg-surface-dark text-on-dark border border-transparent focus:border-primary"
                              value={s.title} onChange={e => updateSection(i, { title: e.target.value })} />
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleEnhanceSectionInEdit(i, 'academic_tone')}
                                disabled={enhancing}
                                className="px-2.5 py-1 text-xs rounded-lg bg-surface-dark-elevated hover:bg-surface-dark-elevated/80 text-muted hover:text-white border border-surface-dark-elevated transition-all"
                                title="Upgrade section to formal IEEE academic register">
                                ✨ Tone
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEnhanceSectionInEdit(i, 'latex_equations')}
                                disabled={enhancing}
                                className="px-2.5 py-1 text-xs rounded-lg bg-surface-dark-elevated hover:bg-surface-dark-elevated/80 text-muted hover:text-white border border-surface-dark-elevated transition-all"
                                title="Format mathematical relations into numbered LaTeX equations">
                                📐 LaTeX
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEnhanceSectionInEdit(i, 'strengthen_methodology')}
                                disabled={enhancing}
                                className="px-2.5 py-1 text-xs rounded-lg bg-surface-dark-elevated hover:bg-surface-dark-elevated/80 text-muted hover:text-white border border-surface-dark-elevated transition-all"
                                title="Strengthen formal methodology and algorithmic parameters">
                                🔬 Method
                              </button>
                            </div>
                          </div>
                          <textarea className="w-full rounded-lg px-3 py-2 text-sm outline-none bg-surface-dark text-on-dark border border-transparent focus:border-primary resize-y min-h-[100px]"
                            value={s.content} onChange={e => updateSection(i, { content: e.target.value })} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-mono uppercase text-muted">References</p>
                      <button
                        type="button"
                        onClick={() => setShowLitSearchModal(true)}
                        className="text-xs text-accent-teal hover:underline flex items-center gap-1">
                        + Search & Add Citations
                      </button>
                    </div>
                    <div className="space-y-2">
                      {editable.references.map((r, i) => (
                        <textarea key={i} className="w-full rounded-xl px-3 py-2 text-sm outline-none bg-surface-dark-elevated text-on-dark border border-transparent focus:border-primary resize-y min-h-[48px]"
                          value={r} onChange={e => updateReference(i, e.target.value)} />
                      ))}
                    </div>
                  </div>

                  {editError && (
                    <div className="rounded-xl p-3 text-sm border" style={{ backgroundColor: '#fdf0ef', borderColor: '#e8b4b4', color: '#c64545' }}>{editError}</div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button onClick={handleSave} disabled={saving}
                      className="rounded-full text-sm font-medium px-5 py-2.5 bg-primary text-white transition-all active:scale-[0.95] disabled:opacity-40">
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button onClick={() => setEditMode(false)} disabled={saving}
                      className="rounded-full text-sm font-medium px-5 py-2.5 border border-surface-dark-elevated text-muted hover:text-white transition-all active:scale-[0.95] disabled:opacity-40">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-0">
                  <iframe
                    key={previewKey}
                    src={result?.preview_html || apiService.getDownloadUrl(sessionId, "html")}
                    className="w-full h-full border-0"
                    title="Paper Preview"
                  />
                </div>
              )}

              <div className="px-5 md:px-8 py-4 border-t border-surface-dark-elevated shrink-0 bg-surface-dark">
                <p className="text-xs font-mono uppercase mb-2 text-muted">Ask AI to edit</p>
                <div className="flex gap-2">
                  <input className="flex-1 rounded-full px-5 py-2.5 text-sm outline-none border transition-all duration-200 bg-surface-dark-elevated text-on-dark border-transparent focus:border-primary"
                    placeholder="e.g. Shorten the abstract, add a Limitations section, make the conclusion stronger"
                    value={aiEditInput} onChange={e => setAiEditInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAiEdit()} />
                  <button onClick={handleAiEdit} disabled={aiEditing || !aiEditInput.trim()}
                    className="rounded-full text-sm font-medium px-5 py-2.5 bg-primary text-white transition-all active:scale-[0.95] disabled:opacity-40 inline-flex items-center gap-1.5">
                    {aiEditing ? <>Editing<TypingDots /></> : 'Apply'}
                  </button>
                </div>
                {editError && !editMode && (
                  <div className="mt-2 rounded-xl p-3 text-sm border" style={{ backgroundColor: '#fdf0ef', borderColor: '#e8b4b4', color: '#c64545' }}>{editError}</div>
                )}
              </div>
            </div>
          )}

          {/* ─── Resume result / edit (mode=resume) ───────────────────────── */}
          {mode === 'resume' && resumeResult && (
            <div className="flex flex-col rounded-2xl border bg-surface-dark border-surface-dark-elevated overflow-hidden min-h-0"
              style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.15)', maxHeight: 'calc(100vh - 180px)' }}>
              <div className="px-5 md:px-8 py-4 border-b border-surface-dark-elevated shrink-0 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-display text-on-dark flex items-center gap-2">
                  Resume generated <span className="text-accent-teal">✓</span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  {!resumeEditMode && (
                    <button onClick={enterResumeEdit}
                      className="rounded-full text-sm font-medium px-4 py-1.5 transition-all active:scale-[0.95] inline-flex items-center gap-1.5 border border-surface-dark-elevated text-muted hover:border-on-dark-soft hover:text-white">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Edit Resume
                    </button>
                  )}
                  <a href={apiService.getResumeDownloadUrl(sessionId, "pdf")}
                    className="rounded-full text-sm font-medium px-4 py-1.5 transition-all active:scale-[0.95] inline-flex items-center gap-1.5 bg-primary text-white"
                    download={resumeResult.filename_html?.replace('.html', '.pdf')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    Download PDF
                  </a>
                  <a href={apiService.getResumeDownloadUrl(sessionId, "html")}
                    className="rounded-full text-sm font-medium px-4 py-1.5 border transition-all active:scale-[0.95] border-surface-dark-elevated text-muted hover:border-on-dark-soft hover:text-white"
                    download={resumeResult.filename_html}>
                    Download HTML
                  </a>
                </div>
              </div>

              {resumeEditMode ? (
                <div className="flex-1 min-h-0 overflow-y-auto p-5 md:p-8">
                  <textarea className="w-full h-full min-h-[400px] rounded-xl px-4 py-3 text-sm font-mono outline-none bg-surface-dark-elevated text-on-dark border border-transparent focus:border-primary resize-y"
                    value={resumeEditable} onChange={e => setResumeEditable(e.target.value)} />
                  {editError && (
                    <div className="mt-3 rounded-xl p-3 text-sm border" style={{ backgroundColor: '#fdf0ef', borderColor: '#e8b4b4', color: '#c64545' }}>{editError}</div>
                  )}
                  <div className="flex gap-2 pt-3">
                    <button onClick={handleResumeSave} disabled={resumeSaving}
                      className="rounded-full text-sm font-medium px-5 py-2.5 bg-primary text-white transition-all active:scale-[0.95] disabled:opacity-40">
                      {resumeSaving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button onClick={() => setResumeEditMode(false)} disabled={resumeSaving}
                      className="rounded-full text-sm font-medium px-5 py-2.5 border border-surface-dark-elevated text-muted hover:text-white transition-all active:scale-[0.95] disabled:opacity-40">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-0">
                  <iframe
                    key={resumePreviewKey}
                    src={`${BASE}/api/preview-resume/${sessionId}/html`}
                    className="w-full h-full border-0"
                    title="Resume Preview"
                  />
                </div>
              )}

              <div className="px-5 md:px-8 py-4 border-t border-surface-dark-elevated shrink-0 bg-surface-dark">
                <p className="text-xs font-mono uppercase mb-2 text-muted">Ask AI to edit</p>
                <div className="flex gap-2">
                  <input className="flex-1 rounded-full px-5 py-2.5 text-sm outline-none border transition-all duration-200 bg-surface-dark-elevated text-on-dark border-transparent focus:border-primary"
                    placeholder="e.g. Add more skills, shorten the summary, reorder sections"
                    value={resumeAiEditInput} onChange={e => setResumeAiEditInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleResumeAiEdit()} />
                  <button onClick={handleResumeAiEdit} disabled={resumeAiEditing || !resumeAiEditInput.trim()}
                    className="rounded-full text-sm font-medium px-5 py-2.5 bg-primary text-white transition-all active:scale-[0.95] disabled:opacity-40 inline-flex items-center gap-1.5">
                    {resumeAiEditing ? <>Editing<TypingDots /></> : 'Apply'}
                  </button>
                </div>
                {editError && !resumeEditMode && (
                  <div className="mt-2 rounded-xl p-3 text-sm border" style={{ backgroundColor: '#fdf0ef', borderColor: '#e8b4b4', color: '#c64545' }}>{editError}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── IEEE Compliance Audit Modal ────────────────────────────────────── */}
      {showAuditModal && auditData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-surface-dark border border-surface-dark-elevated shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-surface-dark-elevated flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                  IEEE
                </div>
                <div>
                  <h3 className="text-base font-semibold text-on-dark">IEEE Compliance & Quality Audit</h3>
                  <p className="text-xs text-muted">Automated peer-review standard diagnostics</p>
                </div>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="p-1.5 text-muted hover:text-white rounded-lg hover:bg-surface-dark-elevated transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Score Summary */}
              <div className="p-4 rounded-xl bg-surface-dark-elevated border border-surface-dark-elevated flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono uppercase text-muted">Quality Score</span>
                  <div className="text-3xl font-bold text-on-dark mt-0.5 flex items-baseline gap-2">
                    <span>{auditData.score}</span>
                    <span className="text-sm font-normal text-muted">/ 100</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                      auditData.score >= 80 ? 'bg-emerald-500/20 text-emerald-300' :
                      auditData.score >= 65 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {auditData.grade}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono uppercase text-muted">Status</span>
                  <p className={`text-sm font-semibold mt-1 ${auditData.passed ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {auditData.passed ? '✓ Publication Ready' : '⚠ Polish Recommended'}
                  </p>
                </div>
              </div>

              {/* Checks */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-muted mb-3">Diagnostic Checks</h4>
                <div className="space-y-2.5">
                  {auditData.checks?.map((chk) => (
                    <div key={chk.id} className="p-3.5 rounded-xl border bg-surface-dark-elevated/40 border-surface-dark-elevated">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            chk.status === 'pass' ? 'bg-emerald-400' :
                            chk.status === 'warning' ? 'bg-amber-400' : 'bg-rose-400'
                          }`} />
                          <span className="text-sm font-medium text-on-dark">{chk.name}</span>
                        </div>
                        <span className="text-xs font-mono text-muted">{chk.score}/{chk.max_score} pts</span>
                      </div>
                      <p className="text-xs text-muted-soft pl-4">{chk.message}</p>
                      {chk.recommendation && (
                        <p className="text-xs text-primary pl-4 mt-1">💡 {chk.recommendation}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Metrics */}
              {auditData.metrics && (
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider text-muted mb-3">Paper Metrics</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-3 rounded-xl bg-surface-dark-elevated/40 text-center">
                      <span className="text-xs text-muted">Abstract Words</span>
                      <p className="text-base font-bold text-on-dark mt-0.5">{auditData.metrics.abstract_word_count}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-dark-elevated/40 text-center">
                      <span className="text-xs text-muted">Index Terms</span>
                      <p className="text-base font-bold text-on-dark mt-0.5">{auditData.metrics.keyword_count}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-dark-elevated/40 text-center">
                      <span className="text-xs text-muted">Sections</span>
                      <p className="text-base font-bold text-on-dark mt-0.5">{auditData.metrics.section_count}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-dark-elevated/40 text-center">
                      <span className="text-xs text-muted">References</span>
                      <p className="text-base font-bold text-on-dark mt-0.5">{auditData.metrics.reference_count}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-surface-dark-elevated flex justify-end">
              <button
                onClick={() => setShowAuditModal(false)}
                className="rounded-full text-xs font-medium px-5 py-2 bg-primary text-white hover:opacity-90 transition-all">
                Close Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Academic Literature Search Modal ───────────────────────────────── */}
      {showLitSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-surface-dark border border-surface-dark-elevated shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-surface-dark-elevated flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-accent-teal/20 text-accent-teal flex items-center justify-center font-bold text-base">
                  🔍
                </div>
                <div>
                  <h3 className="text-base font-semibold text-on-dark">Academic Literature Search</h3>
                  <p className="text-xs text-muted">Search arXiv and CrossRef for verifiable citations</p>
                </div>
              </div>
              <button
                onClick={() => setShowLitSearchModal(false)}
                className="p-1.5 text-muted hover:text-white rounded-lg hover:bg-surface-dark-elevated transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none bg-surface-dark-elevated text-on-dark border border-surface-dark-elevated focus:border-primary"
                  placeholder="Enter keywords or paper title..."
                  value={litQuery}
                  onChange={e => setLitQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearchLiterature()}
                />
                <div className="flex gap-2">
                  <select
                    className="rounded-xl px-3 py-2 text-xs outline-none bg-surface-dark-elevated text-on-dark border border-surface-dark-elevated cursor-pointer"
                    value={litSource}
                    onChange={e => setLitSource(e.target.value)}>
                    <option value="all">All Sources</option>
                    <option value="arxiv">arXiv (Preprints)</option>
                    <option value="crossref">Crossref (Journals)</option>
                  </select>
                  <button
                    onClick={() => handleSearchLiterature()}
                    disabled={litSearching || !litQuery.trim()}
                    className="rounded-xl px-4 py-2 text-xs font-medium bg-primary text-white hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5">
                    {litSearching ? 'Searching…' : 'Search'}
                  </button>
                </div>
              </div>

              {/* 1-Click Auto-Discover */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-dark-elevated/40 border border-surface-dark-elevated">
                <span className="text-xs text-muted">Auto-discover papers matching your paper's topic:</span>
                <button
                  onClick={handleAutoPopulateLiterature}
                  disabled={litSearching}
                  className="text-xs font-medium text-accent-teal hover:underline disabled:opacity-40">
                  Auto-Discover Literature →
                </button>
              </div>

              {/* Results */}
              <div className="space-y-3">
                {litSearching && (
                  <div className="text-center py-10">
                    <TypingDots />
                    <p className="text-xs text-muted mt-2">Querying academic repositories...</p>
                  </div>
                )}

                {!litSearching && litResults.length === 0 && (
                  <div className="text-center py-8 text-muted text-xs">
                    No papers found. Enter a keyword or click Auto-Discover.
                  </div>
                )}

                {!litSearching && litResults.map((item, idx) => {
                  const itemKey = item.id || item.ieee_citation;
                  const isAdded = litAddedIds.has(itemKey);
                  return (
                    <div key={itemKey || idx} className="p-4 rounded-xl border border-surface-dark-elevated bg-surface-dark-elevated/40 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-dark text-muted border border-surface-dark-elevated">
                              {item.source} • {item.year}
                            </span>
                            {item.url && (
                              <a href={item.url} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline truncate">
                                View Paper ↗
                              </a>
                            )}
                          </div>
                          <h4 className="text-sm font-semibold text-on-dark">{item.title}</h4>
                          <p className="text-xs text-muted mt-0.5">{item.authors_display}</p>
                        </div>
                        <button
                          onClick={() => handleAddCitation(item.ieee_citation, itemKey)}
                          disabled={isAdded}
                          className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                            isAdded
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                              : 'bg-primary text-white hover:opacity-90 active:scale-[0.95]'
                          }`}>
                          {isAdded ? '✓ Added' : '+ Add to References'}
                        </button>
                      </div>
                      {item.summary && (
                        <p className="text-xs text-muted-soft line-clamp-2">{item.summary}</p>
                      )}
                      <div className="p-2 rounded-lg bg-surface-dark text-[11px] font-mono text-muted border border-surface-dark-elevated select-all">
                        {item.ieee_citation}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-surface-dark-elevated flex justify-between items-center">
              <span className="text-xs text-muted">Adding citations synchronizes the generated PDF, DOCX, and live preview.</span>
              <button
                onClick={() => setShowLitSearchModal(false)}
                className="rounded-full text-xs font-medium px-4 py-2 border border-surface-dark-elevated text-muted hover:text-white transition-all">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
