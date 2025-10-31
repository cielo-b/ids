#!/bin/bash

SERVICES=(
  "auth-service:3001"
  "user-service:3002"
  "entity-service:3003"
  "subscription-service:3004"
  "manager-service:3005"
  "employee-service:3006"
  "menu-service:3007"
  "order-service:3008"
  "payment-service:3009"
  "receipt-service:3010"
  "notification-service:3011"
  "audit-service:3012"
  "report-service:3013"
)

for service_info in "${SERVICES[@]}"; do
  IFS=':' read -r service_name port <<< "$service_info"
  
  cat > k8s/services/${service_name}-service.yaml << YAML
apiVersion: v1
kind: Service
metadata:
  name: ${service_name}
  namespace: billme-platform
  labels:
    app: ${service_name}
spec:
  type: ClusterIP
  ports:
    - port: ${port}
      targetPort: ${port}
      protocol: TCP
  selector:
    app: ${service_name}
YAML
  
  echo "Generated ${service_name} Service"
done

# Generate database services
DB_SERVICES=(
  "auth-db-service:5432:auth-db"
  "user-db-service:5432:user-db"
  "entity-db-service:5432:entity-db"
  "subscription-db-service:5432:subscription-db"
  "manager-db-service:5432:manager-db"
  "employee-db-service:5432:employee-db"
  "menu-db-service:5432:menu-db"
  "order-db-service:5432:order-db"
  "payment-db-service:5432:payment-db"
  "receipt-db-service:5432:receipt-db"
  "notification-db-service:5432:notification-db"
  "audit-db-service:5432:audit-db"
  "report-db-service:5432:report-db"
)

for db_info in "${DB_SERVICES[@]}"; do
  IFS=':' read -r service_name port db_name <<< "$db_info"
  
  cat > k8s/services/${service_name}.yaml << YAML
apiVersion: v1
kind: Service
metadata:
  name: ${service_name}
  namespace: billme-platform
  labels:
    app: ${db_name}
spec:
  type: ClusterIP
  ports:
    - port: ${port}
      targetPort: ${port}
      protocol: TCP
  selector:
    app: ${db_name}
YAML
  
  echo "Generated ${service_name}"
done

echo "✅ All Services generated!"
