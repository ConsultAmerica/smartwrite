"""Request IDs, size guards, rate limiting, and correlated metrics."""

from __future__ import annotations

import logging
import time
import uuid
from collections import defaultdict, deque
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from metrics import record as record_metric

logger = logging.getLogger("smartwrite.api")

RATE_LIMITS: dict[str, tuple[int, float]] = {
    "/api/rewrite": (20, 60.0),
    "/rewrite": (20, 60.0),
    "/api/analyze": (40, 60.0),
    "/analyze": (40, 60.0),
    "/check-grammar": (40, 60.0),
    "/check-resume": (40, 60.0),
    "/check-email": (40, 60.0),
    "/check-healthcare": (40, 60.0),
    "/check-academic": (40, 60.0),
    "/check-business": (40, 60.0),
    "/detect-tone": (40, 60.0),
    "/agent": (20, 60.0),
    "/documents": (60, 60.0),
}

MAX_BODY_BYTES = 400_000

_hits: dict[str, deque[float]] = defaultdict(deque)


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _rate_limited(path: str, client: str) -> bool:
    limit = RATE_LIMITS.get(path)
    if not limit:
        for prefix, conf in RATE_LIMITS.items():
            if path.startswith(prefix):
                limit = conf
                break
    if not limit:
        return False
    max_hits, window = limit
    key = f"{client}:{path}"
    now = time.monotonic()
    q = _hits[key]
    while q and now - q[0] > window:
        q.popleft()
    if len(q) >= max_hits:
        return True
    q.append(now)
    return False


class RequestGuardMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
        document_key = request.headers.get("x-document-key") or "-"
        client_revision = request.headers.get("x-client-revision") or "-"
        started_at = request.headers.get("x-started-at") or "-"
        request.state.request_id = request_id
        request.state.document_key = document_key
        request.state.client_revision = client_revision
        started = time.perf_counter()
        path = request.url.path

        if request.method in ("POST", "PUT", "PATCH"):
            content_length = request.headers.get("content-length")
            if content_length and content_length.isdigit() and int(content_length) > MAX_BODY_BYTES:
                return JSONResponse(
                    {
                        "success": False,
                        "code": "INVALID_REQUEST",
                        "message": "Request body is too large.",
                    },
                    status_code=413,
                    headers={"X-Request-ID": request_id},
                )

        if request.method == "POST" and _rate_limited(path, _client_key(request)):
            logger.warning(
                "rate_limited request_id=%s document_key=%s path=%s client=%s",
                request_id,
                document_key,
                path,
                _client_key(request),
            )
            return JSONResponse(
                {
                    "success": False,
                    "code": "RATE_LIMITED",
                    "message": "Too many requests. Please wait a moment.",
                },
                status_code=429,
                headers={"X-Request-ID": request_id, "Retry-After": "30"},
            )

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = int((time.perf_counter() - started) * 1000)
            record_metric(path, status=500, duration_ms=duration_ms, request_id=request_id)
            logger.exception(
                "unhandled request_id=%s document_key=%s client_revision=%s path=%s status=500 duration_ms=%s",
                request_id,
                document_key,
                client_revision,
                path,
                duration_ms,
            )
            return JSONResponse(
                {
                    "success": False,
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected error occurred.",
                },
                status_code=500,
                headers={"X-Request-ID": request_id},
            )

        duration_ms = int((time.perf_counter() - started) * 1000)
        response.headers["X-Request-ID"] = request_id
        if path.startswith(
            ("/api/", "/rewrite", "/check", "/detect", "/agent", "/analyze", "/documents")
        ):
            record_metric(path, status=response.status_code, duration_ms=duration_ms, request_id=request_id)
            logger.info(
                "request_id=%s document_key=%s client_revision=%s started_at=%s path=%s status=%s duration_ms=%s",
                request_id,
                document_key,
                client_revision,
                started_at,
                path,
                response.status_code,
                duration_ms,
            )
        return response
