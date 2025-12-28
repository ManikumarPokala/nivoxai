from collections import Counter
from typing import Callable, Dict, List, Tuple

_INSTRUCTION_MARKERS = (
    "ignore previous",
    "system prompt",
    "developer message",
    "tool call",
    "call tool",
    "function call",
    "run function",
    "execute",
    "override",
    "act as",
    "you are now",
    "admin",
    "reset",
    "delete",
    "export",
    "tenant",
    "secret",
    "token",
    "api key",
)


def sanitize_text(text: str) -> Tuple[str, List[str]]:
    if not text:
        return text, []
    blocked: List[str] = []
    cleaned: List[str] = []
    for line in text.splitlines():
        lowered = line.lower()
        if any(marker in lowered for marker in _INSTRUCTION_MARKERS):
            blocked.append(line.strip())
            continue
        cleaned.append(line)
    return "\n".join(cleaned).strip(), blocked


def sanitize_campaign(campaign: dict) -> Tuple[dict, List[str]]:
    blocked: List[str] = []
    sanitized = dict(campaign)
    for key in ("brand_name", "goal", "target_region", "target_age_range", "description", "title"):
        value = sanitized.get(key)
        if isinstance(value, str):
            cleaned, blocked_lines = sanitize_text(value)
            if blocked_lines:
                blocked.extend(blocked_lines)
                sanitized[key] = cleaned
    return sanitized, blocked


def sanitize_recommendations(recommendations: List[dict]) -> Tuple[List[dict], List[str]]:
    blocked: List[str] = []
    sanitized: List[dict] = []
    for rec in recommendations:
        clone = dict(rec)
        reasons = clone.get("reasons")
        if isinstance(reasons, list):
            cleaned_reasons: List[str] = []
            for reason in reasons:
                if isinstance(reason, str):
                    cleaned, blocked_lines = sanitize_text(reason)
                    if blocked_lines:
                        blocked.extend(blocked_lines)
                    if cleaned:
                        cleaned_reasons.append(cleaned)
                else:
                    cleaned_reasons.append(reason)
            clone["reasons"] = cleaned_reasons
        sanitized.append(clone)
    return sanitized, blocked


def summarize_recommendations(
    recommendations: List[dict], top_n: int = 5
) -> Dict[str, object]:
    top = sorted(recommendations, key=lambda r: r.get("score", 0), reverse=True)[
        :top_n
    ]
    reason_counter: Counter[str] = Counter()
    for rec in top:
        for reason in rec.get("reasons", []) or []:
            if isinstance(reason, str) and reason.strip():
                reason_counter[reason.strip()] += 1

    return {
        "top": [
            {
                "influencer_id": rec.get("influencer_id"),
                "score": rec.get("score"),
                "reasons": rec.get("reasons", []),
            }
            for rec in top
        ],
        "reason_counts": dict(reason_counter),
    }


def extract_constraints(campaign: dict) -> Dict[str, object]:
    return {
        "brand_name": campaign.get("brand_name"),
        "goal": campaign.get("goal"),
        "target_region": campaign.get("target_region"),
        "target_age_range": campaign.get("target_age_range"),
        "budget": campaign.get("budget"),
        "description": campaign.get("description"),
    }


def validate_tool_call(name: str, payload: dict) -> None:
    validators: Dict[str, Callable[[dict], None]] = {
        "extract_constraints": _validate_extract_constraints,
        "summarize_recommendations": _validate_summarize_recommendations,
        "build_plan": _validate_build_plan,
        "review_draft": _validate_review_draft,
    }
    if name not in validators:
        raise ValueError(f"Tool '{name}' is not allowlisted.")
    validators[name](payload)


def _validate_extract_constraints(payload: dict) -> None:
    if not isinstance(payload.get("campaign"), dict):
        raise ValueError("extract_constraints requires campaign dict.")


def _validate_summarize_recommendations(payload: dict) -> None:
    recs = payload.get("recommendations")
    if not isinstance(recs, list):
        raise ValueError("summarize_recommendations requires recommendations list.")
    top_n = payload.get("top_n")
    if top_n is not None and not isinstance(top_n, int):
        raise ValueError("summarize_recommendations top_n must be int.")


def _validate_build_plan(payload: dict) -> None:
    if not isinstance(payload.get("campaign"), dict):
        raise ValueError("build_plan requires campaign dict.")
    if not isinstance(payload.get("rec_summary"), dict):
        raise ValueError("build_plan requires rec_summary dict.")


def _validate_review_draft(payload: dict) -> None:
    if not isinstance(payload.get("campaign"), dict):
        raise ValueError("review_draft requires campaign dict.")
    if not isinstance(payload.get("draft"), str):
        raise ValueError("review_draft requires draft string.")
