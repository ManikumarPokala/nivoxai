from typing import List, Tuple


def review_draft(draft: str, campaign: dict) -> Tuple[bool, List[str]]:
    issues: List[str] = []
    target_region = campaign.get("target_region")
    target_age = campaign.get("target_age_range")

    if target_region and target_region not in draft:
        issues.append("Missing target_region mention.")
    if target_age and target_age not in draft:
        issues.append("Missing target_age_range mention.")

    forbidden = ["guaranteed", "100%"]
    lower_draft = draft.lower()
    for term in forbidden:
        if term in lower_draft:
            issues.append(f"Contains risky claim: '{term}'.")

    return (len(issues) == 0, issues)
