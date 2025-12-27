from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List


@dataclass(frozen=True)
class EvalSample:
    sample_id: str
    brand_query: str
    campaign: dict
    ground_truth_influencer_ids: List[str]


def load_eval_dataset(path: str | Path) -> List[EvalSample]:
    dataset_path = Path(path)
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found: {dataset_path}")

    samples: List[EvalSample] = []
    for line in _read_lines(dataset_path):
        payload = json.loads(line)
        sample_id = payload.get("id", "unknown")
        brand_query = payload.get("brand_query") or payload.get("campaign_brief") or ""
        campaign = payload.get("campaign", {})
        ground_truth = payload.get("ground_truth_influencer_ids", [])
        samples.append(
            EvalSample(
                sample_id=sample_id,
                brand_query=brand_query,
                campaign=campaign,
                ground_truth_influencer_ids=list(ground_truth),
            )
        )
    return samples


def _read_lines(path: Path) -> Iterable[str]:
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            stripped = line.strip()
            if stripped:
                yield stripped
