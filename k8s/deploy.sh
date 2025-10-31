#!/bin/bash

set -e

echo "🚀 Deploying Bill Me Platform to Kubernetes"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed${NC}"
    echo "Please install kubectl first"
    exit 1
fi

# Check if minikube or kind is running
if kubectl cluster-info &> /dev/null; then
    echo -e "${GREEN}✅ Kubernetes cluster is accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Kubernetes cluster not accessible${NC}"
    echo ""
    echo "For localhost deployment, you can use:"
    echo "  1. Minikube: minikube start"
    echo "  2. Kind: kind create cluster"
    echo "  3. Docker Desktop Kubernetes (enable in settings)"
    exit 1
fi

echo ""
echo "Step 1: Creating namespace..."
kubectl apply -f namespace.yaml

echo ""
echo "Step 2: Deploying Redis..."
kubectl apply -f deployments/redis-deployment.yaml
kubectl apply -f services/redis-service.yaml

echo ""
echo "Step 3: Deploying ConfigMaps and Secrets..."
kubectl apply -f configmaps/

echo ""
echo "Step 4: Deploying PostgreSQL databases..."
kubectl apply -f deployments/ | grep db-deployment || true

echo ""
echo "Step 5: Deploying database services..."
kubectl apply -f services/ | grep db-service || true

echo ""
echo "Waiting for databases to be ready (30 seconds)..."
sleep 30

echo ""
echo "Step 6: Deploying microservices..."
kubectl apply -f deployments/ | grep -v db-deployment || true

echo ""
echo "Step 7: Deploying microservice services..."
kubectl apply -f services/ | grep -v db-service || true

echo ""
echo "Step 8: Waiting for services to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment --all -n billme-platform

echo ""
echo "============================================"
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Check deployment status:"
echo "  kubectl get pods -n billme-platform"
echo ""
echo "Check services:"
echo "  kubectl get svc -n billme-platform"
echo ""
echo "Get API Gateway URL:"
if command -v minikube &> /dev/null && minikube status &> /dev/null; then
    echo "  minikube service api-gateway-service -n billme-platform --url"
elif kubectl get svc api-gateway-service -n billme-platform &> /dev/null; then
    echo "  kubectl get svc api-gateway-service -n billme-platform"
fi

