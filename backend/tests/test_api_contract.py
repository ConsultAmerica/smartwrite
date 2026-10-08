"""Contract tests for health, rewrite, and analyze endpoints."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_ok(client: TestClient):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["service"] == "smartwrite-api"
    assert data["status"] in ("ok", "degraded")
    assert "rewrite" in data
    assert data.get("analysis") is True


def test_rewrite_success(client: TestClient):
    with (
        patch(
            "main.rewrite_text",
            new=AsyncMock(
                return_value={
                    "success": True,
                    "rewritten": "Hello there.",
                    "rewritten_text": "Hello there.",
                    "mode": "professional",
                    "source": "fallback",
                }
            ),
        ),
        patch("main.log_suggestion", new=AsyncMock()),
    ):
        res = client.post(
            "/api/rewrite",
            json={"text": "hey there", "mode": "professional"},
        )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["result"] == "Hello there."
    assert data["mode"] == "professional"


def test_rewrite_invalid_input(client: TestClient):
    res = client.post("/api/rewrite", json={"text": "   ", "mode": "professional"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is False
    assert data["code"] == "INVALID_REQUEST"


def test_rewrite_provider_timeout(client: TestClient):
    with patch("main.rewrite_text", new=AsyncMock(side_effect=TimeoutError("timed out"))):
        res = client.post("/api/rewrite", json={"text": "Please rewrite this.", "mode": "shorter"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is False
    assert data["code"] == "MODEL_TIMEOUT"


def test_rewrite_provider_500(client: TestClient):
    with patch("main.rewrite_text", new=AsyncMock(side_effect=RuntimeError("upstream 500"))):
        res = client.post("/api/rewrite", json={"text": "Please rewrite this.", "mode": "clearer"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is False
    assert data["code"] in ("PROVIDER_ERROR", "MODEL_UNAVAILABLE", "INTERNAL_ERROR")


def test_rewrite_rate_limited(client: TestClient):
    with patch(
        "main.rewrite_text",
        new=AsyncMock(side_effect=RuntimeError("rate limit exceeded")),
    ):
        res = client.post("/api/rewrite", json={"text": "Please rewrite this.", "mode": "friendly"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is False
    assert data["code"] == "RATE_LIMITED"


def test_rewrite_missing_provider_config(client: TestClient):
    with patch(
        "main.rewrite_text",
        new=AsyncMock(side_effect=RuntimeError("api key missing")),
    ):
        res = client.post(
            "/api/rewrite",
            json={"text": "Please rewrite this.", "mode": "professional"},
        )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is False
    assert data["code"] == "AUTH_CONFIGURATION_ERROR"


def test_rewrite_rejects_oversized_text(client: TestClient):
    res = client.post(
        "/api/rewrite",
        json={"text": "x" * 90_000, "mode": "professional"},
    )
    assert res.status_code == 422


def test_health_includes_request_id(client: TestClient):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.headers.get("x-request-id")


def test_metrics_endpoint_requires_auth_when_token_set(client: TestClient, monkeypatch):
    from config import settings

    monkeypatch.setattr(settings, "metrics_token", "beta-metrics-secret")
    monkeypatch.setattr(settings, "serve_web", False)

    denied = client.get("/api/metrics")
    assert denied.status_code == 401

    client.post("/api/rewrite", json={"text": "hello there", "mode": "professional"})
    res = client.get("/api/metrics", headers={"X-Metrics-Token": "beta-metrics-secret"})
    assert res.status_code == 200
    data = res.json()
    assert "RC1" in data.get("build", "")
    assert "routes" in data
    assert "alerts" in data


def test_metrics_endpoint_bearer_auth(client: TestClient, monkeypatch):
    from config import settings

    monkeypatch.setattr(settings, "metrics_token", "bearer-secret")
    res = client.get("/api/metrics", headers={"Authorization": "Bearer bearer-secret"})
    assert res.status_code == 200


def test_metrics_blocked_when_serve_web_without_token(client: TestClient, monkeypatch):
    from config import settings

    monkeypatch.setattr(settings, "metrics_token", "")
    monkeypatch.setattr(settings, "serve_web", True)
    res = client.get("/api/metrics")
    assert res.status_code == 401


def test_analyze_malformed_text(client: TestClient):
    with patch(
        "main.check_by_mode",
        new=AsyncMock(
            return_value={
                "issues": [
                    {
                        "id": "issue_1",
                        "issue_type": "grammar",
                        "offset": 0,
                        "length": 5,
                        "problem": "$20.e",
                        "suggestion": "$20",
                        "short_message": "Possible number-formatting issue",
                        "why": "Invalid currency.",
                        "replacements": ["$20"],
                    }
                ],
                "grammar_score": 80,
                "clarity_score": 88,
                "tone": "Neutral",
            }
        ),
    ):
        res = client.post("/api/analyze", json={"text": "Incentive: $20.e via choice."})
    assert res.status_code == 200
    data = res.json()
    assert "score" in data
    assert isinstance(data["suggestions"], list)
    assert data["suggestions"][0]["original"] == "$20.e"
    assert data["suggestions"][0]["replacement"] == "$20"
