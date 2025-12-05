#!/bin/bash

# Start all services with correct environment variables for local development
# Databases are running in Docker containers with mapped ports

cd "$(dirname "$0")"

# Load .env file if it exists
if [ -f .env ]; then
  echo "📄 Loading environment variables from .env file..."
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
  echo "✅ Environment variables loaded"
  echo ""
fi

echo "🚀 Starting all Bill Me Platform services..."
echo ""

# Export common environment variables (with defaults if not set from .env)
export NODE_ENV=${NODE_ENV:-development}
export REDIS_HOST=${REDIS_HOST:-localhost}
export REDIS_PORT=${REDIS_PORT:-6370}
export JWT_SECRET=${JWT_SECRET:-billme-secret-key-change-in-production}
export JWT_EXPIRATION=${JWT_EXPIRATION:-24h}
export JWT_REFRESH_EXPIRATION=${JWT_REFRESH_EXPIRATION:-7d}
export SUPER_ADMIN_KEY=${SUPER_ADMIN_KEY:-test-super-admin-key}

# Export service URLs for inter-service communication (use localhost for local development)
export AUTH_SERVICE_URL=${AUTH_SERVICE_URL:-http://localhost:3001}
export USER_SERVICE_URL=${USER_SERVICE_URL:-http://localhost:3002}
export ENTITY_SERVICE_URL=${ENTITY_SERVICE_URL:-http://localhost:3003}
export SUBSCRIPTION_SERVICE_URL=${SUBSCRIPTION_SERVICE_URL:-http://localhost:3004}
export MANAGER_SERVICE_URL=${MANAGER_SERVICE_URL:-http://localhost:3005}
export EMPLOYEE_SERVICE_URL=${EMPLOYEE_SERVICE_URL:-http://localhost:3006}
export MENU_SERVICE_URL=${MENU_SERVICE_URL:-http://localhost:3007}
export ORDER_SERVICE_URL=${ORDER_SERVICE_URL:-http://localhost:3008}
export PAYMENT_SERVICE_URL=${PAYMENT_SERVICE_URL:-http://localhost:3009}
export RECEIPT_SERVICE_URL=${RECEIPT_SERVICE_URL:-http://localhost:3010}
export NOTIFICATION_SERVICE_URL=${NOTIFICATION_SERVICE_URL:-http://localhost:3011}
export AUDIT_SERVICE_URL=${AUDIT_SERVICE_URL:-http://localhost:3012}
export REPORT_SERVICE_URL=${REPORT_SERVICE_URL:-http://localhost:3013}

# Start services with concurrently, each with its own environment variables
npx concurrently \
  --names "GATEWAY,AUTH,USER,ENTITY,SUBSCRIPTION,MANAGER,EMPLOYEE,MENU,ORDER,PAYMENT,RECEIPT,NOTIFICATION,AUDIT,REPORT" \
  --prefix-colors "blue,green,yellow,purple,magenta,cyan,white,gray,red,brightBlue,brightGreen,brightYellow,brightMagenta,brightCyan" \
  --kill-others-on-fail false \
  "PORT=3000 npm run start:gateway" \
  "PORT=3001 POSTGRES_HOST=localhost POSTGRES_PORT=5433 POSTGRES_USER=billme_auth POSTGRES_PASSWORD=billme_auth_pass POSTGRES_DB=billme_auth npm run start:auth" \
  "PORT=3002 POSTGRES_HOST=localhost POSTGRES_PORT=5434 POSTGRES_USER=billme_user POSTGRES_PASSWORD=billme_user_pass POSTGRES_DB=billme_users npm run start:user" \
  "PORT=3003 POSTGRES_HOST=localhost POSTGRES_PORT=5435 POSTGRES_USER=billme_entity POSTGRES_PASSWORD=billme_entity_pass POSTGRES_DB=billme_entities npm run start:entity" \
  "PORT=3004 POSTGRES_HOST=localhost POSTGRES_PORT=5436 POSTGRES_USER=billme_subscription POSTGRES_PASSWORD=billme_subscription_pass POSTGRES_DB=billme_subscriptions npm run start:subscription" \
  "PORT=3005 POSTGRES_HOST=localhost POSTGRES_PORT=5437 POSTGRES_USER=billme_manager POSTGRES_PASSWORD=billme_manager_pass POSTGRES_DB=billme_managers npm run start:manager" \
  "PORT=3006 POSTGRES_HOST=localhost POSTGRES_PORT=5438 POSTGRES_USER=billme_employee POSTGRES_PASSWORD=billme_employee_pass POSTGRES_DB=billme_employees npm run start:employee" \
  "PORT=3007 POSTGRES_HOST=localhost POSTGRES_PORT=5439 POSTGRES_USER=billme_menu POSTGRES_PASSWORD=billme_menu_pass POSTGRES_DB=billme_menus npm run start:menu" \
  "PORT=3008 POSTGRES_HOST=localhost POSTGRES_PORT=5440 POSTGRES_USER=billme_order POSTGRES_PASSWORD=billme_order_pass POSTGRES_DB=billme_orders npm run start:order" \
  "PORT=3009 POSTGRES_HOST=localhost POSTGRES_PORT=5441 POSTGRES_USER=billme_payment POSTGRES_PASSWORD=billme_payment_pass POSTGRES_DB=billme_payments npm run start:payment" \
  "PORT=3010 POSTGRES_HOST=localhost POSTGRES_PORT=5442 POSTGRES_USER=billme_receipt POSTGRES_PASSWORD=billme_receipt_pass POSTGRES_DB=billme_receipts npm run start:receipt" \
  "PORT=3011 POSTGRES_HOST=localhost POSTGRES_PORT=5443 POSTGRES_USER=billme_notification POSTGRES_PASSWORD=billme_notification_pass POSTGRES_DB=billme_notifications npm run start:notification" \
  "PORT=3012 POSTGRES_HOST=localhost POSTGRES_PORT=5444 POSTGRES_USER=billme_audit POSTGRES_PASSWORD=billme_audit_pass POSTGRES_DB=billme_audit npm run start:audit" \
  "PORT=3013 POSTGRES_HOST=localhost POSTGRES_PORT=5445 POSTGRES_USER=billme_report POSTGRES_PASSWORD=billme_report_pass POSTGRES_DB=billme_reports npm run start:report"

