from __future__ import annotations

from typing import Dict, List, Tuple

from app.models.schemas import Campaign, Influencer, RecommendationRequest
from app.services.recommender import compute_recommendations

from eval.dataset import load_eval_dataset
from eval.metrics import ndcg_at_k, precision_at_k, recall_at_k


def _build_index_map(influencers: List[dict]) -> Dict[str, int]:
    return {influencer["id"]: idx for idx, influencer in enumerate(influencers)}


def _build_truth_vectors(
    influencers: List[dict], relevance: Dict[str, int]
) -> Tuple[List[float], List[int]]:
    y_true_relevances: List[float] = []
    y_true_binary: List[int] = []
    for influencer in influencers:
        rel = int(relevance.get(influencer["id"], 0))
        y_true_relevances.append(rel)
        y_true_binary.append(1 if rel >= 2 else 0)
    return y_true_relevances, y_true_binary


def _rank_baseline(influencers: List[dict]) -> List[int]:
    ranked = sorted(
        enumerate(influencers),
        key=lambda item: item[1].get("followers", 0),
        reverse=True,
    )
    return [idx for idx, _ in ranked]


def _rank_model(influencers: List[dict], campaign: dict) -> List[int]:
    influencer_models = [Influencer(**inf) for inf in influencers]
    campaign_model = Campaign(**campaign)
    req = RecommendationRequest(campaign=campaign_model, influencers=influencer_models)
    result = compute_recommendations(req, top_n=len(influencers))
    index_map = _build_index_map(influencers)
    return [index_map[item.influencer_id] for item in result.recommendations]


def _compute_metrics(
    y_true_relevances: List[float],
    y_true_binary: List[int],
    order: List[int],
    k: int,
) -> Tuple[float, float, float]:
    return (
        ndcg_at_k(y_true_relevances, order, k),
        precision_at_k(y_true_binary, order, k),
        recall_at_k(y_true_binary, order, k),
    )


def main() -> None:
    dataset = load_eval_dataset()
    agg: Dict[str, List[float]] = {
        "model_ndcg_5": [],
        "model_p_5": [],
        "model_r_5": [],
        "model_ndcg_10": [],
        "model_p_10": [],
        "model_r_10": [],
        "base_ndcg_5": [],
        "base_p_5": [],
        "base_r_5": [],
        "base_ndcg_10": [],
        "base_p_10": [],
        "base_r_10": [],
    }

    print("=== Offline Ranking Eval ===")
    print(f"Campaigns: {len(dataset)}")

    for entry in dataset:
        campaign = entry["campaign"]
        influencers = entry["influencers"]
        relevance = entry["relevance"]

        y_true_rels, y_true_bin = _build_truth_vectors(influencers, relevance)

        model_order = _rank_model(influencers, campaign)
        base_order = _rank_baseline(influencers)

        m5 = _compute_metrics(y_true_rels, y_true_bin, model_order, 5)
        m10 = _compute_metrics(y_true_rels, y_true_bin, model_order, 10)
        b5 = _compute_metrics(y_true_rels, y_true_bin, base_order, 5)
        b10 = _compute_metrics(y_true_rels, y_true_bin, base_order, 10)

        agg["model_ndcg_5"].append(m5[0])
        agg["model_p_5"].append(m5[1])
        agg["model_r_5"].append(m5[2])
        agg["model_ndcg_10"].append(m10[0])
        agg["model_p_10"].append(m10[1])
        agg["model_r_10"].append(m10[2])
        agg["base_ndcg_5"].append(b5[0])
        agg["base_p_5"].append(b5[1])
        agg["base_r_5"].append(b5[2])
        agg["base_ndcg_10"].append(b10[0])
        agg["base_p_10"].append(b10[1])
        agg["base_r_10"].append(b10[2])

        print(
            f"- {campaign['id']} "
            f"NDCG@5={m5[0]:.2f} P@5={m5[1]:.2f} R@5={m5[2]:.2f} "
            f"| Baseline NDCG@5={b5[0]:.2f}"
        )

    def mean(values: List[float]) -> float:
        return sum(values) / len(values) if values else 0.0

    print("")
    print("Model (weighted ranker) vs Baseline (followers)")
    print(
        f"NDCG@5: model {mean(agg['model_ndcg_5']):.2f} | baseline {mean(agg['base_ndcg_5']):.2f}"
    )
    print(
        f"Precision@5: model {mean(agg['model_p_5']):.2f} | baseline {mean(agg['base_p_5']):.2f}"
    )
    print(
        f"Recall@5: model {mean(agg['model_r_5']):.2f} | baseline {mean(agg['base_r_5']):.2f}"
    )
    print(
        f"NDCG@10: model {mean(agg['model_ndcg_10']):.2f} | baseline {mean(agg['base_ndcg_10']):.2f}"
    )
    print(
        f"Precision@10: model {mean(agg['model_p_10']):.2f} | baseline {mean(agg['base_p_10']):.2f}"
    )
    print(
        f"Recall@10: model {mean(agg['model_r_10']):.2f} | baseline {mean(agg['base_r_10']):.2f}"
    )


if __name__ == "__main__":
    main()
