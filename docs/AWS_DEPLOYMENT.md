# AWS Deployment (EKS + ECR + RDS)

This guide deploys NivoxAI to EKS using ECR images and an RDS Postgres instance.

## Prerequisites

- AWS account + IAM access
- EKS cluster (eksctl or console)
- kubectl configured for the cluster
- AWS Load Balancer Controller installed
- ECR repositories created
- RDS Postgres instance available

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

## 5) Install AWS Load Balancer Controller

Follow AWS docs for your cluster:

https://kubernetes-sigs.github.io/aws-load-balancer-controller/

## 6) Configure the AWS overlay

Edit placeholders in:

- `k8s/overlays/aws/configmap.yaml`
- `k8s/overlays/aws/secret.template.yaml`
- `k8s/overlays/aws/kustomization.yaml`

Replace:

- `<AWS_ACCOUNT_ID>`
- `<AWS_REGION>`
- `<RDS_ENDPOINT>`
- `<RDS_PASSWORD>`

## 7) Apply manifests

```bash
kubectl apply -k k8s/overlays/aws
```

## 8) Verify

```bash
kubectl get pods -n nivoxai
kubectl get ingress -n nivoxai
```

## 9) Access the services

Update DNS to match the Ingress hosts:

- `nivoxai.example.com` -> frontend
- `api.nivoxai.example.com` -> backend-api

If you prefer to use paths instead of hosts, update `k8s/overlays/aws/ingress.yaml` accordingly.
