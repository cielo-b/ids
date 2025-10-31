#!/bin/bash

# Generate deployments for databases
DB_SERVICES=(
  "auth-db:5432:billme_auth:billme_auth_pass:billme_auth"
  "user-db:5432:billme_user:billme_user_pass:billme_users"
  "entity-db:5432:billme_entity:billme_entity_pass:billme_entities"
  "subscription-db:5432:billme_subscription:billme_subscription_pass:billme_subscriptions"
  "manager-db:5432:billme_manager:billme_manager_pass:billme_managers"
  "employee-db:5432:billme_employee:billme_employee_pass:billme_employees"
  "menu-db:5432:billme_menu:billme_menu_pass:billme_menus"
  "order-db:5432:billme_order:billme_order_pass:billme_orders"
  "payment-db:5432:billme_payment:billme_payment_pass:billme_payments"
  "receipt-db:5432:billme_receipt:billme_receipt_pass:billme_receipts"
  "notification-db:5432:billme_notification:billme_notification_pass:billme_notifications"
  "audit-db:5432:billme_audit:billme_audit_pass:billme_audit"
  "report-db:5432:billme_report:billme_report_pass:billme_reports"
)

for db_info in "${DB_SERVICES[@]}"; do
  IFS=':' read -r db_name port db_user db_pass db_database <<< "$db_info"
  
  deployment_name="${db_name}"
  service_name="${db_name}-service"
  
  cat > k8s/deployments/${db_name}-deployment.yaml << YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${deployment_name}
  namespace: billme-platform
  labels:
    app: ${deployment_name}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${deployment_name}
  template:
    metadata:
      labels:
        app: ${deployment_name}
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          ports:
            - containerPort: ${port}
          env:
            - name: POSTGRES_USER
              value: ${db_user}
            - name: POSTGRES_PASSWORD
              value: ${db_pass}
            - name: POSTGRES_DB
              value: ${db_database}
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
      volumes:
        - name: postgres-data
          emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: ${service_name}
  namespace: billme-platform
  labels:
    app: ${deployment_name}
spec:
  type: ClusterIP
  ports:
    - port: ${port}
      targetPort: ${port}
      protocol: TCP
  selector:
    app: ${deployment_name}
YAML
  
  echo "Generated ${db_name} deployment"
done

# Generate microservice deployments
SERVICES=(
  "api-gateway:3000"
  "auth-service:3001:auth-service-config:auth-service-secrets"
  "user-service:3002:user-service-config:user-service-secrets"
  "entity-service:3003:entity-service-config:entity-service-secrets"
  "subscription-service:3004:subscription-service-config:subscription-service-secrets"
  "manager-service:3005:manager-service-config:manager-service-secrets"
  "employee-service:3006:employee-service-config:employee-service-secrets"
  "menu-service:3007:menu-service-config:menu-service-secrets"
  "order-service:3008:order-service-config:order-service-secrets"
  "payment-service:3009:payment-service-config:payment-service-secrets"
  "receipt-service:3010:receipt-service-config:receipt-service-secrets"
  "notification-service:3011:notification-service-config:notification-service-secrets"
  "audit-service:3012:audit-service-config:audit-service-secrets"
  "report-service:3013:report-service-config:report-service-secrets"
)

for service_info in "${SERVICES[@]}"; do
  IFS=':' read -r service_name port configmap secret <<< "$service_info"
  
  # Default image name
  image_name="billme-${service_name}"
  
  cat > k8s/deployments/${service_name}-deployment.yaml << YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${service_name}
  namespace: billme-platform
  labels:
    app: ${service_name}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ${service_name}
  template:
    metadata:
      labels:
        app: ${service_name}
    spec:
      containers:
        - name: ${service_name}
          image: ${image_name}:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: ${port}
          envFrom:
            - configMapRef:
                name: ${configmap}
            - secretRef:
                name: ${secret}
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /api/docs
              port: ${port}
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/docs
              port: ${port}
            initialDelaySeconds: 10
            periodSeconds: 5
YAML
  
  echo "Generated ${service_name} deployment"
done

echo "✅ All deployments generated!"
