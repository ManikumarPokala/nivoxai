import base64
import hashlib
import hmac
import json
import os
import time

from fastapi.testclient import TestClient

os.environ.setdefault("JWT_SECRET", "dev-jwt-secret")

from app.main import app  # noqa: E402


client = TestClient(app)


def _make_token(tenant_id: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": "user-1",
        "tenant_id": tenant_id,
        "role": "admin",
        "exp": int(time.time()) + 3600,
    }
    header_b64 = _b64encode(header)
    payload_b64 = _b64encode(payload)
    signing_input = f"{header_b64}.{payload_b64}".encode()
    secret = os.environ["JWT_SECRET"].encode()
    signature = hmac.new(secret, signing_input, hashlib.sha256).digest()
    signature_b64 = base64.urlsafe_b64encode(signature).rstrip(b"=").decode()
    return f"{header_b64}.{payload_b64}.{signature_b64}"


def _b64encode(data: dict) -> str:
    encoded = json.dumps(data, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(encoded).rstrip(b"=").decode()


def test_rag_requires_tenant_header():
    response = client.post("/rag/influencers", json={"query": "skincare", "top_k": 3})
    assert response.status_code == 401

    token = _make_token("tenant-a")
    response = client.post(
        "/rag/influencers",
        json={"query": "skincare", "top_k": 3},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200


def test_recommend_requires_tenant_header():
    payload = {
        "campaign": {
            "id": "camp-001",
            "brand_name": "Luma",
            "goal": "Launch skincare",
            "target_region": "Thailand",
            "target_age_range": "18-24",
            "budget": 10000,
            "description": "Skincare launch",
        },
        "influencers": [
            {
                "id": "inf-1",
                "name": "Nina",
                "platform": "Instagram",
                "category": "beauty",
                "followers": 120000,
                "engagement_rate": 0.05,
                "region": "Thailand",
                "languages": ["Thai"],
                "audience_age_range": "18-24",
                "bio": "Skincare creator.",
            }
        ],
    }

    response = client.post("/recommend", json=payload)
    assert response.status_code == 401

    token = _make_token("tenant-a")
    response = client.post(
        "/recommend", json=payload, headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
