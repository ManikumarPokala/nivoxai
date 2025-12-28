from eval.metrics import dcg, ndcg_at_k, precision_at_k, recall_at_k


def test_eval_metrics_basic():
    y_true_relevances = [3.0, 2.0, 0.0, 1.0]
    y_true_binary = [1, 1, 0, 1]
    y_pred_order = [0, 1, 3, 2]

    assert dcg(y_true_relevances, 2) > 0.0
    assert precision_at_k(y_true_binary, y_pred_order, 2) == 1.0
    assert recall_at_k(y_true_binary, y_pred_order, 2) == 2 / 3
    assert ndcg_at_k(y_true_relevances, y_pred_order, 3) > 0.0
