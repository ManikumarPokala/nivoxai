from __future__ import annotations

import math
from typing import Iterable, List, Sequence, Union


def recall_at_k(
    y_true: Union[Iterable[str], Sequence[int]],
    y_pred: Sequence[Union[str, int]],
    k: int,
) -> float:
    if k <= 0:
        return 0.0
    if _is_index_order(y_true, y_pred):
        total_relevant = sum(y_true)
        if total_relevant == 0:
            return 0.0
        hits = sum(y_true[i] for i in y_pred[: min(k, len(y_pred))])
        return hits / total_relevant
    true_set = set(y_true)
    if not true_set:
        return 0.0
    pred_k = y_pred[:k]
    hits = sum(1 for item in pred_k if item in true_set)
    return hits / len(true_set)


def precision_at_k(
    y_true: Union[Iterable[str], Sequence[int]],
    y_pred: Sequence[Union[str, int]],
    k: int,
) -> float:
    if k <= 0:
        return 0.0
    pred_k = y_pred[:k]
    if not pred_k:
        return 0.0
    if _is_index_order(y_true, y_pred):
        hits = sum(y_true[i] for i in pred_k)
        return hits / len(pred_k)
    true_set = set(y_true)
    hits = sum(1 for item in pred_k if item in true_set)
    return hits / k


def ndcg_at_k(
    y_true: Union[Iterable[str], Sequence[float]],
    y_pred: Sequence[Union[str, int]],
    k: int,
) -> float:
    if k <= 0:
        return 0.0
    if _is_index_order(y_true, y_pred):
        ordered_rels = [y_true[i] for i in y_pred[:k]]
        ideal_rels = sorted(y_true, reverse=True)
        ideal_dcg = dcg(ideal_rels, k)
        if ideal_dcg == 0:
            return 0.0
        return dcg(ordered_rels, k) / ideal_dcg
    true_set = set(y_true)
    if not true_set:
        return 0.0
    relevances = [1.0 if item in true_set else 0.0 for item in y_pred]
    score = dcg(relevances, k)
    ideal = sorted(relevances, reverse=True)
    idcg = dcg(ideal, k)
    if idcg == 0:
        return 0.0
    return score / idcg


def mrr_at_k(y_true: Iterable[str], y_pred: List[str], k: int) -> float:
    true_set = set(y_true)
    for idx, item in enumerate(y_pred[:k], start=1):
        if item in true_set:
            return 1.0 / idx
    return 0.0


def dcg(relevances: Sequence[float], k: int) -> float:
    if k <= 0:
        return 0.0
    score = 0.0
    for idx, rel in enumerate(relevances[:k]):
        score += rel / math.log2(idx + 2)
    return score


def _is_index_order(
    y_true: Union[Iterable[str], Sequence[float], Sequence[int]],
    y_pred: Sequence[Union[str, int]],
) -> bool:
    if not y_pred:
        return False
    if not isinstance(y_pred[0], int):
        return False
    if not isinstance(y_true, (list, tuple)):
        return False
    if not y_true:
        return False
    return isinstance(y_true[0], (int, float))
