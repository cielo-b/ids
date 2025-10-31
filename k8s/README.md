# Kubernetes Deployment Guide

This directory contains all Kubernetes manifests for deploying the Bill Me Platform.

## Structure

```
k8s/
├── namespace.yaml              # Namespace definition
├── configmaps/                 # ConfigMaps and Secrets
│   ├── redis-config.yaml
│   ├── gateway-config.yaml
│   ├── auth-service-config.yaml
│   └── ...
├── services/                   # Kubernetes Services
│   ├── redis-service.yaml
│   ├── gateway-service.yaml
│   └── ...
├── deployments/                # Deployments
│   ├── redis-deployment.yaml
│   ├── auth-db-deployment.yaml
│   ├── auth-service-deployment.yaml
│   └── ...
├── deploy.sh                   # Automated deployment script
└── undeploy.sh                 # Cleanup script
```

## Prerequisites

1. **Kubernetes Cluster**
   - Minikube: `minikube start`
   - Kind: `kind create cluster`
   - Docker Desktop: Enable Kubernetes in settings

2. **kubectl**

   ```bash
   # Install kubectl
   curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
   chmod +x kubectl
   sudo mv kubectl /usr/local/bin/
   ```

3. **Docker Images**
   - Build all service images
   - Load them to your Kubernetes cluster

## Quick Start

### 1. Build Docker Images

```bash
# From project root
docker-compose build

# Or build individually
docker build -t billme-api-gateway:latest --build-arg APP_NAME=api-gateway .
docker build -t billme-auth-service:latest --build-arg APP_NAME=auth-service .
# ... repeat for all services
```

### 2. Load Images to Kubernetes

**For Minikube:**

```bash
minikube image load billme-api-gateway:latest
minikube image load billme-auth-service:latest
# ... repeat for all services
```

**For Kind:**

```bash
kind load docker-image billme-api-gateway:latest
kind load docker-image billme-auth-service:latest
# ... repeat for all services
```

**For Docker Desktop:**
Images in local Docker registry are automatically available.

### 3. Deploy

```bash
cd k8s
./deploy.sh
```

### 4. Check Status

```bash
# Check pods
kubectl get pods -n billme-platform

# Check services
kubectl get svc -n billme-platform

# Check logs
kubectl logs -f deployment/auth-service -n billme-platform
```

### 5. Access Services

**Get API Gateway URL:**

```bash
# For Minikube
minikube service api-gateway-service -n billme-platform --url

# Port forwarding (works for all clusters)
kubectl port-forward svc/api-gateway-service 3000:3000 -n billme-platform
# Then access at http://localhost:3000
```

## Manual Deployment

If you prefer to deploy step by step:

```bash
# 1. Create namespace
kubectl apply -f namespace.yaml

# 2. Deploy Redis
kubectl apply -f deployments/redis-deployment.yaml
kubectl apply -f services/redis-service.yaml

# 3. Deploy ConfigMaps and Secrets
kubectl apply -f configmaps/

# 4. Deploy Databases
kubectl apply -f deployments/ | grep db-deployment
kubectl apply -f services/ | grep db-service

# 5. Wait for databases
kubectl wait --for=condition=ready pod -l app=auth-db -n billme-platform

# 6. Deploy Services
kubectl apply -f deployments/
kubectl apply -f services/

# 7. Wait for all services
kubectl wait --for=condition=available --timeout=300s deployment --all -n billme-platform
```

## Undeploy

```bash
cd k8s
./undeploy.sh
```

Or manually:

```bash
kubectl delete namespace billme-platform
```

## Scaling

Scale services horizontally:

```bash
# Scale auth service to 3 replicas
kubectl scale deployment auth-service --replicas=3 -n billme-platform

# Scale all services
kubectl scale deployment --all --replicas=3 -n billme-platform
```

## Resource Management

Current resource limits per pod:

- **Memory**: 256Mi request, 512Mi limit
- **CPU**: 100m request, 500m limit

To modify, edit the deployment files in `deployments/`.

## Troubleshooting

### Pods not starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n billme-platform

# Check logs
kubectl logs <pod-name> -n billme-platform

# Check events
kubectl get events -n billme-platform --sort-by='.lastTimestamp'
```

### Service not accessible

```bash
# Check service endpoints
kubectl get endpoints -n billme-platform

# Check service
kubectl describe svc <service-name> -n billme-platform
```

### Database connection issues

```bash
# Check database pod
kubectl logs deployment/auth-db -n billme-platform

# Check if database is ready
kubectl get pods -l app=auth-db -n billme-platform
```

## Production Considerations

For production deployment, consider:

1. **Persistent Volumes**: Replace `emptyDir` with PersistentVolumeClaims
2. **Resource Limits**: Adjust based on workload
3. **Replicas**: Increase for high availability
4. **Secrets Management**: Use external secret management (e.g., Sealed Secrets, Vault)
5. **Ingress**: Add Ingress controller for external access
6. **Monitoring**: Add Prometheus and Grafana
7. **Logging**: Integrate with ELK stack or similar
8. **CI/CD**: Set up automated deployment pipelines

## Author

**D Regis**  
📧 GitHub: [github.com/cielo-b](https://github.com/cielo-b)  
📱 Phone: 0790539402
