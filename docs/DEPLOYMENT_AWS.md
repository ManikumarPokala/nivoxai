# AWS Deployment

This repo supports a simple CI pipeline that builds Docker images and pushes to GHCR by default (and optionally ECR if configured). You can then deploy with your preferred AWS runtime (ECS, EKS, EC2 + docker-compose).

## Architecture (High Level)

```
                    +--------------------+
                    | GitHub Actions CI  |
                    | build/test/push    |
                    +---------+----------+
                              |
                              v
         +----------------------------------------------+
         | Container Registry (GHCR or ECR optional)    |
         +----------------------+-----------------------+
                                |
                                v
                     +----------------------+
                     | AWS Runtime          |
                     | (ECS/EKS/EC2)        |
                     +----+-----------+-----+
                          |           |
                          v           v
                    backend-api    backend-ai
                          |
                          v
                      Postgres
                          |
                          v
                       frontend
```

## Build + Push (CI)

Workflow: `.github/workflows/build-and-push.yml`

Trigger:
- `push` to `main`
- manual `workflow_dispatch`

The workflow:
- runs basic builds (backend-api, frontend, backend-ai compileall)
- builds Docker images
- pushes to GHCR
- optionally pushes to ECR when AWS secrets are present

## Required Secrets (optional ECR)

If you want ECR pushes:
- `AWS_REGION`
- `ECR_REGISTRY` (e.g. `123456789.dkr.ecr.ap-southeast-1.amazonaws.com`)
- `AWS_ROLE_TO_ASSUME` (OIDC) or `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`

## Deployment Steps (example)

1) Push to `main`:
```
git push origin main
```

2) Pull image in your AWS runtime:
```
docker pull ghcr.io/<owner>/nivoxai-frontend:latest
docker pull ghcr.io/<owner>/nivoxai-backend-api:latest
docker pull ghcr.io/<owner>/nivoxai-backend-ai:latest
```

3) Deploy via ECS/EKS/EC2 (pick one):
- ECS: create/update service task definitions with new image tag.
- EKS: update Deployment image tag and apply.
- EC2: update docker-compose image tags and restart.

EC2 docker-compose image names (GHCR):
- ghcr.io/<owner>/nivoxai-frontend:latest
- ghcr.io/<owner>/nivoxai-backend-api:latest
- ghcr.io/<owner>/nivoxai-backend-ai:latest

Replace `<owner>` with `manikumarpokala` for this repo:
- ghcr.io/manikumarpokala/nivoxai-frontend:latest
- ghcr.io/manikumarpokala/nivoxai-backend-api:latest
- ghcr.io/manikumarpokala/nivoxai-backend-ai:latest

## Versioning

- `backend-ai` `/healthz` includes `git_sha`.
- Frontend footer shows `NEXT_PUBLIC_GIT_SHA`.
- Images are tagged with both `latest` and the full Git SHA.
