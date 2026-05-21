# Deploy SmartWrite AI (Vercel + Render)

Split hosting: **Vercel** serves the React UI; **Render** runs the FastAPI API.

| Service | Hosts | URL example |
|---------|--------|-------------|
| Frontend | [Vercel](https://vercel.com) | `https://smartwrite-ai.vercel.app` |
| API | [Render](https://render.com) | `https://smartwrite-api.onrender.com` |

---

## 1. Push to GitHub

```powershell
cd "E:\projects\AI Projects\grammarly-app"
git init
git add .
git commit -m "Initial commit: SmartWrite AI web + desktop"
```

Create a new empty repo on GitHub (e.g. `smartwrite-ai`), then:

```powershell
git branch -M main
git remote add origin https://github.com/YOUR_USER/smartwrite-ai.git
git push -u origin main
```

---

## 2. Deploy API on Render

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect the GitHub repo (uses root `render.yaml`)
3. Or **New Web Service** manually:
   - **Root directory:** `backend`
   - **Runtime:** Python 3
   - **Build:** `pip install -r requirements-cloud.txt`
   - **Start:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. **Environment variables:**

| Variable | Value |
|----------|--------|
| `LANGUAGETOOL_API_URL` | `https://api.languagetool.org/v2/check` |
| `LLM_PROVIDER` | *(empty)* |
| `DATABASE_PATH` | `/tmp/app.db` |
| `CORS_ORIGINS` | Your Vercel URL (see step 3) |

5. Deploy and copy the service URL, e.g. `https://smartwrite-api.onrender.com`
6. Test: open `https://YOUR-API.onrender.com/health` — should return `"api": "backend-v1"`

**Note:** Free tier sleeps when idle; first request may take 30–60 seconds.

---

## 3. Deploy frontend on Vercel

1. [vercel.com/new](https://vercel.com/new) → Import the same GitHub repo
2. **Root Directory:** `desktop-app`
3. **Framework Preset:** Vite (auto-detected)
4. **Environment variable** (Production + Preview):

| Name | Value |
|------|--------|
| `VITE_API_BASE` | `https://YOUR-API.onrender.com` (no trailing slash) |

5. Deploy → copy your Vercel URL, e.g. `https://smartwrite-ai.vercel.app`

---

## 4. Link CORS (required)

In **Render** → your API service → **Environment**:

Update `CORS_ORIGINS` to include your live Vercel URL:

```env
CORS_ORIGINS=https://smartwrite-ai.vercel.app,http://localhost:5173,http://127.0.0.1:5173
```

Save → Render redeploys. Without this, the browser blocks API calls from Vercel.

---

## 5. Verify production

1. Open your Vercel URL
2. Healthcare tab → text loads with demo issues
3. Grammar score and Issues panel should populate (API on Render)

---

## Local development (unchanged)

| Goal | Command |
|------|---------|
| Browser + API | `npm run dev:web` or `.\start-web.cmd` |
| API only | `.\scripts\start-backend.cmd` |
| Production locally (single URL) | `npm run start:web` → http://127.0.0.1:8002 |

---

## Alternative: one URL on Render only

Use the repo `Dockerfile` with `SERVE_WEB=1` — UI and API on one Render URL. See Option A in git history or `Dockerfile` comments. Split Vercel + Render is better for a fast static UI and separate API scaling.

---

## Environment reference

| Variable | Vercel | Render |
|----------|--------|--------|
| `VITE_API_BASE` | Render API URL | — |
| `LANGUAGETOOL_API_URL` | — | Public LT API URL |
| `LLM_PROVIDER` | — | empty or `openai` + key |
| `CORS_ORIGINS` | — | Vercel URL + localhost |
| `DATABASE_PATH` | — | `/tmp/app.db` on free tier |
| `SERVE_WEB` | — | **do not set** for split deploy |
