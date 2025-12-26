from typing import Dict, Any, List

def review_plan(plan: Dict[str, Any]) -> List[str]:
    notes: List[str] = []
    budget = plan.get("budget", 0)

    if budget and budget < 5000:
        notes.append("Low budget detected: prioritize micro-KOLs with high engagement.")
    notes.append("Ensure brand safety: avoid controversial categories; enforce category allowlist.")
    return notes
