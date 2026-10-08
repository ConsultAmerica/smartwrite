import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from agents import run_agent
from ai_rewrite import (
    detect_tone,
    improve_email,
    improve_healthcare,
    improve_resume_bullet,
    rewrite_text,
)
from config import settings
from database import (
    delete_document,
    get_document,
    init_db,
    list_documents,
    seed_sample_documents,
    log_grammar_check,
    log_history,
    log_suggestion,
    save_document,
)
from mode_check import check_by_mode
from metrics import snapshot as metrics_snapshot
from request_guard import RequestGuardMiddleware

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
logger = logging.getLogger("smartwrite.api")
BUILD_LABEL = "SmartWrite RC1 — Data Integrity & AI Safety Hardened"

MAX_TEXT_CHARS = 80_000
MAX_TITLE_CHARS = 200

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "desktop-app" / "dist"


def _web_deploy_enabled() -> bool:
    if settings.serve_web:
        return True
    return os.getenv("SERVE_WEB", "").lower() in ("1", "true", "yes")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()
    logger.info("SmartWrite API ready at http://127.0.0.1:%s", settings.port)
    yield


app = FastAPI(
    title="SmartWrite AI",
    description="Grammar, tone, and AI rewrite API for the desktop writing assistant",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(RequestGuardMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    # Preview deploys: https://*.vercel.app
    allow_origin_regex=r"https://([a-z0-9-]+\.)*vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextRequest(BaseModel):
    text: str = Field(..., max_length=MAX_TEXT_CHARS)
    document_id: int | None = None
    user_dictionary: list[str] = Field(default_factory=list, max_length=500)
    writing_mode: str | None = Field(default=None, max_length=40)


class RewriteRequest(BaseModel):
    text: str = Field(..., max_length=MAX_TEXT_CHARS)
    mode: str = Field(default="professional", max_length=40)
    document_id: int | None = None
    documentType: str | None = Field(default=None, max_length=60)
    goals: dict | None = None


class AnalyzeRequest(BaseModel):
    text: str = Field(..., max_length=MAX_TEXT_CHARS)
    goals: dict | None = None
    writing_mode: str | None = Field(default=None, max_length=40)
    user_dictionary: list[str] = Field(default_factory=list, max_length=500)
    document_id: int | None = None


class EmailRequest(BaseModel):
    text: str = Field(..., max_length=MAX_TEXT_CHARS)
    action: str = Field(default="polish", max_length=40)
    document_id: int | None = None


class ResumeRequest(BaseModel):
    text: str = Field(..., max_length=MAX_TEXT_CHARS)
    action: str = Field(default="bullet", max_length=40)
    document_id: int | None = None


class HealthcareRequest(BaseModel):
    text: str = Field(..., max_length=MAX_TEXT_CHARS)
    action: str = Field(default="clinical_tone", max_length=40)
    document_id: int | None = None


class AgentRequest(BaseModel):
    text: str = Field(..., max_length=MAX_TEXT_CHARS)
    agent: str = Field(default="clarity", max_length=40)
    options: dict = Field(default_factory=dict)
    document_id: int | None = None


class DocumentRequest(BaseModel):
    title: str = Field(default="Untitled", max_length=MAX_TITLE_CHARS)
    content: str = Field(default="", max_length=MAX_TEXT_CHARS)
    id: int | None = None


@app.get("/")
async def root():
    index = FRONTEND_DIST / "index.html"
    if _web_deploy_enabled() and index.is_file():
        return FileResponse(index, media_type="text/html")
    return {
        "service": "SmartWrite AI",
        "status": "running",
        "docs": f"http://127.0.0.1:{settings.port}/docs",
        "health": "/health",
        "ui": "/ (when SERVE_WEB=1 and dist/ is built)",
        "endpoints": {
            "check_grammar": "POST /check-grammar",
            "rewrite": "POST /rewrite",
            "detect_tone": "POST /detect-tone",
            "documents": "GET /documents",
        },
        "message": "API is running. Open /docs for interactive API explorer.",
    }


@app.get("/health")
@app.get("/api/health")
async def health():
    from ai_rewrite import _client, _resolve_ollama_model

    rewrite_status = "ok"
    provider = (settings.llm_provider or "").lower()
    if provider == "ollama":
        try:
            model = _resolve_ollama_model()
            if not model or _client() is None:
                rewrite_status = "degraded"
        except Exception:
            rewrite_status = "degraded"
    elif provider == "openai" and not settings.openai_api_key:
        rewrite_status = "unavailable"
    elif not provider:
        # Empty provider = intentional rule-based fallback (cloud / free tier).
        rewrite_status = "ok"

    overall = "ok"
    if rewrite_status == "unavailable":
        overall = "degraded"
    elif rewrite_status == "degraded":
        overall = "degraded"

    return {
        "status": overall,
        "service": "smartwrite-api",
        "api": "backend-v1",
        "version": "1.0.0-rc.1",
        "build": BUILD_LABEL,
        "rewrite": rewrite_status,
        "analysis": True,
        "services": {
            "documents": "ok",
            "analysis": "ok",
            "rewrite": rewrite_status,
        },
    }


def _metrics_authorized(
    request: Request,
    x_metrics_token: str | None,
    authorization: str | None,
) -> bool:
    token = (settings.metrics_token or "").strip()
    # Local loopback without SERVE_WEB may omit token for developer convenience.
    if not token and not settings.serve_web and request.client and request.client.host in (
        "127.0.0.1",
        "::1",
        "localhost",
    ):
        return True
    if not token:
        return False
    if x_metrics_token and x_metrics_token.strip() == token:
        return True
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip() == token
    return False


@app.get("/api/metrics")
@app.get("/metrics")
async def api_metrics(
    request: Request,
    x_metrics_token: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
):
    """Internal ops metrics only — never public. No document bodies."""
    if not _metrics_authorized(request, x_metrics_token, authorization):
        raise HTTPException(status_code=401, detail="Metrics authorization required")
    return metrics_snapshot()


@app.post("/check-grammar")
async def api_check_grammar(req: TextRequest):
    mode = (req.writing_mode or "general").lower()
    payload = await check_by_mode(req.text, mode, req.user_dictionary)
    await log_grammar_check(
        req.document_id,
        {"issue_count": payload.get("issue_count", 0), "mode": mode},
        payload.get("issue_count", 0),
        payload.get("grammar_score", 100),
    )
    return payload


@app.post("/check-resume")
async def api_check_resume(req: TextRequest):
    return await check_by_mode(req.text, "resume", req.user_dictionary)


@app.post("/check-email")
async def api_check_email(req: TextRequest):
    return await check_by_mode(req.text, "email", req.user_dictionary)


@app.post("/check-healthcare")
async def api_check_healthcare(req: TextRequest):
    return await check_by_mode(req.text, "healthcare", req.user_dictionary)


@app.post("/check-academic")
async def api_check_academic(req: TextRequest):
    return await check_by_mode(req.text, "academic", req.user_dictionary)


@app.post("/check-business")
async def api_check_business(req: TextRequest):
    return await check_by_mode(req.text, "business", req.user_dictionary)


@app.post("/check")
async def api_check_legacy(req: TextRequest):
    """Legacy route from old ai-service folder."""
    return await api_check_grammar(req)


MAX_REWRITE_SELECTION = 12_000


@app.post("/rewrite")
@app.post("/api/rewrite")
async def api_rewrite(req: RewriteRequest):
    if not req.text.strip():
        return {
            "success": False,
            "code": "INVALID_REQUEST",
            "error": "INVALID_REQUEST",
            "message": "Text is required to rewrite.",
        }
    if len(req.text) > MAX_REWRITE_SELECTION:
        return {
            "success": False,
            "code": "INVALID_REQUEST",
            "error": "INVALID_REQUEST",
            "message": "Selection is too long to rewrite at once. Try a smaller section.",
        }
    try:
        out = await rewrite_text(req.text, req.mode)
        await log_suggestion(req.document_id, req.text, out["rewritten_text"], req.mode)
        out["result"] = out.get("rewritten") or out.get("rewritten_text")
        out["success"] = True
        out["code"] = None
        return out
    except TimeoutError:
        return {
            "success": False,
            "code": "MODEL_TIMEOUT",
            "error": "MODEL_TIMEOUT",
            "message": "The rewrite service timed out.",
        }
    except Exception as exc:
        msg = str(exc).lower()
        if "rate" in msg and "limit" in msg:
            code, message = "RATE_LIMITED", "The rewrite service is rate limited."
        elif "api" in msg and "key" in msg:
            code, message = "AUTH_CONFIGURATION_ERROR", "Rewrite provider is not configured."
        elif "timeout" in msg:
            code, message = "MODEL_TIMEOUT", "The rewrite service timed out."
        else:
            code, message = "PROVIDER_ERROR", "The writing service is temporarily unavailable."
        return {
            "success": False,
            "code": code,
            "error": code,
            "message": message,
        }


@app.post("/api/analyze")
@app.post("/analyze")
async def api_analyze(req: AnalyzeRequest):
    mode = (req.writing_mode or (req.goals or {}).get("documentType") or "general").lower()
    if isinstance(mode, str) and mode not in {
        "general",
        "resume",
        "email",
        "healthcare",
        "academic",
        "business",
    }:
        mode = "general"
    payload = await check_by_mode(req.text, mode, req.user_dictionary)
    issues = payload.get("issues") or []
    suggestions = []
    for idx, issue in enumerate(issues):
        start = int(issue.get("offset") or 0)
        length = int(issue.get("length") or 0)
        suggestions.append(
            {
                "id": issue.get("id") or f"issue_{idx + 1}",
                "type": issue.get("issue_type") or issue.get("category") or "style",
                "start": start,
                "end": start + length,
                "original": issue.get("problem") or "",
                "replacement": issue.get("suggestion")
                or (issue.get("replacements") or [""])[0],
                "title": issue.get("short_message")
                or issue.get("issue_title")
                or issue.get("message")
                or "Suggestion",
                "explanation": issue.get("why") or issue.get("message") or "",
            }
        )
    grammar = int(payload.get("grammar_score") or 90)
    clarity = int(payload.get("clarity_score") or 88)
    return {
        "score": min(96, grammar),
        "summary": {
            "correctness": "strong" if grammar >= 90 else "needs work",
            "clarity": "clear" if clarity >= 85 else "dense",
            "tone": payload.get("tone") or "neutral",
            "engagement": "moderate",
        },
        "suggestions": suggestions,
        "issues": issues,
        "grammar_score": grammar,
        "clarity_score": clarity,
        "issue_count": len(suggestions),
        "writing_mode": mode,
    }


@app.post("/detect-tone")
async def api_detect_tone(req: TextRequest):
    return await detect_tone(req.text, req.user_dictionary)


@app.post("/improve-resume-bullet")
async def api_improve_resume(req: ResumeRequest):
    if not req.text.strip():
        raise HTTPException(400, "Text is required")
    out = await improve_resume_bullet(req.text, req.action)
    await log_suggestion(req.document_id, req.text, out["rewritten_text"], f"resume:{req.action}")
    return out


@app.post("/improve-email")
async def api_improve_email(req: EmailRequest):
    if not req.text.strip():
        raise HTTPException(400, "Text is required")
    out = await improve_email(req.text, req.action)
    await log_suggestion(req.document_id, req.text, out["rewritten_text"], f"email:{req.action}")
    return out


@app.post("/improve-healthcare")
async def api_improve_healthcare(req: HealthcareRequest):
    if not req.text.strip():
        raise HTTPException(400, "Text is required")
    out = await improve_healthcare(req.text, req.action)
    await log_suggestion(
        req.document_id, req.text, out["rewritten_text"], f"healthcare:{req.action}"
    )
    return out


@app.post("/agent")
async def api_run_agent(req: AgentRequest):
    if not req.text.strip():
        raise HTTPException(400, "Text is required")
    try:
        out = await run_agent(req.agent, req.text, req.options)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    rewrite = out.get("result", {}).get("rewrite")
    if rewrite:
        await log_suggestion(req.document_id, req.text, rewrite, f"agent:{req.agent}")
    return out


@app.get("/documents")
async def api_list_documents():
    return {"documents": await list_documents()}


@app.post("/documents/seed-samples")
async def api_seed_samples():
    await seed_sample_documents()
    return {"documents": await list_documents()}


@app.get("/documents/{doc_id}")
async def api_get_document(doc_id: int):
    doc = await get_document(doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


@app.post("/documents")
async def api_save_document(req: DocumentRequest):
    doc = await save_document(req.title, req.content, req.id)
    return doc


@app.delete("/documents/{doc_id}")
async def api_delete_document(doc_id: int):
    if not await delete_document(doc_id):
        raise HTTPException(404, "Document not found")
    return {"deleted": True}


class HistoryRequest(BaseModel):
    document_id: int | None = None
    action: str
    before_text: str = ""
    after_text: str = ""


@app.post("/history")
async def api_log_history(req: HistoryRequest):
    await log_history(req.document_id, req.action, req.before_text, req.after_text)
    return {"logged": True}


def _mount_frontend_assets() -> None:
    if not _web_deploy_enabled() or not FRONTEND_DIST.is_dir():
        return
    assets = FRONTEND_DIST / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=assets), name="frontend-assets")


_mount_frontend_assets()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
