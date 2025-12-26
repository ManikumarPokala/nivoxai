# AWS EKS Dev Auto-Deploy (ECR + Rolling Updates)

This workflow deploys only to the **dev** namespace (`nivoxai-dev`) on push to `main`.

## One-time AWS setup

1) Create ECR repositories:

```bash
aws ecr create-repository --repository-name nivoxai-backend-ai
aws ecr create-repository --repository-name nivoxai-backend-api
aws ecr create-repository --repository-name nivoxai-frontend
```

2) Create or select an EKS cluster:

```bash
eksctl create cluster --name nivoxai-eks --region <AWS_REGION>
```

3) Configure GitHub OIDC + IAM role:

- Create IAM OIDC provider for GitHub Actions
- Create IAM role for GitHub Actions with trust policy
- Attach permissions:
  - ECR push/pull
  - eks:DescribeCluster
  - sts:AssumeRoleWithWebIdentity

## Required GitHub secrets/vars

**Secrets**
- `AWS_ROLE_TO_ASSUME`

**Variables**
- `AWS_REGION`
- `ECR_REGISTRY`
- `EKS_CLUSTER_NAME`

## Dev overlay configuration

Update placeholders in:

- `k8s/overlays/aws-dev/kustomization.yaml` (`<ECR_REGISTRY>`)
- `k8s/overlays/aws-dev/configmap.yaml` (RDS host / database URL)
- `k8s/overlays/aws-dev/secret.template.yaml` (password placeholders)

## How the workflow deploys

On push to `main`:

1) Build images and push `sha-<shortsha>` + `latest` tags to ECR
2) Apply the dev overlay to `nivoxai-dev`
3) Update deployment images with the `sha-<shortsha>` tags
4) Wait for rollouts to complete

You can also render the overlay locally:

```bash
kubectl kustomize k8s/overlays/aws-dev
```

## Verify

```bash
kubectl -n nivoxai-dev get pods
kubectl -n nivoxai-dev get svc
```

## Port-forward (optional)

```bash
kubectl -n nivoxai-dev port-forward svc/frontend 3000:3000
kubectl -n nivoxai-dev port-forward svc/backend-api 4000:4000
kubectl -n nivoxai-dev port-forward svc/backend-ai 8000:8000
```

## Notes

Secrets are placeholders. For production, use AWS Secrets Manager + External Secrets Operator (ESO).
