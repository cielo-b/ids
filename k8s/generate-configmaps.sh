#!/bin/bash

# Generate ConfigMaps for all services
SERVICES=(
  "user-service:3002:user-db-service:billme_user:billme_users:billme_user_pass"
  "entity-service:3003:entity-db-service:billme_entity:billme_entities:billme_entity_pass"
  "subscription-service:3004:subscription-db-service:billme_subscription:billme_subscriptions:billme_subscription_pass"
  "manager-service:3005:manager-db-service:billme_manager:billme_managers:billme_manager_pass"
  "employee-service:3006:employee-db-service:billme_employee:billme_employees:billme_employee_pass"
  "menu-service:3007:menu-db-service:billme_menu:billme_menus:billme_menu_pass"
  "order-service:3008:order-db-service:billme_order:billme_orders:billme_order_pass"
  "payment-service:3009:payment-db-service:billme_payment:billme_payments:billme_payment_pass"
  "receipt-service:3010:receipt-db-service:billme_receipt:billme_receipts:billme_receipt_pass"
  "notification-service:3011:notification-db-service:billme_notification:billme_notifications:billme_notification_pass"
  "audit-service:3012:audit-db-service:billme_audit:billme_audit:billme_audit_pass"
  "report-service:3013:report-db-service:billme_report:billme_reports:billme_report_pass"
)

for service_info in "${SERVICES[@]}"; do
  IFS=':' read -r service_name port db_service db_user db_name db_pass <<< "$service_info"
  
  configmap_name="${service_name}-config"
  secret_name="${service_name}-secrets"
  
  cat > k8s/configmaps/${service_name}-config.yaml << YAML
apiVersion: v1
kind: ConfigMap
metadata:
  name: ${configmap_name}
  namespace: billme-platform
data:
  NODE_ENV: development
  PORT: "${port}"
  POSTGRES_HOST: ${db_service}
  POSTGRES_PORT: "5432"
  POSTGRES_USER: ${db_user}
  POSTGRES_DB: ${db_name}
  REDIS_HOST: redis-service
  REDIS_PORT: "6379"

---
apiVersion: v1
kind: Secret
metadata:
  name: ${secret_name}
  namespace: billme-platform
type: Opaque
stringData:
  POSTGRES_PASSWORD: ${db_pass}
YAML
  
  echo "Generated ${service_name} ConfigMap and Secret"
done

echo "✅ All ConfigMaps generated!"
