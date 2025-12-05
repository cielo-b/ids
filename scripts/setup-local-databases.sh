#!/bin/bash

# Setup script to create local PostgreSQL databases for all services
# This allows services to run locally without Docker

echo "🗄️  Setting up local PostgreSQL databases for Bill Me Platform..."
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    echo "   Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    echo "   macOS: brew install postgresql"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL server is not running. Please start PostgreSQL:"
    echo "   Ubuntu/Debian: sudo systemctl start postgresql"
    echo "   macOS: brew services start postgresql"
    exit 1
fi

echo "✅ PostgreSQL is installed and running"
echo ""

# Databases and users to create
declare -A databases=(
    ["billme_auth"]="billme_auth:billme_auth_pass"
    ["billme_users"]="billme_user:billme_user_pass"
    ["billme_entities"]="billme_entity:billme_entity_pass"
    ["billme_subscriptions"]="billme_subscription:billme_subscription_pass"
    ["billme_managers"]="billme_manager:billme_manager_pass"
    ["billme_employees"]="billme_employee:billme_employee_pass"
    ["billme_menus"]="billme_menu:billme_menu_pass"
    ["billme_orders"]="billme_order:billme_order_pass"
    ["billme_payments"]="billme_payment:billme_payment_pass"
    ["billme_receipts"]="billme_receipt:billme_receipt_pass"
    ["billme_notifications"]="billme_notification:billme_notification_pass"
    ["billme_audit"]="billme_audit:billme_audit_pass"
    ["billme_reports"]="billme_report:billme_report_pass"
)

# Create databases and users
for db_name in "${!databases[@]}"; do
    IFS=':' read -r username password <<< "${databases[$db_name]}"
    
    echo "📝 Creating database: $db_name with user: $username"
    
    # Create user (will fail if exists, which is OK)
    psql -U postgres -c "CREATE USER $username WITH PASSWORD '$password';" 2>/dev/null || true
    
    # Create database
    psql -U postgres -c "CREATE DATABASE $db_name OWNER $username;" 2>/dev/null || echo "   Database $db_name already exists"
    
    # Grant privileges
    psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $db_name TO $username;" 2>/dev/null
    
    echo "   ✅ Database $db_name ready"
done

echo ""
echo "✅ All databases created successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Ensure Redis is running: redis-cli ping"
echo "   2. Start services using: npm run start:auth (or any other service)"
echo "   3. Services will use local PostgreSQL instead of Docker"
echo ""
