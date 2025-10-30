#!/bin/bash

# Bill Me Platform - Complete System Test Script
# This script tests all services against the SRS requirements

set -e

echo "🚀 Bill Me Platform - Complete System Test"
echo "==========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URLs
AUTH_URL="http://localhost:3001/api/v1"
USER_URL="http://localhost:3002/api/v1"
ENTITY_URL="http://localhost:3003/api/v1"
EMPLOYEE_URL="http://localhost:3006/api/v1"
MENU_URL="http://localhost:3007/api/v1"
ORDER_URL="http://localhost:3008/api/v1"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((TESTS_FAILED++))
    fi
}

echo "Step 1: Checking if all services are running..."
echo "-----------------------------------------------"

# Check all services
SERVICES=("3001:Auth" "3002:User" "3003:Entity" "3006:Employee" "3007:Menu" "3008:Order")

for service in "${SERVICES[@]}"; do
    IFS=':' read -r port name <<< "$service"
    if curl -s "http://localhost:$port/api/docs" > /dev/null 2>&1; then
        print_result 0 "$name Service (port $port)"
    else
        print_result 1 "$name Service (port $port) - NOT RUNNING"
    fi
done

echo ""
echo "Step 2: Testing SRS Requirement - User Registration & Authentication"
echo "---------------------------------------------------------------------"

# Test 1: Register Super Admin
echo "Test: Register Super Admin..."
REGISTER_RESPONSE=$(curl -s -X POST "$AUTH_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "System",
    "lastName": "Admin",
    "email": "admin@billme-test.rw",
    "phoneNumber": "+250788000001",
    "password": "Admin@123!",
    "role": "SUPER_ADMIN"
  }')

if echo "$REGISTER_RESPONSE" | grep -q "success"; then
    print_result 0 "Super Admin Registration"
else
    print_result 1 "Super Admin Registration"
fi

# Test 2: Login Super Admin
echo "Test: Login Super Admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$AUTH_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@billme-test.rw",
    "password": "Admin@123!"
  }')

if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
    print_result 0 "Super Admin Login with JWT"
    ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    ADMIN_USER_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
else
    print_result 1 "Super Admin Login"
    ADMIN_TOKEN="dummy-token"
fi

echo ""
echo "Step 3: Testing SRS Requirement - Entity Management (Restaurant)"
echo "----------------------------------------------------------------"

# Test 3: Create Restaurant Entity
echo "Test: Create Restaurant Entity..."
RESTAURANT_RESPONSE=$(curl -s -X POST "$ENTITY_URL/entities" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "La Belle Test Restaurant",
    "description": "Fine dining restaurant for testing",
    "category": "RESTAURANT",
    "ownerId": "'"$ADMIN_USER_ID"'",
    "email": "test@labellerestaurant.rw",
    "phone": "+250788111111",
    "address": "KN 4 Ave, Kigali",
    "city": "Kigali",
    "country": "Rwanda",
    "settings": {
      "taxRate": 18,
      "currency": "RWF",
      "requireTableNumber": true
    }
  }')

