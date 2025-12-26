# AWS EKS Auto-Deploy (ECR + Rolling Updates)

This setup builds Docker images on push to `main`, pushes to ECR, and deploys to EKS with rolling updates.

## Required GitHub Secrets/Vars

Add these in GitHub repo settings:

**Secrets**
- `AWS_ROLE_TO_ASSUME` (IAM role ARN for OIDC)

**Variables**
- `AWS_REGION` (e.g., `us-east-1`)
- `ECR_REGISTRY` (e.g., `<acct>.dkr.ecr.<region>.amazonaws.com`)
- `EKS_CLUSTER_NAME` (e.g., `nivoxai-eks`)

## IAM policy outline (OIDC role)

Attach a policy that permits:

- ECR: `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:CompleteLayerUpload`, `ecr:InitiateLayerUpload`, `ecr:PutImage`, `ecr:UploadLayerPart`, `ecr:DescribeRepositories`
- EKS: `eks:DescribeCluster`
- STS: `sts:AssumeRoleWithWebIdentity`

## One-time setup

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

3) Configure the AWS overlay:

Update placeholders in:

- `k8s/overlays/aws/kustomization.yaml` (`<ECR_REGISTRY>`)
- `k8s/overlays/aws/configmap.yaml` (`<RDS_ENDPOINT>`, `DATABASE_URL`)
- `k8s/overlays/aws/secret.template.yaml` (`<RDS_PASSWORD>`)

4) (Optional) Install AWS Load Balancer Controller for Ingress:

https://kubernetes-sigs.github.io/aws-load-balancer-controller/

## How the workflow deploys

On push to `main`:

1) Build images for `backend-ai`, `backend-api`, `frontend`
2) Push to ECR with tags `sha-<shortsha>` and `latest`
3) `kubectl apply -k k8s/overlays/aws`
4) `kubectl set image` for each deployment to the `sha-<shortsha>` tag
5) Wait for rolling updates to complete

## Verify

```bash
kubectl get pods -n nivoxai
kubectl get deploy -n nivoxai
kubectl get ingress -n nivoxai
```

If you need to re-deploy manually:

```bash
kubectl apply -k k8s/overlays/aws
kubectl -n nivoxai rollout restart deploy/backend-ai
kubectl -n nivoxai rollout restart deploy/backend-api
kubectl -n nivoxai rollout restart deploy/frontend
```
