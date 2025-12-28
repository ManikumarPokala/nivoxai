from __future__ import annotations

import math
from typing import Iterable, List


def recall_at_k(y_true: Iterable[str], y_pred: List[str], k: int) -> float:
    true_set = set(y_true)
    if not true_set or k <= 0:
        return 0.0
    pred_k = y_pred[:k]
    hits = sum(1 for item in pred_k if item in true_set)
    return hits / len(true_set)


def precision_at_k(y_true: Iterable[str], y_pred: List[str], k: int) -> float:
    true_set = set(y_true)
    if k <= 0:
        return 0.0
    pred_k = y_pred[:k]
    if not pred_k:
        return 0.0
    hits = sum(1 for item in pred_k if item in true_set)
    return hits / k


def ndcg_at_k(y_true: Iterable[str], y_pred: List[str], k: int) -> float:
    true_set = set(y_true)
    if not true_set or k <= 0:
        return 0.0
    relevances = [1.0 if item in true_set else 0.0 for item in y_pred]
    dcg = _dcg(relevances, k)
    ideal = sorted(relevances, reverse=True)
    idcg = _dcg(ideal, k)
    if idcg == 0:
        return 0.0
    return dcg / idcg


def mrr_at_k(y_true: Iterable[str], y_pred: List[str], k: int) -> float:
    true_set = set(y_true)
    for idx, item in enumerate(y_pred[:k], start=1):
        if item in true_set:
            return 1.0 / idx
    return 0.0


def _dcg(relevances: List[float], k: int) -> float:
    score = 0.0
    for idx, rel in enumerate(relevances[:k]):
        score += rel / math.log2(idx + 2)
    return score
