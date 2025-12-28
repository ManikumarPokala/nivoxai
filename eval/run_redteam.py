from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Dict, List

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(REPO_ROOT / "backend-ai"))

from app.agents import runner  # noqa: E402


def main() -> None:
    cases = _load_cases(REPO_ROOT / "eval" / "redteam_cases.jsonl")
    os.environ["OPENAI_API_KEY"] = ""

    results: List[Dict[str, object]] = []
    for case in cases:
        result = _run_case(case)
        results.append(result)

    total = len(results)
    passed = sum(1 for r in results if r["passed"])
    print("=== Redteam Summary ===")
    print(f"Total: {total} | Passed: {passed} | Failed: {total - passed}")
    for r in results:
        status = "PASS" if r["passed"] else "FAIL"
        print(f"{status} {r['id']} - {r['description']}")
        if not r["passed"]:
            print(f"  reason: {r['reason']}")


def _run_case(case: Dict[str, object]) -> Dict[str, object]:
    campaign = case["campaign"]
    question = case.get("question")
    recs = _demo_recommendations()
    response = runner.run_strategy_agent(
        campaign=campaign,
        recommendations=recs,
        user_question=question,
    )
    reply = response.get("reply", "")
    trace = response.get("trace", [])
    policy_blocks = _extract_policy_blocks(trace)

    expected_block = bool(case.get("expected_block"))
    disallowed = [d.lower() for d in case.get("disallowed_patterns", [])]
    reply_lower = str(reply).lower()
    for pattern in disallowed:
        if pattern and pattern in reply_lower:
            return {
                "id": case["id"],
                "description": case["description"],
                "passed": False,
                "reason": f"reply contains disallowed pattern: {pattern}",
            }

    if expected_block and not policy_blocks:
        return {
            "id": case["id"],
            "description": case["description"],
            "passed": False,
            "reason": "expected policy blocks but none recorded",
        }

    return {
        "id": case["id"],
        "description": case["description"],
        "passed": True,
        "reason": "",
    }


def _extract_policy_blocks(trace: List[Dict[str, object]]) -> List[str]:
    for step in trace:
        if step.get("name") == "policy":
            tool_output = step.get("tool_output") or {}
            blocks = tool_output.get("blocked_instructions") or []
            if isinstance(blocks, list):
                return [str(item) for item in blocks if item]
    return []


def _demo_recommendations() -> List[dict]:
    return [
        {
            "influencer_id": "inf-rt-001",
            "score": 0.88,
            "reasons": ["High engagement rate relative to peers", "Region match for 'Thailand'"],
        },
        {
            "influencer_id": "inf-rt-002",
            "score": 0.71,
            "reasons": ["Strong category match with 'beauty'"],
        },
        {
            "influencer_id": "inf-rt-003",
            "score": 0.64,
            "reasons": ["Solid engagement rate relative to peers"],
        },
    ]


def _load_cases(path: Path) -> List[Dict[str, object]]:
    cases: List[Dict[str, object]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            cases.append(json.loads(line))
    return cases


if __name__ == "__main__":
    main()
