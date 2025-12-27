from __future__ import annotations

import csv
import os
import threading
import time
from datetime import datetime, timezone
from typing import List

from app.models.schemas import Influencer
from app.services import rag

LAST_RUN_AT: str | None = None
LAST_ERROR: str | None = None
LAST_RECORDS_UPDATED: int = 0


def run_ingestion() -> int:
    global LAST_RUN_AT, LAST_ERROR, LAST_RECORDS_UPDATED
    LAST_RUN_AT = datetime.now(timezone.utc).isoformat()
    LAST_ERROR = None

    try:
        profiles = _load_profiles()
        docs = [
            rag.InfluencerDoc(
                id=profile.id,
                name=profile.name,
                bio=profile.bio,
                category=profile.category,
                region=profile.region,
            )
            for profile in profiles
        ]
        rag.refresh_documents(docs)
        LAST_RECORDS_UPDATED = len(docs)
        return LAST_RECORDS_UPDATED
    except Exception as exc:
        LAST_ERROR = str(exc)
        raise


def schedule_daily_ingestion(interval_hours: int = 24) -> None:
    def _worker() -> None:
        while True:
            run_ingestion()
            time.sleep(interval_hours * 3600)

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()


def _load_profiles() -> List[Influencer]:
    csv_path = os.environ.get("INGESTION_CSV_PATH")
    if csv_path and os.path.exists(csv_path):
        return _load_csv_profiles(csv_path)
    return _mock_profiles()


def _load_csv_profiles(path: str) -> List[Influencer]:
    profiles: List[Influencer] = []
    with open(path, newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            profiles.append(_profile_from_row(row))
    return profiles


def _profile_from_row(row: dict) -> Influencer:
    now = datetime.now(timezone.utc)
    stats_updated_at = _parse_datetime(row.get("stats_updated_at")) or now
    last_crawled_at = _parse_datetime(row.get("last_crawled_at")) or now

    return Influencer(
        id=row.get("id", "unknown"),
        name=row.get("name", "Unknown"),
        platform=row.get("platform", "Instagram"),
        category=row.get("category", "lifestyle"),
        followers=int(row.get("followers", 0)),
        engagement_rate=float(row.get("engagement_rate", 0.0)),
        region=row.get("region", "Global"),
        languages=[lang.strip() for lang in row.get("languages", "English").split(",")],
        audience_age_range=row.get("audience_age_range", "18-34"),
        bio=row.get("bio", ""),
        source=row.get("source"),
        last_crawled_at=last_crawled_at,
        stats_updated_at=stats_updated_at,
    )


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed
    except ValueError:
        return None


def _mock_profiles() -> List[Influencer]:
    now = datetime.now(timezone.utc)
    return [
        Influencer(
            id="doc-001",
            name="Nina Glow",
            platform="Instagram",
            category="beauty",
            followers=120000,
            engagement_rate=0.062,
            region="Thailand",
            languages=["Thai", "English"],
            audience_age_range="18-24",
            bio="Skincare creator sharing humid-weather routines and glow tips.",
            source="mock",
            last_crawled_at=now,
            stats_updated_at=now,
        ),
        Influencer(
            id="doc-002",
            name="Ari Skin",
            platform="Instagram",
            category="skincare",
            followers=98000,
            engagement_rate=0.058,
            region="Vietnam",
            languages=["Vietnamese", "English"],
            audience_age_range="18-24",
            bio="Ingredient-focused skincare deep dives for sensitive skin.",
            source="mock",
            last_crawled_at=now,
            stats_updated_at=now,
        ),
    ]
