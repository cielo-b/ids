#!/bin/bash

# Bill Me Platform - Quick Start Script
# Starts all services and runs comprehensive tests

set -e

echo "🚀 Bill Me Platform - Quick Start"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Step 1: Installing dependencies...${NC}"
npm install

echo ""
echo -e "${BLUE}Step 2: Starting all services with Docker...${NC}"
docker-compose up -d

echo ""
echo -e "${YELLOW}Waiting for services to be ready (30 seconds)...${NC}"
sleep 30

echo ""
echo -e "${BLUE}Step 3: Checking service status...${NC}"
docker-compose ps

echo ""
echo -e "${BLUE}Step 4: Running comprehensive tests...${NC}"
./test-system.sh

echo ""
echo -e "${GREEN}✓ System is ready!${NC}"
echo ""
echo "Access Points:"
echo "-------------"
echo "• Auth Service:     http://localhost:3001/api/docs"
echo "• User Service:     http://localhost:3002/api/docs"
echo "• Entity Service:   http://localhost:3003/api/docs"
echo "• Employee Service: http://localhost:3006/api/docs"
echo "• Menu Service:     http://localhost:3007/api/docs"
echo "• Order Service:    http://localhost:3008/api/docs"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"

