#!/bin/bash
echo "🧪 Quick Gateway Test"
echo "===================="
echo ""
echo "The gateway needs to use localhost URLs. Here's what to do:"
echo ""
echo "1. The gateway is currently using: http://auth-service:3001"
echo "2. It should use: http://localhost:3001 (from .env)"
echo ""
echo "Solution: Restart the gateway to load .env file"
echo ""
echo "Checking if auth service is running on localhost:3001..."
if curl -s http://localhost:3001/api/docs > /dev/null 2>&1; then
    echo "✅ Auth service IS running on localhost:3001"
    echo ""
    echo "Testing direct connection:"
    curl -s -X POST http://localhost:3001/api/v1/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"test"}' | jq '.' 2>/dev/null || echo "Response received"
    echo ""
    echo "Since auth service works directly, the gateway just needs restart"
else
    echo "❌ Auth service is NOT running on localhost:3001"
    echo ""
    echo "Starting auth service..."
    npm run start:auth > /tmp/auth-test.log 2>&1 &
    echo "Waiting 10 seconds for service to start..."
    sleep 10
    if curl -s http://localhost:3001/api/docs > /dev/null 2>&1; then
        echo "✅ Auth service started!"
    else
        echo "❌ Auth service failed to start (check /tmp/auth-test.log)"
    fi
fi
echo ""
echo "To fix gateway: Restart it with: npm run start:gateway"
echo "(The gateway needs to be stopped and restarted to load .env)"
