#!/bin/bash

# Script to fetch Swagger JSON from all services
# Usage: ./scripts/fetch-all-swagger.sh [output-dir]

set -e

OUTPUT_DIR="${1:-swagger-json}"
BASE_URL="${BASE_URL:-http://localhost}"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Service configurations: name:port
declare -A SERVICES=(
    ["api-gateway"]="3000"
    ["auth-service"]="3001"
    ["user-service"]="3002"
    ["entity-service"]="3003"
    ["subscription-service"]="3004"
    ["manager-service"]="3005"
    ["employee-service"]="3006"
    ["menu-service"]="3007"
    ["order-service"]="3008"
    ["payment-service"]="3009"
    ["receipt-service"]="3010"
    ["notification-service"]="3011"
    ["audit-service"]="3012"
    ["report-service"]="3013"
)

echo "🔍 Fetching Swagger JSON from all services..."
echo "📁 Output directory: $OUTPUT_DIR"
echo ""

SUCCESS_COUNT=0
FAILED_COUNT=0
FAILED_SERVICES=()

# Swagger JSON endpoint (NestJS standard)
JSON_ENDPOINT="/api/docs-json"

# Function to fetch swagger JSON
fetch_swagger() {
    local service_name=$1
    local port=$2
    local url="${BASE_URL}:${port}"
    
    echo -n "  Fetching $service_name (port $port)... "
    
    local full_url="${url}${JSON_ENDPOINT}"
    local output_file="${OUTPUT_DIR}/${service_name}.json"
    
    if curl -s -f -o "$output_file" "$full_url" 2>/dev/null; then
        # Check if the response is valid JSON
        if command -v jq &> /dev/null; then
            if jq empty "$output_file" 2>/dev/null; then
                echo "✅"
                ((SUCCESS_COUNT++))
                return 0
            else
                rm -f "$output_file"
            fi
        else
            # Basic check: first character should be '{'
            if [ "$(head -c 1 "$output_file")" = "{" ]; then
                echo "✅"
                ((SUCCESS_COUNT++))
                return 0
            else
                rm -f "$output_file"
            fi
        fi
    fi
    
    echo "❌ Failed"
    ((FAILED_COUNT++))
    FAILED_SERVICES+=("$service_name")
    return 1
}

# Fetch from all services
for service in "${!SERVICES[@]}"; do
    fetch_swagger "$service" "${SERVICES[$service]}"
done

echo ""
echo "=========================================="
echo "📊 Summary:"
echo "   ✅ Success: $SUCCESS_COUNT"
echo "   ❌ Failed: $FAILED_COUNT"
echo ""

if [ $FAILED_COUNT -gt 0 ]; then
    echo "⚠️  Failed services:"
    for service in "${FAILED_SERVICES[@]}"; do
        echo "   - $service"
    done
    echo ""
    echo "💡 Make sure all services are running:"
    echo "   docker ps | grep billme"
    echo "   or"
    echo "   npm run start:all"
    echo ""
fi

if [ $SUCCESS_COUNT -gt 0 ]; then
    echo "✅ Swagger JSON files saved to: $OUTPUT_DIR/"
    echo ""
    echo "📄 Files created:"
    ls -lh "$OUTPUT_DIR"/*.json 2>/dev/null | awk '{print "   - " $9 " (" $5 ")"}'
    echo ""
    
    # Create merged file if jq is available
    if command -v jq &> /dev/null; then
        echo "🔄 Creating merged swagger file..."
        MERGED_FILE="${OUTPUT_DIR}/all-services-merged.json"
        
        # Start with an empty array
        echo '[]' > "$MERGED_FILE"
        
        # Merge all JSON files
        for file in "$OUTPUT_DIR"/*.json; do
            if [ -f "$file" ] && [ "$(basename "$file")" != "all-services-merged.json" ]; then
                jq -s '.[0] + [.[1:][]]' "$MERGED_FILE" "$file" > "${MERGED_FILE}.tmp" && mv "${MERGED_FILE}.tmp" "$MERGED_FILE"
            fi
        done
        
        # Better merge: combine all services into one object
        echo "{}" > "${MERGED_FILE}"
        for file in "$OUTPUT_DIR"/*.json; do
            if [ -f "$file" ] && [ "$(basename "$file")" != "all-services-merged.json" ]; then
                service_name=$(basename "$file" .json)
                jq --arg name "$service_name" '. + {($name): .}' "$file" | \
                jq -s 'reduce .[] as $item ({}; . + $item)' > "${MERGED_FILE}.tmp" && \
                mv "${MERGED_FILE}.tmp" "$MERGED_FILE"
            fi
        done
        
        echo "✅ Merged file created: $MERGED_FILE"
    else
        echo "💡 Install 'jq' to create a merged file: sudo apt-get install jq"
    fi
fi

echo ""
echo "✨ Done!"

