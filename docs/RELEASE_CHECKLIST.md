# Release Checklist

Pre-flight
- Confirm environment variables are set (JWT_SECRET, PGHOST/PGUSER/PGPASSWORD, CORS_ORIGINS).
- Ensure docker compose builds cleanly: `docker compose up -d --build`.
- Run tests: `make verify`.

Health & Observability
- backend-api health: `curl http://localhost:4000/health`
- backend-ai health: `curl http://localhost:8000/health`
- request logs: `docker compose logs -f backend-api backend-ai`
- diagnostics drawer in UI shows request IDs for support.

Security & Multi-tenancy
- Validate JWT flow in Settings page (Auth / Session).
- Confirm tenant-scoped analytics return 404 for cross-tenant access.
- Verify viewer role cannot create campaigns or generate strategy.

Performance
- Confirm dashboards load without client-side errors.
- Run eval snapshot: `make eval-save`.

Demo Readiness
- Seed data: `make db-seed`.
- Run demo script: `make demo`.
