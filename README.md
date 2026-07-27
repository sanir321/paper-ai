# DocOct — AI Research Paper Generator

Upload any document — AI extracts everything, interviews you on gaps, then generates either an IEEE-formatted research paper or a professional resume. Two modes, one upload.

## Live Demo

- **Frontend:** [frontend-production-d77c4.up.railway.app](https://frontend-production-d77c4.up.railway.app)
- **Backend:** [backend-production-a605.up.railway.app](https://backend-production-a605.up.railway.app)

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
| Hosting | Railway (frontend + backend as separate services) |

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
| `OPENCODE_ZEN_API_KEY` | Backend | API key for the LLM (Nemotron-3-Ultra-Free) |
| `VITE_API_BASE_URL` | Frontend | Backend URL (default: `http://localhost:8080`) |

Create a `.env` file in `backend/` or set them in your shell. For the frontend, create `frontend/.env`:

```
VITE_API_BASE_URL=http://localhost:8080
```

## Deploy on Railway

This project runs as **two Railway services** from the same GitHub repo (`sanir321/doc-oct`):

### Backend Service
- **Root directory:** `backend`
- **Build:** `pip install -r requirements.txt`
- **Start:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Env:** Add `OPENCODE_ZEN_API_KEY`

### Frontend Service
- **Root directory:** `frontend`
- **Build:** `npm install && npm run build`
- **Start:** `npx serve dist -s -l $PORT`
- **Env:** Add `VITE_API_BASE_URL=https://your-backend.up.railway.app`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/api/upload` | Upload a document (PDF, DOCX, etc.) |
| `POST` | `/api/ask-paper/{session_id}` | Get next AI interview question |
| `POST` | `/api/answer-paper/{session_id}` | Submit answer to interview question |
| `GET` | `/api/generate-paper-stream/{session_id}` | Stream paper generation (SSE) |
| `GET` | `/api/download/{session_id}/html` | Download paper as HTML |
| `GET` | `/api/download/{session_id}/docx` | Download paper as DOCX |
| `GET` | `/api/session/{session_id}/image/{filename}` | Serve extracted document images |

## How It Works

1. **Upload** — Drop any document (PDF, DOCX, images, code, LaTeX)
2. **Pick Mode** — Choose IEEE paper or professional resume
3. **AI Interview** — Answer clarifying questions to fill gaps
4. **Generate** — Get formatted output with streaming preview
5. **Export** — Download as HTML, DOCX, or PDF

## License

Private project. All rights reserved.
