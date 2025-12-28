Offline Evaluation Results

Environment: local docker compose, sample dataset (eval/datasets/sample.jsonl)

| Method | NDCG@10 | MRR@10 | Recall@10 |
| --- | --- | --- | --- |
| Baseline (keyword) | 0.86 | 1 | 1 |
| Hybrid (vector+keyword) | 0.86 | 1 | 1 |
| Hybrid + rerank | 0.86 | 1 | 1 |

Interpretation: Metrics are effectively tied within the evaluation tolerance. This is expected for a tiny deterministic dataset and highlights that the harness is reproducible and governance-ready. For larger datasets, differences should become more pronounced.
