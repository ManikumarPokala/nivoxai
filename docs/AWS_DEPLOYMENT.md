# AWS Deployment (ECS Fargate + ECR + RDS)

Recommended production path: ECS Fargate services for backend-api and backend-ai, RDS Postgres, and CloudFront/S3 (or ECS) for the frontend. This keeps the demo lightweight and operationally simple.

## ECS Fargate (Recommended)

1) Push images to ECR (backend-api, backend-ai, frontend).
2) Create ECS cluster + task definitions:
   - backend-api service (port 4000)
   - backend-ai service (port 8000)
3) Create an ALB with path-based routing:
   - `/api` → backend-api
   - `/ai` → backend-ai
4) Frontend:
   - Host on S3 + CloudFront (recommended), or
   - Run as ECS service on port 3000 behind ALB.
5) Configure environment variables (see below).
6) Enable demo protections:
   - `DEMO_MODE=true`
   - `DEMO_RATE_LIMIT_MAX`, `DEMO_PAYLOAD_MAX_BYTES`
   - `DEMO_ADMIN_KEY`

## Prerequisites

- AWS account + IAM access
- ECR repositories created
- RDS Postgres instance available
- ALB created (for path routing)

## 1) Create ECR repositories

```bash
aws ecr create-repository --repository-name nivoxai-backend-ai
aws ecr create-repository --repository-name nivoxai-backend-api
aws ecr create-repository --repository-name nivoxai-frontend
```

## 2) GitHub Actions OIDC setup

Create an IAM role that trusts GitHub OIDC and allows ECR push.

- Create IAM role with trust policy for GitHub OIDC
- Attach policy with ECR permissions
- Add GitHub secret `AWS_ROLE_ARN` with the role ARN

Workflow: `.github/workflows/deploy-aws.yml`

## 3) Build and push images

On push to `main`, the workflow builds and pushes:

- `${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/nivoxai-backend-ai:latest`
- `${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/nivoxai-backend-api:latest`
- `${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/nivoxai-frontend:latest`

## 4) Create RDS Postgres

Create an RDS Postgres instance and note:

- Endpoint (hostname)
- Username / password
- Database name

## Environment variables

backend-api:
- `AI_SERVICE_BASE_URL=http://backend-ai:8000`
- `DATABASE_URL=postgres://...`
- `JWT_SECRET=...`
- `DEMO_MODE=true`
- `DEMO_ADMIN_KEY=...`

backend-ai:
- `OPENAI_API_KEY` (optional)
- `DEMO_MODE=true`
- `DEMO_RATE_LIMIT_MAX`, `DEMO_PAYLOAD_MAX_BYTES`

frontend:
- `NEXT_PUBLIC_API_BASE_URL=/api`
- `NEXT_PUBLIC_AI_BASE_URL=/ai`
