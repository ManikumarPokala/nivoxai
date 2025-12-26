from __future__ import annotations

import os
import time
from datetime import datetime, timezone
from typing import Dict, List, Tuple

from app.agents import planner, reviewer, tools
from app.services.chat_strategy import generate_strategy_reply

LAST_RUN_AT: str | None = None
LAST_ERROR: str | None = None


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _summarize_plan(plan: dict) -> str:
    phases = plan.get("phases", [])
    return f"Generated {len(phases)} phases with measurement and risks."


def _build_deterministic_reply(plan: dict, rec_summary: dict) -> str:
    phases = plan.get("phases", [])
    measurements = plan.get("measurement", [])
    risks = plan.get("risks", [])
    reasons = rec_summary.get("reason_counts", {})

    lines: List[str] = [
        f"Objective: {plan.get('objective')}",
        f"Audience: {plan.get('audience')}",
    ]

    if plan.get("budget"):
        lines.append(f"Budget: {plan.get('budget')}")

    lines.append("Phased Plan:")
    for phase in phases:
        kols = ", ".join(phase.get("kols", [])) or "TBD"
        content = ", ".join(phase.get("content", [])) or "TBD"
        lines.append(
            f"- {phase.get('name')} ({phase.get('duration_days')} days): "
            f"KOLs [{kols}] · Content [{content}]"
        )

    if reasons:
        top_reasons = sorted(reasons.items(), key=lambda x: x[1], reverse=True)[:3]
        reason_text = ", ".join([f"{r} ({c})" for r, c in top_reasons])
        lines.append(f"Top selection reasons: {reason_text}")

    if measurements:
        lines.append(f"Measurement: {', '.join(measurements)}")

    if risks:
        lines.append("Risks:")
        lines.extend([f"- {risk}" for risk in risks])

    return "\n".join(lines)


def run_strategy_agent(
    campaign: dict, recommendations: List[dict], user_question: str | None
) -> Dict[str, object]:
    trace: List[Dict[str, object]] = []
    fallback_used = False
    model_used: str | None = None
    global LAST_RUN_AT, LAST_ERROR
    LAST_RUN_AT = _now_iso()

    try:
        # Plan step
        t0 = time.perf_counter()
        constraints = tools.extract_constraints(campaign)
        rec_summary = tools.summarize_recommendations(recommendations)
        plan = planner.build_plan(constraints, rec_summary, user_question)
        t1 = time.perf_counter()
        ms = (t1 - t0) * 1000
        trace.append(
            {
                "name": "plan",
                "summary": _summarize_plan(plan),
                "latency_ms": max(1, int(round(ms))),
            }
        )

        # Draft step
        t0 = time.perf_counter()
        llm_key = os.environ.get("OPENAI_API_KEY")
        if llm_key:
            model_used = os.environ.get("OPENAI_MODEL")
            draft = generate_strategy_reply(
                campaign=campaign,
                recommendations=recommendations,
                user_question=user_question,
            )
        else:
            draft = _build_deterministic_reply(plan, rec_summary)
            fallback_used = True
        t1 = time.perf_counter()
        ms = (t1 - t0) * 1000
        trace.append(
            {
                "name": "draft",
                "summary": "Generated strategy draft.",
                "latency_ms": max(1, int(round(ms))),
            }
        )

        # Review step
        t0 = time.perf_counter()
        ok, issues = reviewer.review_draft(draft, campaign)
        if not ok:
            fixes = "\n".join([f"- {issue}" for issue in issues])
            draft = f"{draft}\n\nFixes:\n{fixes}"
            ok, issues = reviewer.review_draft(draft, campaign)
        if not ok:
            draft = _build_deterministic_reply(plan, rec_summary)
            fallback_used = True
        t1 = time.perf_counter()
        ms = (t1 - t0) * 1000
        trace.append(
            {
                "name": "review",
                "summary": "Validated draft against campaign constraints.",
                "latency_ms": max(1, int(round(ms))),
            }
        )

        LAST_ERROR = None
        return {
            "reply": draft,
            "trace": trace,
            "model": model_used,
            "fallback_used": fallback_used,
        }
    except Exception as exc:
        LAST_ERROR = str(exc)
        fallback_used = True
        fallback_summary = tools.summarize_recommendations(recommendations)
        fallback_plan = planner.build_plan(
            tools.extract_constraints(campaign), fallback_summary, user_question
        )
        deterministic = _build_deterministic_reply(fallback_plan, fallback_summary)
        trace.append(
            {
                "name": "error",
                "summary": "Fallback to deterministic reply after exception.",
                "latency_ms": None,
            }
        )
        return {
            "reply": deterministic,
            "trace": trace,
            "model": None,
            "fallback_used": fallback_used,
        }


def get_agent_status(default_model: str | None) -> Dict[str, object]:
    return {
        "agent_version": "v1",
        "default_model": default_model,
        "last_run_at": LAST_RUN_AT,
        "last_error": LAST_ERROR,
    }
