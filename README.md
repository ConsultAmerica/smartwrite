# SmartWrite AI — Desktop Writing Assistant

SmartWrite AI is a desktop writing assistant that helps users improve grammar, clarity, tone, and professional writing. The app detects writing issues, provides correction suggestions, supports AI-powered rewriting, and includes specialized modes for general writing, emails, and resumes.

## Demo text

For portfolio demos, the default document uses intentional mistakes so grammar checking, underlines, and **Correct All** are easy to show:

**Sample (with issues):**

> I has been working on a website project last year. The team were very happy with my work and I think it went good. I also helps with fixing bugs, creating pages, and make the design better.

**After corrections:**

> I worked on a website project last year. The team was very happy with my work, and I think it went well. I also helped fix bugs, create pages, and improve the design.

Click **Check Grammar** to see issues, use **Apply** / **Ignore** per card, or **Correct All** to fix everything at once.

## Features

| Feature | Status |
|---------|--------|
| Grammar & spelling check (LanguageTool) | Done |
| Underlined mistakes + hover suggestions | Done |
| Apply / Ignore / Explain per issue | Done |
| Correct All | Done |
| AI rewrite for selected text (Ollama / OpenAI) | Done |
| Document saving (SQLite) | Done |
| General / Email / Resume modes | Done |
| Tone, clarity & grammar scores | Done |
| Dark / light theme | Done |
| Export TXT / PDF | Planned |
| User edit history | Planned |
| Packaged Electron installer | Planned |

## Architecture

```
grammarly-app/
├── backend/           # FastAPI (grammar, rewrite, tone, SQLite)
├── desktop-app/       # Electron + React + Vite
├── database/          # app.db (created at runtime)
└── README.md
```

| Layer | Stack |
|-------|--------|
| Desktop | Electron 33, React 19, Vite 6 |
| API | Python FastAPI, uvicorn |
| Grammar | language-tool-python (local) |
| AI rewrite | Ollama (free, local) or OpenAI (optional) |
| Database | SQLite (aiosqlite) |

## Quick start (Windows)

### Run backend + web UI in browser (recommended for demos)

```powershell
.\start-web.cmd
```

Or:

```powershell
npm install
npm run dev:web
```

- **Frontend:** http://127.0.0.1:5173  
- **Backend API:** http://127.0.0.1:8002  

### Run backend + Electron desktop

```powershell
.\start.ps1
```

Or `npm run dev` — starts FastAPI + Electron. Press `Ctrl+C` to stop both.

### Production web (single port)

Build the UI and serve it from the API:

```powershell
npm run start:web
```

Open **http://127.0.0.1:8002** — same server hosts the React app and all API routes.

### Run separately (optional)

**Backend only:**

```powershell
cd backend
.\start-backend.ps1
```

**Desktop only** (backend must already be on port 8001):

```powershell
cd desktop-app
npm run dev
```

API: http://127.0.0.1:8001 — interactive docs at http://127.0.0.1:8001/docs

Copy `backend/.env.example` to `backend/.env`. For free local AI rewrites:

```env
LLM_PROVIDER=ollama
OLLAMA_MODEL=llama3.2
```

Keep the **Ollama** app running and pull a model: `ollama pull llama3.2`

**Note:** The first grammar check may download LanguageTool (~200MB) once.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/check-grammar` | LanguageTool issues + enriched cards |
| POST | `/rewrite` | AI rewrite by tone mode |
| POST | `/detect-tone` | Tone + clarity / grammar scores |
| POST | `/improve-resume-bullet` | Resume bullet actions |
| POST | `/improve-email` | Email polish actions |
| GET | `/documents` | List saved drafts |
| POST | `/documents` | Save / update document |
| POST | `/documents/seed-samples` | Create demo documents |

## Research question

*How can an AI-powered desktop writing assistant help users improve grammar, clarity, tone, and professionalism by providing real-time corrections, rewrite suggestions, and personalized writing feedback?*

## Roadmap

- [ ] Export as TXT / PDF
- [ ] User edit history UI
- [ ] Desktop build / installer (electron-builder)
- [ ] Plagiarism / similarity check
- [ ] PDF / DOCX upload
- [ ] User auth & cloud sync (Postgres)

## License

Portfolio / educational use.
