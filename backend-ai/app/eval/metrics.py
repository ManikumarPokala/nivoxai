from __future__ import annotations

from typing import Iterable, List
import math


def precision_at_k(y_true: Iterable[str], y_pred: List[str], k: int) -> float:
    if k <= 0:
        return 0.0
    true_set = set(y_true)
    pred_k = y_pred[:k]
    if not pred_k:
        return 0.0
    hits = sum(1 for item in pred_k if item in true_set)
    return hits / k


def recall_at_k(y_true: Iterable[str], y_pred: List[str], k: int) -> float:
    true_set = set(y_true)
    if not true_set:
        return 0.0
    pred_k = y_pred[:k]
    hits = sum(1 for item in pred_k if item in true_set)
    return hits / len(true_set)


def dcg_at_k(relevances: List[float], k: int) -> float:
    if k <= 0:
        return 0.0
    score = 0.0
    for idx, rel in enumerate(relevances[:k]):
        score += rel / _log2(idx + 2)
    return score


def ndcg_at_k(y_true: List[float], y_pred: List[int], k: int) -> float:
    if not y_true:
        return 0.0
    rels = [y_true[idx] if idx < len(y_true) else 0.0 for idx in y_pred]
    dcg = dcg_at_k(rels, k)
    ideal = sorted(y_true, reverse=True)
    idcg = dcg_at_k(ideal, k)
    if idcg == 0:
        return 0.0
    return dcg / idcg


def mean_reciprocal_rank(y_true: Iterable[str], y_pred: List[str]) -> float:
    true_set = set(y_true)
    for idx, item in enumerate(y_pred, start=1):
        if item in true_set:
            return 1.0 / idx
    return 0.0


def _log2(value: int) -> float:
    return math.log2(value)
