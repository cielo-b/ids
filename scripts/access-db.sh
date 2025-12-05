#!/bin/bash
# Interactive database access script
# Usage: ./scripts/access-db.sh [database-name]
# Example: ./scripts/access-db.sh user

# Database configurations
declare -A DB_CONFIG=(
    ["auth"]="5433:billme_auth:billme_auth_pass:billme_auth"
    ["user"]="5434:billme_user:billme_user_pass:billme_users"
    ["entity"]="5435:billme_entity:billme_entity_pass:billme_entities"
    ["subscription"]="5436:billme_subscription:billme_subscription_pass:billme_subscriptions"
    ["manager"]="5437:billme_manager:billme_manager_pass:billme_managers"
    ["employee"]="5438:billme_employee:billme_employee_pass:billme_employees"
    ["menu"]="5439:billme_menu:billme_menu_pass:billme_menus"
    ["order"]="5440:billme_order:billme_order_pass:billme_orders"
    ["payment"]="5441:billme_payment:billme_payment_pass:billme_payments"
    ["receipt"]="5442:billme_receipt:billme_receipt_pass:billme_receipts"
    ["notification"]="5443:billme_notification:billme_notification_pass:billme_notifications"
    ["audit"]="5444:billme_audit:billme_audit_pass:billme_audit"
    ["report"]="5445:billme_report:billme_report_pass:billme_reports"
)

# Function to show usage
show_usage() {
    echo "Usage: $0 [database-name]"
    echo ""
    echo "Available databases:"
    for db in "${!DB_CONFIG[@]}"; do
        echo "  - $db"
    done
    echo ""
    echo "Examples:"
    echo "  $0 user          # Access user database"
    echo "  $0 auth          # Access auth database"
    echo "  $0               # Show this help and prompt for selection"
}

# Function to connect to database
connect_db() {
    local db_name=$1
    local config="${DB_CONFIG[$db_name]}"
    
    if [ -z "$config" ]; then
        echo "Error: Unknown database '$db_name'"
        show_usage
        exit 1
    fi
    
    IFS=':' read -r port username password database <<< "$config"
    
    echo "Connecting to $db_name database..."
    echo "Host: localhost"
    echo "Port: $port"
    echo "User: $username"
    echo "Database: $database"
    echo ""
    
    export PGPASSWORD="$password"
    psql -h localhost -p "$port" -U "$username" -d "$database"
    unset PGPASSWORD
}

# Main logic
if [ $# -eq 0 ]; then
    # No argument provided, show interactive menu
    echo "Bill Me Platform - Database Access"
    echo "=================================="
    echo ""
    show_usage
    echo ""
    read -p "Enter database name: " db_name
    if [ -n "$db_name" ]; then
        connect_db "$db_name"
    else
        echo "No database selected. Exiting."
        exit 1
    fi
else
    # Argument provided, connect directly
    connect_db "$1"
fi

