# NivoxAI Kubernetes Deployment

## Prerequisites

- kubectl
- minikube or kind

## Build images locally

```
docker build -t nivoxai-backend-ai:latest ./backend-ai
docker build -t nivoxai-backend-api:latest ./backend-api
docker build -t nivoxai-frontend:latest ./frontend
```

## Load images into your cluster

### kind

```
kind load docker-image nivoxai-backend-ai:latest
kind load docker-image nivoxai-backend-api:latest
kind load docker-image nivoxai-frontend:latest
```

### minikube

```
minikube image load nivoxai-backend-ai:latest
minikube image load nivoxai-backend-api:latest
minikube image load nivoxai-frontend:latest
```

## Apply manifests

```
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/backend-ai.yaml
kubectl apply -f k8s/backend-api.yaml
kubectl apply -f k8s/frontend.yaml
```

## Verify

```
kubectl get pods -n nivoxai
```

## Port-forward

```
kubectl -n nivoxai port-forward svc/frontend 3000:3000
kubectl -n nivoxai port-forward svc/backend-api 4000:4000
kubectl -n nivoxai port-forward svc/backend-ai 8000:8000
```
