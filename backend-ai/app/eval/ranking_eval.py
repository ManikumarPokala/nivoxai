from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

from app.eval.catalog import INFLUENCER_CATALOG
from app.eval.dataset import load_eval_dataset
from app.eval.metrics import mean_reciprocal_rank, ndcg_at_k, precision_at_k, recall_at_k
from app.models.schemas import Campaign, RecommendationRequest
from app.services.recommender import compute_recommendations


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate recommendation ranking quality.")
    parser.add_argument("--dataset", required=True, help="Path to JSONL dataset.")
    parser.add_argument("--k", default="5,10", help="Comma-separated k values.")
    args = parser.parse_args()

    ks = [int(value.strip()) for value in args.k.split(",") if value.strip()]
    dataset = load_eval_dataset(args.dataset)

    per_sample: List[Dict[str, float]] = []
    for sample in dataset:
        campaign = _build_campaign(sample)
        request = RecommendationRequest(campaign=campaign, influencers=INFLUENCER_CATALOG)
        response = compute_recommendations(request, top_n=len(INFLUENCER_CATALOG))
        predicted_ids = [item.influencer_id for item in response.recommendations]

        y_true = sample.ground_truth_influencer_ids
        y_true_rels = [1.0 if influencer_id in y_true else 0.0 for influencer_id in predicted_ids]
        y_pred_order = list(range(len(predicted_ids)))

        metrics: Dict[str, float] = {
            "mrr": mean_reciprocal_rank(y_true, predicted_ids),
        }
        for k in ks:
            metrics[f"precision@{k}"] = precision_at_k(y_true, predicted_ids, k)
            metrics[f"recall@{k}"] = recall_at_k(y_true, predicted_ids, k)
            metrics[f"ndcg@{k}"] = ndcg_at_k(y_true_rels, y_pred_order, k)

        per_sample.append({"id": sample.sample_id, **metrics})

    summary = _aggregate(per_sample, ks)
    payload = {
        "task": "ranking",
        "k": ks,
        "summary": summary,
        "samples": per_sample,
        "dataset": str(args.dataset),
    }
    _write_report(payload)


def _build_campaign(sample) -> Campaign:
    campaign_payload = sample.campaign or {}
    return Campaign(
        id=campaign_payload.get("id", sample.sample_id),
        brand_name=campaign_payload.get("brand_name", "Demo Brand"),
        goal=campaign_payload.get("goal", "Increase awareness"),
        target_region=campaign_payload.get("target_region", "Southeast Asia"),
        target_age_range=campaign_payload.get("target_age_range", "18-34"),
        budget=float(campaign_payload.get("budget", 20000)),
        description=campaign_payload.get(
            "description", sample.brand_query or "Demo campaign brief"
        ),
    )


def _aggregate(per_sample: List[Dict[str, float]], ks: List[int]) -> Dict[str, float]:
    totals: Dict[str, float] = {"mrr": 0.0}
    for k in ks:
        totals[f"precision@{k}"] = 0.0
        totals[f"recall@{k}"] = 0.0
        totals[f"ndcg@{k}"] = 0.0

    if not per_sample:
        return totals

    for sample in per_sample:
        for key in totals:
            totals[key] += sample.get(key, 0.0)

    count = len(per_sample)
    return {key: round(value / count, 4) for key, value in totals.items()}


def _write_report(payload: Dict[str, object]) -> None:
    repo_root = Path(__file__).resolve().parents[3]
    runs_dir = repo_root / "docs" / "eval" / "runs"
    runs_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    json_path = runs_dir / f"{timestamp}.json"
    md_path = runs_dir / f"{timestamp}.md"
    latest_path = runs_dir / "latest.md"

    with json_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)

    table = _format_table(payload)
    md_path.write_text(table, encoding="utf-8")
    latest_path.write_text(table, encoding="utf-8")


def _format_table(payload: Dict[str, object]) -> str:
    summary = payload.get("summary", {})
    lines = [
        "# Ranking Eval Summary",
        "",
        "| Metric | Value |",
        "| --- | --- |",
    ]
    if isinstance(summary, dict):
        for key, value in summary.items():
            lines.append(f"| {key} | {value} |")
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    main()
