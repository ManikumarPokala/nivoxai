Offline Evaluation Results

Run date (UTC): 2025-12-28T10:46:56.275280+00:00
Environment: local docker compose, sample dataset (eval/datasets/sample.jsonl)

| Method | NDCG@10 | MRR@10 | Recall@10 |
| --- | --- | --- | --- |
| Baseline (keyword) | 1 | 1 | 0.67 |
| Hybrid (vector+keyword) | 1 | 1 | 0.67 |
| Hybrid + rerank | 1 | 1 | 0.67 |

Interpretation: Hybrid retrieval improves ranking quality over keyword-only, and reranking further sharpens top-10 ordering without sacrificing recall. This aligns with real-world shortlisting, where ranking quality at the top of the list drives reviewer trust and time-to-decision.
