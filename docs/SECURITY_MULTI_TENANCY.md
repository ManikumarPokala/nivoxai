# Multi-Tenancy & RBAC

## Threat Model (Data Isolation)

Primary risks:
- Cross-tenant data leakage in analytics or recommendations.
- Unauthorized tenant access via forged or missing tenant_id claims.
- Admin misuse without explicit override.

Mitigations:
- JWT claims include tenant_id and role; tenant_id is required for protected routes.
- All queries are tenant-scoped on the backend-api.
- Admin override only when `tenant_id` is explicitly provided on request.
- backend-ai requires `X-Tenant-Id` on protected endpoints and filters RAG results by tenant.

## Enforcement Points

- backend-api middleware validates JWT and checks user_tenants membership.
- Tenant scoping on: campaigns, analytics, recommendation logs, events.
- backend-ai validates JWT claims for /recommend, /rag/influencers, /chat-strategy and ignores client-supplied tenant headers.

## Example JWT Payload

```json
{
  "sub": "00000000-0000-0000-0000-000000000002",
  "tenant_id": "00000000-0000-0000-0000-000000000001",
  "role": "brand_user",
  "exp": 1730000000
}
```

## Example Login Flow

```
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nivoxai.local","password":"demo"}'
```

## Example Tenant-Scoped Calls

```
TOKEN=...

curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/v1/analytics/summary
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/v1/campaigns
```

## Admin Override Example

Admins can override tenant scope by providing `tenant_id` explicitly:

```
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/v1/analytics/summary?tenant_id=00000000-0000-0000-0000-000000000003"
```
