import base64
import hashlib
import hmac
import json
import os
import time

from fastapi.testclient import TestClient

os.environ.setdefault("JWT_SECRET", "dev-jwt-secret")

from app.main import app  # noqa: E402
from app.services import rag  # noqa: E402


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


def test_rag_tenant_scope_filters_results():
    original_docs = list(rag.INFLUENCER_DOCS)
    try:
        docs = [
            rag.InfluencerDoc(
                id="doc-tenant-a",
                name="Tenant A Creator",
                bio="Skincare creator in Thailand.",
                category="skincare",
                region="Thailand",
                tenant_id="tenant-a",
                source="test",
                last_updated_at="2025-01-01T00:00:00Z",
            ),
            rag.InfluencerDoc(
                id="doc-tenant-b",
                name="Tenant B Creator",
                bio="Skincare creator in Thailand.",
                category="skincare",
                region="Thailand",
                tenant_id="tenant-b",
                source="test",
                last_updated_at="2025-01-01T00:00:00Z",
            ),
        ]
        rag.refresh_documents(docs)
        token = _make_token("tenant-a")
        response = client.post(
            "/rag/influencers",
            json={"query": "skincare Thailand", "top_k": 5},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload
        for hit in payload:
            assert hit.get("tenant_id") in (None, "tenant-a")
    finally:
        rag.refresh_documents(original_docs)
