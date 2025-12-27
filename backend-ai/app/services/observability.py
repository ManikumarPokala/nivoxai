from __future__ import annotations

import threading
from typing import Dict, List

_lock = threading.Lock()
_request_counts: Dict[str, int] = {}
_latencies_ms: List[int] = []
_llm_calls: int = 0
_llm_errors: int = 0
_MAX_LATENCIES = 5000


def record_request(route: str, status_code: int, latency_ms: int) -> None:
    key = f"{route}:{status_code}"
    with _lock:
        _request_counts[key] = _request_counts.get(key, 0) + 1
        _latencies_ms.append(latency_ms)
        if len(_latencies_ms) > _MAX_LATENCIES:
            _latencies_ms.pop(0)


def record_llm_call(success: bool) -> None:
    global _llm_calls, _llm_errors
    with _lock:
        _llm_calls += 1
        if not success:
            _llm_errors += 1


def get_metrics() -> Dict[str, object]:
    with _lock:
        counts = dict(_request_counts)
        latencies = list(_latencies_ms)
        llm_calls = _llm_calls
        llm_errors = _llm_errors

    return {
        "request_count": counts,
        "latency_ms": {
            "p50": _percentile(latencies, 50),
            "p95": _percentile(latencies, 95),
        },
        "llm": {
            "calls": llm_calls,
            "errors": llm_errors,
            "error_rate": (llm_errors / llm_calls) if llm_calls else 0.0,
        },
    }


def _percentile(values: List[int], percentile: int) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    k = max(0, min(len(ordered) - 1, int(round((percentile / 100) * (len(ordered) - 1)))))
    return float(ordered[k])
