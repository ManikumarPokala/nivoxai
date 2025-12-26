from __future__ import annotations

import math
from typing import List


def dcg(relevances: List[float], k: int) -> float:
    if k <= 0:
        return 0.0
    score = 0.0
    for i, rel in enumerate(relevances[:k]):
        score += rel / math.log2(i + 2)
    return score


def ndcg_at_k(y_true_relevances: List[float], y_pred_order: List[int], k: int) -> float:
    if k <= 0 or not y_true_relevances:
        return 0.0
    ordered_rels = [y_true_relevances[i] for i in y_pred_order[:k]]
    ideal_rels = sorted(y_true_relevances, reverse=True)
    ideal_dcg = dcg(ideal_rels, k)
    if ideal_dcg == 0:
        return 0.0
    return dcg(ordered_rels, k) / ideal_dcg


def precision_at_k(y_true_binary: List[int], y_pred_order: List[int], k: int) -> float:
    if k <= 0 or not y_true_binary:
        return 0.0
    cutoff = min(k, len(y_pred_order))
    if cutoff == 0:
        return 0.0
    hits = sum(y_true_binary[i] for i in y_pred_order[:cutoff])
    return hits / cutoff


def recall_at_k(y_true_binary: List[int], y_pred_order: List[int], k: int) -> float:
    if k <= 0 or not y_true_binary:
        return 0.0
    total_relevant = sum(y_true_binary)
    if total_relevant == 0:
        return 0.0
    cutoff = min(k, len(y_pred_order))
    hits = sum(y_true_binary[i] for i in y_pred_order[:cutoff])
    return hits / total_relevant
