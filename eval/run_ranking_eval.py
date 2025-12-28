from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, List

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(REPO_ROOT / "backend-ai"))

from app.models.schemas import Campaign, Influencer, RecommendationRequest  # noqa: E402
from app.services.recommender import compute_recommendations  # noqa: E402
from metrics import mrr_at_k, ndcg_at_k, precision_at_k, recall_at_k  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Run ranking evaluation.")
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--k", default="5,10")
    args = parser.parse_args()

    ks = [int(value.strip()) for value in args.k.split(",") if value.strip()]
    dataset = _load_dataset(Path(args.dataset))

    per_sample: List[Dict[str, float]] = []
    for sample in dataset:
        campaign = _build_campaign(sample["campaign"])
        influencers = [_build_influencer(raw) for raw in sample["influencers"]]
        request = RecommendationRequest(campaign=campaign, influencers=influencers)
        response = compute_recommendations(request, top_n=len(influencers))
        predicted_ids = [item.influencer_id for item in response.recommendations]
        truth = sample["ground_truth_influencer_ids"]

        metrics: Dict[str, float] = {}
        for k in ks:
            metrics[f"recall@{k}"] = recall_at_k(truth, predicted_ids, k)
            metrics[f"precision@{k}"] = precision_at_k(truth, predicted_ids, k)
            metrics[f"ndcg@{k}"] = ndcg_at_k(truth, predicted_ids, k)
            metrics[f"mrr@{k}"] = mrr_at_k(truth, predicted_ids, k)

        per_sample.append(metrics)

    summary = _aggregate(per_sample)
    _print_summary("Ranking", summary)


def _load_dataset(path: Path) -> List[Dict[str, object]]:
    data: List[Dict[str, object]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            data.append(json.loads(line))
    return data


def _build_campaign(raw: Dict[str, object]) -> Campaign:
    return Campaign(
        id=str(raw["id"]),
        brand_name=str(raw["brand_name"]),
        goal=str(raw["goal"]),
        target_region=str(raw["target_region"]),
        target_age_range=str(raw["target_age_range"]),
        budget=float(raw["budget"]),
        description=str(raw["description"]),
    )


def _build_influencer(raw: Dict[str, object]) -> Influencer:
    return Influencer(
        id=str(raw["id"]),
        name=str(raw["name"]),
        platform=str(raw["platform"]),
        category=str(raw["category"]),
        followers=int(raw["followers"]),
        engagement_rate=float(raw["engagement_rate"]),
        region=str(raw["region"]),
        languages=list(raw["languages"]),
        audience_age_range=str(raw["audience_age_range"]),
        bio=str(raw["bio"]),
    )


def _aggregate(per_sample: List[Dict[str, float]]) -> Dict[str, float]:
    if not per_sample:
        return {}
    totals: Dict[str, float] = {}
    for sample in per_sample:
        for key, value in sample.items():
            totals[key] = totals.get(key, 0.0) + value
    count = len(per_sample)
    return {key: round(value / count, 4) for key, value in totals.items()}


def _print_summary(title: str, summary: Dict[str, float]) -> None:
    print(f"=== {title} Eval ===")
    for key, value in summary.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()
