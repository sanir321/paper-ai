# DocOct — AI Research Paper Generator

Upload any document — AI extracts everything, interviews you on gaps, then generates either an IEEE-formatted research paper or a professional resume. Two modes, one upload.

## Live Demo

**[paper-ai-k2wg.onrender.com](https://paper-ai-k2wg.onrender.com)**

Single service — the Docker image builds the React frontend and serves it from FastAPI, so UI and API share one origin. Health check: `/api/health`.

## Features

- **Dual Mode** — Generate IEEE research papers or professional resumes from the same upload
- **AI Interview** — Detects gaps in your document and asks targeted questions before generating
- **IEEE Paper Generator** — Two-column layout, Times New Roman, proper sectioning, abstract, keywords, references
- **AI Resume Builder** — Extracts experience, skills, education; formats a professional resume with download
- **Smart Editor** — Edit any section manually or ask AI to rewrite, expand, or fix tone
- **Multi-Format Upload** — PDF, DOCX, images, code, Markdown, LaTeX, HTML, Jupyter notebooks
- **Export Options** — Download as IEEE-compliant HTML, DOCX, or PDF
- **Streaming Generation** — Real-time token streaming as the AI writes your paper

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Router v7 |
| Backend | FastAPI, Uvicorn, PyPDF2, python-docx, fpdf2, PyMuPDF |
| AI Model | Nemotron-3-Ultra-Free via OpenCode Zen API |
| Hosting | Render (single Docker service, frontend + API on one origin) |

## Project Structure

```
paper-ai/
├── frontend/               # React SPA
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── pages/
│   │   │   └── WizardPage.jsx
│   │   ├── components/
│   │   │   ├── PaperWizard.jsx
│   │   │   └── LogoMark.jsx
│   │   └── config/
│   ├── package.json
│   └── vite.config.js
├── backend/                # FastAPI server
│   ├── main.py             # API routes, HTML/PDF/DOCX generation
│   ├── config.py           # Environment config
│   ├── services/
│   │   └── llm_service.py  # LLM integration (analyze, generate, edit)
│   └── requirements.txt
├── .gitignore
└── README.md
```

## Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- An OpenCode Zen API key

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `EXPERIENTIAL_API_KEY` | Backend | API key for the LLM (Kilo Auto Free — https://api.kilo.ai) |
| `VITE_API_BASE_URL` | Frontend | Backend URL (default: `http://localhost:8080`) |

Create a `.env` file in `backend/` or set them in your shell. For the frontend, create `frontend/.env`:

```
VITE_API_BASE_URL=http://localhost:8080
```

## Deploy on Render

Deployed as **one Render web service** (Docker runtime) from the GitHub repo `sanir321/paper-ai`:

- **Runtime:** `docker`
- **Dockerfile:** `./Dockerfile` — multi-stage: builds `frontend/` with Vite, then serves the output from FastAPI
- **Health check path:** `/api/health`
- **Region:** `oregon` · **Plan:** `free`
- **Env:** `EXPERIENTIAL_API_KEY`, `EXPERIENTIAL_BASE_URL`, `LLM_MODEL`

Because the frontend is served from the same origin as the API, `VITE_API_BASE_URL` is not required — `frontend/src/config/api.js` falls back to same-origin requests in production builds.

> Free-tier note: the service spins down after ~15 minutes of inactivity, so the first request after a pause takes 30-60s to wake up.

## API Endpoints

### Session

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check (used as the Render health check path) |
| `POST` | `/api/upload` | Upload a document (PDF, DOCX, TXT, etc.); returns a `session_id` |
| `GET` | `/api/session/{session_id}` | Fetch session state (mode, analysis, outputs) |
| `GET` | `/api/session/{session_id}/image/{filename}` | Serve an image extracted from the uploaded document |
| `POST` | `/api/set-mode/{session_id}` | Switch between `paper` and `resume` mode; runs document analysis |

### Paper mode

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ask-paper/{session_id}` | Get the next AI interview question |
| `POST` | `/api/answer-paper/{session_id}` | Submit an answer to the current question |
| `GET` | `/api/generate-paper-stream/{session_id}` | Stream paper generation over SSE |
| `POST` | `/api/save-paper/{session_id}` | Persist the paper; body is `{"paper_json": {...}}` |
| `POST` | `/api/edit-paper/{session_id}` | Edit the paper with a natural-language instruction |
| `GET` | `/api/preview/{session_id}/{fmt}` | Preview inline |
| `GET` | `/api/preview-paper/{session_id}/{fmt}` | Alias of the above |
| `GET` | `/api/download/{session_id}/{fmt}` | Download |
| `GET` | `/api/download-paper/{session_id}/{fmt}` | Alias of the above |

### Resume mode

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ask-resume/{session_id}` | Get the next AI interview question |
| `POST` | `/api/answer-resume/{session_id}` | Submit an answer to the current question |
| `GET` | `/api/generate-resume-stream/{session_id}` | Stream resume generation over SSE |
| `POST` | `/api/save-resume/{session_id}` | Persist the resume |
| `POST` | `/api/edit-resume/{session_id}` | Edit the resume with a natural-language instruction |
| `GET` | `/api/preview-resume/{session_id}/{fmt}` | Preview inline |
| `GET` | `/api/download-resume/{session_id}/{fmt}` | Download |

### Path parameters

| Parameter | Accepted values |
|-----------|-----------------|
| `{fmt}` (paper) | `html`, `pdf`, `docx` — PDF/DOCX require a saved paper |
| `{fmt}` (resume) | `html`, `pdf` |
| `format` (query, download) | `procomm` (default) or `iemt` — IEEE two-column format |

> In production the built React SPA is served by a catch-all `GET /{full_path:path}` route, so `/` returns the app UI rather than a health payload. Use `/api/health` for liveness checks.

## How It Works

1. **Upload** — Drop any document (PDF, DOCX, images, code, LaTeX)
2. **Pick Mode** — Choose IEEE paper or professional resume
3. **AI Interview** — Answer clarifying questions to fill gaps
4. **Generate** — Get formatted output with streaming preview
5. **Export** — Download as HTML, DOCX, or PDF

## License

Private project. All rights reserved.
