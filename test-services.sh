#!/bin/bash

# Test script to start services one by one
set -e

echo "🧪 Testing Bill Me Platform Services"
echo "===================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test service
test_service() {
    local SERVICE_NAME=$1
    local PORT=$2
    local COMMAND=$3
    
    echo -e "\n${YELLOW}Testing $SERVICE_NAME on port $PORT...${NC}"
    
    # Start service in background
    eval "$COMMAND" > /tmp/${SERVICE_NAME}.log 2>&1 &
    local PID=$!
    
    # Wait for service to start (max 30 seconds)
    local MAX_WAIT=30
    local WAIT_TIME=0
    while [ $WAIT_TIME -lt $MAX_WAIT ]; do
        sleep 2
        WAIT_TIME=$((WAIT_TIME + 2))
        
        if curl -s http://localhost:${PORT}/api/docs > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $SERVICE_NAME is running on port $PORT${NC}"
            echo "   Swagger docs: http://localhost:${PORT}/api/docs"
            kill $PID 2>/dev/null || true
            return 0
        fi
        
        # Check if process is still alive
        if ! ps -p $PID > /dev/null 2>&1; then
            echo -e "${RED}❌ $SERVICE_NAME failed to start${NC}"
            echo "   Last 10 lines of log:"
            tail -10 /tmp/${SERVICE_NAME}.log
            return 1
        fi
    done
    
    echo -e "${RED}❌ $SERVICE_NAME timed out${NC}"
    kill $PID 2>/dev/null || true
    echo "   Last 10 lines of log:"
    tail -10 /tmp/${SERVICE_NAME}.log
    return 1
}

# Check if Redis is available
echo -e "\n${YELLOW}Checking Redis...${NC}"
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis is running${NC}"
else
    echo -e "${RED}❌ Redis is not running. Please start Redis first.${NC}"
    exit 1
fi

# Check if PostgreSQL containers are running
echo -e "\n${YELLOW}Checking PostgreSQL databases...${NC}"
if docker ps | grep -q billme-auth-db; then
    echo -e "${GREEN}✅ Auth database container is running${NC}"
else
    echo -e "${YELLOW}⚠️  Starting auth database...${NC}"
    docker-compose up -d auth-db
    sleep 3
fi

# Test Auth Service
test_service "auth-service" "3001" "npm run start:auth"

# Test User Service  
test_service "user-service" "3002" "npm run start:user"

# Test Entity Service
test_service "entity-service" "3003" "npm run start:entity"

echo -e "\n${GREEN}✅ All services tested successfully!${NC}"
echo -e "\n${YELLOW}Now starting API Gateway...${NC}"
echo "Starting API Gateway on port 3000..."

