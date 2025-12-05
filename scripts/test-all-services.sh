#!/bin/bash

# Comprehensive Test Script for Bill Me Platform
# Tests all services and their endpoints

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service ports
declare -A SERVICES=(
  ["API Gateway"]="3000"
  ["Auth Service"]="3001"
  ["User Service"]="3002"
  ["Entity Service"]="3003"
  ["Subscription Service"]="3004"
  ["Manager Service"]="3005"
  ["Employee Service"]="3006"
  ["Menu Service"]="3007"
  ["Order Service"]="3008"
  ["Payment Service"]="3009"
  ["Receipt Service"]="3010"
  ["Notification Service"]="3011"
  ["Audit Service"]="3012"
  ["Report Service"]="3013"
)

echo -e "${BLUE}🧪 Bill Me Platform - Service Testing${NC}"
echo "=========================================="
echo ""

# Function to test service health
test_service() {
  local service_name=$1
  local port=$2
  local endpoint=$3
  
  echo -n "Testing ${service_name} (port ${port})... "
  
  if curl -s -f -o /dev/null -w "%{http_code}" "http://localhost:${port}${endpoint}" | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✅ OK${NC}"
    return 0
  else
    echo -e "${RED}❌ FAILED${NC}"
    return 1
  fi
}

# Function to test Swagger docs
test_swagger() {
  local service_name=$1
  local port=$2
  
  echo -n "  Checking Swagger docs... "
  
  if curl -s -f -o /dev/null "http://localhost:${port}/api/docs" 2>/dev/null; then
    echo -e "${GREEN}✅ Available${NC}"
    echo -e "     ${YELLOW}→ http://localhost:${port}/api/docs${NC}"
    return 0
  else
    echo -e "${YELLOW}⚠️  Not available${NC}"
    return 1
  fi
}

# Test all services
echo -e "${BLUE}Step 1: Testing Service Health${NC}"
echo "-----------------------------------"
echo ""

PASSED=0
FAILED=0

for service in "${!SERVICES[@]}"; do
  port="${SERVICES[$service]}"
  
  # Test health endpoint or root
  if test_service "$service" "$port" "/api/v1/health" || \
     test_service "$service" "$port" "/health" || \
     test_service "$service" "$port" "/"; then
    ((PASSED++))
    test_swagger "$service" "$port"
  else
    ((FAILED++))
  fi
  echo ""
done

echo "-----------------------------------"
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo ""

# Test API Gateway specific endpoints
echo -e "${BLUE}Step 2: Testing API Gateway Routes${NC}"
echo "-----------------------------------"
echo ""

if curl -s -f "http://localhost:3000/api/v1/health" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Gateway Health Check${NC}"
  
  echo -n "Testing Gateway Services Endpoint... "
  if curl -s "http://localhost:3000/api/v1/services" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
  else
    echo -e "${YELLOW}⚠️  Not available${NC}"
  fi
else
  echo -e "${RED}❌ Gateway not responding${NC}"
fi

echo ""

# Test Auth Service endpoints
echo -e "${BLUE}Step 3: Testing Auth Service Endpoints${NC}"
echo "-----------------------------------"
echo ""

if curl -s -f "http://localhost:3001/api/v1/auth/health" > /dev/null 2>&1 || \
   curl -s -f "http://localhost:3001/health" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Auth Service Health Check${NC}"
  
  echo -n "Testing Auth Registration Endpoint... "
  response=$(curl -s -X POST "http://localhost:3001/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Test123!@#","name":"Test User"}' 2>&1)
  
  if echo "$response" | grep -q "email\|error\|validation"; then
    echo -e "${GREEN}✅ Endpoint responding${NC}"
  else
    echo -e "${YELLOW}⚠️  Unexpected response${NC}"
  fi
else
  echo -e "${RED}❌ Auth Service not responding${NC}"
fi

echo ""

# Summary
echo -e "${BLUE}Step 4: Service Access URLs${NC}"
echo "-----------------------------------"
echo ""
echo "API Gateway:"
echo "  • Main: http://localhost:3000"
echo "  • Docs: http://localhost:3000/api/docs"
echo ""
echo "Individual Services:"
for service in "${!SERVICES[@]}"; do
  port="${SERVICES[$service]}"
  echo "  • ${service}: http://localhost:${port}/api/docs"
done
echo ""

# Final summary
echo "=========================================="
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All services are running!${NC}"
else
  echo -e "${YELLOW}⚠️  Some services may not be fully ready yet.${NC}"
  echo -e "${YELLOW}   Wait a few seconds and run this script again.${NC}"
fi
echo ""

