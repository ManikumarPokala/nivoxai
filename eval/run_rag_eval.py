from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, List

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(REPO_ROOT / "backend-ai"))

from app.services.rag import search_influencers  # noqa: E402
from metrics import mrr_at_k, ndcg_at_k, precision_at_k, recall_at_k  # noqa: E402

INFLUENCER_TO_DOC = {
    "inf-001": "doc-001",
    "inf-002": "doc-002",
    "inf-003": "doc-003",
    "inf-004": "doc-004",
    "inf-005": "doc-005",
    "inf-006": "doc-006",
    "inf-007": "doc-007",
    "inf-008": "doc-008",
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Run RAG evaluation.")
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--k", default="5,10")
    parser.add_argument("--mode", default="hybrid")
    parser.add_argument("--rerank", action="store_true")
    args = parser.parse_args()

    ks = [int(value.strip()) for value in args.k.split(",") if value.strip()]
    dataset = _load_dataset(Path(args.dataset))

    per_sample: List[Dict[str, float]] = []
    for sample in dataset:
        query = sample["brand_query"]
        results = search_influencers(query, top_k=max(ks), mode=args.mode, rerank=args.rerank)
        predicted_ids = [doc.id for doc, _ in results]
        truth = [INFLUENCER_TO_DOC.get(item, item) for item in sample["ground_truth_influencer_ids"]]

        metrics: Dict[str, float] = {}
        for k in ks:
            metrics[f"recall@{k}"] = recall_at_k(truth, predicted_ids, k)
            metrics[f"precision@{k}"] = precision_at_k(truth, predicted_ids, k)
            metrics[f"ndcg@{k}"] = ndcg_at_k(truth, predicted_ids, k)
            metrics[f"mrr@{k}"] = mrr_at_k(truth, predicted_ids, k)

        per_sample.append(metrics)

    summary = _aggregate(per_sample)
    _print_summary("RAG", summary)


def _load_dataset(path: Path) -> List[Dict[str, object]]:
    data: List[Dict[str, object]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            data.append(json.loads(line))
    return data


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