if echo "$RESTAURANT_RESPONSE" | grep -q "success"; then
    print_result 0 "Restaurant Entity Creation"
    RESTAURANT_ID=$(echo "$RESTAURANT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
else
    print_result 1 "Restaurant Entity Creation"
    RESTAURANT_ID="dummy-restaurant-id"
fi

echo ""
echo "Step 4: Testing SRS Requirement - Entity Management (Gas Station)"
echo "-----------------------------------------------------------------"

# Test 4: Create Gas Station Entity
echo "Test: Create Gas Station Entity..."
GAS_STATION_RESPONSE=$(curl -s -X POST "$ENTITY_URL/entities" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Total Test Gas Station",
    "description": "Premium fuel services for testing",
    "category": "GAS_STATION",
    "ownerId": "'"$ADMIN_USER_ID"'",
    "email": "test@totalgas.rw",
    "phone": "+250788222222",
    "address": "KN 5 Road, Kigali",
    "city": "Kigali",
    "country": "Rwanda",
    "settings": {
      "currency": "RWF",
      "requireStationNumber": true
    }
  }')

if echo "$GAS_STATION_RESPONSE" | grep -q "success"; then
    print_result 0 "Gas Station Entity Creation"
    GAS_STATION_ID=$(echo "$GAS_STATION_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
else
    print_result 1 "Gas Station Entity Creation"
    GAS_STATION_ID="dummy-gas-station-id"
fi

echo ""
echo "Step 5: Testing SRS Requirement - Employee Management (Waiter)"
echo "--------------------------------------------------------------"

# Test 5: Register Waiter
echo "Test: Register Waiter..."
WAITER_REG=$(curl -s -X POST "$AUTH_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Patrick",
    "lastName": "Waiter",
    "email": "waiter-test@restaurant.rw",
    "phoneNumber": "+250788333333",
    "password": "Waiter@123!",
    "role": "EMPLOYEE"
  }')

if echo "$WAITER_REG" | grep -q "success"; then
    print_result 0 "Waiter User Registration"
    WAITER_USER_ID=$(echo "$WAITER_REG" | grep -o '"userId":"[^"]*"' | cut -d'"' -f4)
else
    print_result 1 "Waiter User Registration"
    WAITER_USER_ID="dummy-waiter-id"
fi

# Test 6: Create Waiter Employee Profile
echo "Test: Create Waiter Employee Profile..."
WAITER_EMP=$(curl -s -X POST "$EMPLOYEE_URL/employees" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "userId": "'"$WAITER_USER_ID"'",
    "entityId": "'"$RESTAURANT_ID"'",
    "position": "Waiter",
    "status": "AVAILABLE"
  }')

if echo "$WAITER_EMP" | grep -q "success"; then
    print_result 0 "Waiter Employee Profile Creation"
    WAITER_EMP_ID=$(echo "$WAITER_EMP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
else
    print_result 1 "Waiter Employee Profile Creation"
    WAITER_EMP_ID="dummy-waiter-emp-id"
fi

echo ""
echo "Step 6: Testing SRS Requirement - Employee Management (Pumpist)"
echo "---------------------------------------------------------------"

# Test 7: Register Pumpist
echo "Test: Register Pumpist..."
PUMPIST_REG=$(curl -s -X POST "$AUTH_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jean",
    "lastName": "Pumpist",
    "email": "pumpist-test@gasstation.rw",
    "phoneNumber": "+250788444444",
    "password": "Pumpist@123!",
    "role": "EMPLOYEE"
  }')

if echo "$PUMPIST_REG" | grep -q "success"; then
    print_result 0 "Pumpist User Registration"
    PUMPIST_USER_ID=$(echo "$PUMPIST_REG" | grep -o '"userId":"[^"]*"' | cut -d'"' -f4)
else
    print_result 1 "Pumpist User Registration"
    PUMPIST_USER_ID="dummy-pumpist-id"
fi

# Test 8: Create Pumpist Employee Profile
echo "Test: Create Pumpist Employee Profile..."
PUMPIST_EMP=$(curl -s -X POST "$EMPLOYEE_URL/employees" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "userId": "'"$PUMPIST_USER_ID"'",
    "entityId": "'"$GAS_STATION_ID"'",
    "position": "Pumpist",
    "status": "AVAILABLE"
  }')

if echo "$PUMPIST_EMP" | grep -q "success"; then
    print_result 0 "Pumpist Employee Profile Creation"
    PUMPIST_EMP_ID=$(echo "$PUMPIST_EMP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
else
    print_result 1 "Pumpist Employee Profile Creation"
    PUMPIST_EMP_ID="dummy-pumpist-emp-id"
fi

echo ""
echo "Step 7: Testing SRS Requirement - Menu Management (Restaurant)"
echo "--------------------------------------------------------------"

# Test 9: Create Restaurant Menu Item with QR Code
echo "Test: Create Restaurant Menu Item with QR Code..."
MENU_ITEM=$(curl -s -X POST "$MENU_URL/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "entityId": "'"$RESTAURANT_ID"'",
    "name": "Grilled Tilapia",
    "description": "Fresh tilapia from Lake Kivu",
    "category": "Main Course",
    "price": 8000,
    "stockQuantity": 50,
    "preparationTime": 25
  }')

if echo "$MENU_ITEM" | grep -q '"qrCode"' && echo "$MENU_ITEM" | grep -q "success"; then
    print_result 0 "Restaurant Menu Item with QR Code"
    MENU_ITEM_ID=$(echo "$MENU_ITEM" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
else
    print_result 1 "Restaurant Menu Item with QR Code"
    MENU_ITEM_ID="dummy-menu-item-id"
fi

echo ""
echo "Step 8: Testing SRS Requirement - Menu Management (Gas Station)"
echo "---------------------------------------------------------------"

# Test 10: Create Gas Station Product
echo "Test: Create Gas Station Product..."
FUEL_ITEM=$(curl -s -X POST "$MENU_URL/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "entityId": "'"$GAS_STATION_ID"'",
    "name": "Premium Gasoline",
    "description": "95 Octane",
    "category": "Fuel",
    "price": 1200,
    "inStock": true
  }')

if echo "$FUEL_ITEM" | grep -q "success"; then
    print_result 0 "Gas Station Fuel Product Creation"
else
    print_result 1 "Gas Station Fuel Product Creation"
fi

echo ""
echo "Step 9: Testing SRS Requirement - Order Management"
echo "---------------------------------------------------"

# Register Customer
CUSTOMER_REG=$(curl -s -X POST "$AUTH_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Customer",
    "lastName": "Test",
    "email": "customer-test@example.rw",
    "phoneNumber": "+250788555555",
    "password": "Customer@123!",
    "role": "CUSTOMER"
  }')

CUSTOMER_USER_ID=$(echo "$CUSTOMER_REG" | grep -o '"userId":"[^"]*"' | cut -d'"' -f4)

# Login Customer
CUSTOMER_LOGIN=$(curl -s -X POST "$AUTH_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer-test@example.rw",
    "password": "Customer@123!"
  }')

CUSTOMER_TOKEN=$(echo "$CUSTOMER_LOGIN" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# Test 11: Create Order with Tip
echo "Test: Create Order with Tip for Waiter..."
ORDER=$(curl -s -X POST "$ORDER_URL/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -d '{
    "entityId": "'"$RESTAURANT_ID"'",
    "customerId": "'"$CUSTOMER_USER_ID"'",
    "employeeId": "'"$WAITER_EMP_ID"'",
    "tableNumber": "12",
    "items": [
      {
        "menuItemId": "'"$MENU_ITEM_ID"'",
        "menuItemName": "Grilled Tilapia",
        "price": 8000,
        "quantity": 2
      }
    ],
    "tipAmount": 1000
  }')

if echo "$ORDER" | grep -q '"qrCode"' && echo "$ORDER" | grep -q "tipAmount"; then
    print_result 0 "Order Creation with QR Code and Tip"
    ORDER_ID=$(echo "$ORDER" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
else
    print_result 1 "Order Creation with QR Code and Tip"
    ORDER_ID="dummy-order-id"
fi

# Test 12: Update Order Status (Order Lifecycle)
echo "Test: Order Lifecycle - INCOMING to PROCESSING..."
STATUS_UPDATE=$(curl -s -X PATCH "$ORDER_URL/orders/$ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -d '{
    "status": "PROCESSING"
  }')

if echo "$STATUS_UPDATE" | grep -q "PROCESSING"; then
    print_result 0 "Order Status Update (INCOMING → PROCESSING)"
else
    print_result 1 "Order Status Update"
fi

echo ""
echo "Step 10: Testing SRS Requirement - Employee Performance Tracking"
echo "----------------------------------------------------------------"

# Test 13: Get Employee Performance
echo "Test: Get Waiter Performance Metrics..."
PERF=$(curl -s -X GET "$EMPLOYEE_URL/employees/$WAITER_EMP_ID/performance" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$PERF" | grep -q "totalOrders" && echo "$PERF" | grep -q "totalTips"; then
    print_result 0 "Employee Performance Tracking (Orders & Tips)"
else
    print_result 1 "Employee Performance Tracking"
fi

echo ""
echo "Step 11: Testing SRS Requirement - Availability Tracking"
echo "--------------------------------------------------------"

# Test 14: Update Employee Status
echo "Test: Update Employee Availability Status..."
STATUS=$(curl -s -X PATCH "$EMPLOYEE_URL/employees/$WAITER_EMP_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "status": "BUSY"
  }')

if echo "$STATUS" | grep -q "BUSY"; then
    print_result 0 "Employee Availability Status Update"
else
    print_result 1 "Employee Availability Status Update"
fi

# Test 15: Get Available Employees
echo "Test: Get Available Employees for Restaurant..."
AVAILABLE=$(curl -s -X GET "$EMPLOYEE_URL/employees/available/$RESTAURANT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$AVAILABLE" | grep -q "success"; then
    print_result 0 "Available Employees Listing"
else
    print_result 1 "Available Employees Listing"
fi

echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    echo "The Bill Me Platform is fully operational and meets SRS requirements!"
    exit 0
else
    echo -e "${YELLOW}⚠ Some tests failed. Please check the services.${NC}"
    exit 1
fi

