#!/bin/bash

echo "🗑️  Undeploying Bill Me Platform from Kubernetes"
echo "================================================"

kubectl delete namespace billme-platform --ignore-not-found=true

echo ""
echo "✅ All resources deleted!"

