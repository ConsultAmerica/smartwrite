"""In-process API metrics for RC1 observability (no document bodies)."""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from typing import Any

_lock = threading.Lock()
_counters: dict[str, int] = defaultdict(int)
_latencies: dict[str, deque[float]] = defaultdict(lambda: deque(maxlen=200))
_errors: dict[str, deque[float]] = defaultdict(lambda: deque(maxlen=200))

ALERT_ERROR_WINDOW_S = 300.0
ALERT_ERROR_THRESHOLD = 12


def record(route: str, *, status: int, duration_ms: float, request_id: str | None = None) -> None:
    key = route.split("?")[0]
    with _lock:
        _counters[f"{key}:count"] += 1
        _latencies[key].append(duration_ms)
        if status >= 400:
            _counters[f"{key}:error"] += 1
            _errors[key].append(time.time())
        if status < 400 and "rewrite" in key:
            _counters["rewrite:success"] += 1
        if status >= 400 and "rewrite" in key:
            _counters["rewrite:failure"] += 1


def _error_rate(route: str) -> tuple[int, bool]:
    now = time.time()
    q = _errors[route]
    while q and now - q[0] > ALERT_ERROR_WINDOW_S:
        q.popleft()
    count = len(q)
    return count, count >= ALERT_ERROR_THRESHOLD


def snapshot() -> dict[str, Any]:
    with _lock:
        routes = sorted({k.split(":")[0] for k in _counters})
        route_stats = {}
        alerts: list[str] = []
        for route in routes:
            lats = list(_latencies[route])
            avg = sum(lats) / len(lats) if lats else 0.0
            err_count, alert = _error_rate(route)
            if alert:
                alerts.append(f"error_spike:{route}")
            route_stats[route] = {
                "count": _counters.get(f"{route}:count", 0),
                "errors": _counters.get(f"{route}:error", 0),
                "avg_latency_ms": round(avg, 1),
                "errors_last_5m": err_count,
            }
        return {
            "build": "SmartWrite RC1 — Data Integrity & AI Safety Hardened",
            "counters": dict(_counters),
            "routes": route_stats,
            "rewrite_success": _counters.get("rewrite:success", 0),
            "rewrite_failure": _counters.get("rewrite:failure", 0),
            "alerts": alerts,
        }
