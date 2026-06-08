import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
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

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "desktop-app" / "dist"


def _web_deploy_enabled() -> bool:
    if settings.serve_web:
        return True
    return os.getenv("SERVE_WEB", "").lower() in ("1", "true", "yes")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()
    print(f"SmartWrite API ready at http://127.0.0.1:{settings.port}  (use /docs to test)")
    yield


app = FastAPI(
    title="SmartWrite AI",
    description="Grammar, tone, and AI rewrite API for the desktop writing assistant",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextRequest(BaseModel):
    text: str
    document_id: int | None = None
    user_dictionary: list[str] = Field(default_factory=list)
    writing_mode: str | None = None


class RewriteRequest(BaseModel):
    text: str
    mode: str = "professional"
    document_id: int | None = None


class EmailRequest(BaseModel):
    text: str
    action: str = "polish"
    document_id: int | None = None


class ResumeRequest(BaseModel):
    text: str
    action: str = "bullet"
    document_id: int | None = None


class HealthcareRequest(BaseModel):
    text: str
    action: str = "clinical_tone"
    document_id: int | None = None


class AgentRequest(BaseModel):
    text: str
    agent: str = "clarity"
    options: dict = Field(default_factory=dict)
    document_id: int | None = None


class DocumentRequest(BaseModel):
    title: str = "Untitled"
    content: str = ""
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
async def health():
    return {"status": "ok", "service": "SmartWrite AI", "api": "backend-v1", "version": "1.0.0"}


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


@app.post("/rewrite")
async def api_rewrite(req: RewriteRequest):
    if not req.text.strip():
        raise HTTPException(400, "Text is required")
    out = await rewrite_text(req.text, req.mode)
    await log_suggestion(req.document_id, req.text, out["rewritten_text"], req.mode)
    return out


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
