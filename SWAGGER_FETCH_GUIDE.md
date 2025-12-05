# Swagger JSON Fetching Guide

This guide explains how to fetch Swagger/OpenAPI JSON documentation from all services in the Bill Me Platform.

## Quick Start

```bash
# Fetch all Swagger JSON files
npm run swagger:fetch

# Or using bash script
npm run swagger:fetch:bash

# Or directly
./scripts/fetch-all-swagger.sh
node scripts/fetch-all-swagger.js
```

## What It Does

The script fetches Swagger JSON from all 14 services and:

1. Saves individual JSON files for each service
2. Creates a merged JSON file with all services combined
3. Outputs everything to `swagger-json/` directory (or custom directory)

## Service Ports

| Service              | Port | Swagger UI                     | JSON Endpoint                       |
| -------------------- | ---- | ------------------------------ | ----------------------------------- |
| API Gateway          | 3000 | http://localhost:3000/api/docs | http://localhost:3000/api/docs-json |
| Auth Service         | 3001 | http://localhost:3001/api/docs | http://localhost:3001/api/docs-json |
| User Service         | 3002 | http://localhost:3002/api/docs | http://localhost:3002/api/docs-json |
| Entity Service       | 3003 | http://localhost:3003/api/docs | http://localhost:3003/api/docs-json |
| Subscription Service | 3004 | http://localhost:3004/api/docs | http://localhost:3004/api/docs-json |
| Manager Service      | 3005 | http://localhost:3005/api/docs | http://localhost:3005/api/docs-json |
| Employee Service     | 3006 | http://localhost:3006/api/docs | http://localhost:3006/api/docs-json |
| Menu Service         | 3007 | http://localhost:3007/api/docs | http://localhost:3007/api/docs-json |
| Order Service        | 3008 | http://localhost:3008/api/docs | http://localhost:3008/api/docs-json |
| Payment Service      | 3009 | http://localhost:3009/api/docs | http://localhost:3009/api/docs-json |
| Receipt Service      | 3010 | http://localhost:3010/api/docs | http://localhost:3010/api/docs-json |
| Notification Service | 3011 | http://localhost:3011/api/docs | http://localhost:3011/api/docs-json |
| Audit Service        | 3012 | http://localhost:3012/api/docs | http://localhost:3012/api/docs-json |
| Report Service       | 3013 | http://localhost:3013/api/docs | http://localhost:3013/api/docs-json |

## Usage Examples

### Basic Usage

```bash
# Fetch to default directory (swagger-json/)
npm run swagger:fetch
```

### Custom Output Directory

```bash
# Using Node.js script
node scripts/fetch-all-swagger.js my-api-docs

# Using bash script
./scripts/fetch-all-swagger.sh my-api-docs
```

### Custom Base URL

```bash
# For remote servers
BASE_URL=http://api.example.com node scripts/fetch-all-swagger.js
```

## Output Structure

After running the script, you'll have:

```
swagger-json/
├── api-gateway.json
├── auth-service.json
├── user-service.json
├── entity-service.json
├── subscription-service.json
├── manager-service.json
├── employee-service.json
├── menu-service.json
├── order-service.json
├── payment-service.json
├── receipt-service.json
├── notification-service.json
├── audit-service.json
├── report-service.json
└── all-services-merged.json  # Combined JSON with all services
```

## Individual Service Access

You can also fetch individual service Swagger JSON:

```bash
# Fetch single service
curl http://localhost:3001/api/docs-json > auth-service.json

# Or using the script with a single service
# (modify the script to filter by service name)
```

## Requirements

- All services must be running
- Node.js (for JS script) or bash with curl (for bash script)
- Optional: `jq` for better JSON validation (bash script)

## Troubleshooting

### Services Not Running

If you get connection errors, make sure all services are running:

```bash
# Check running services
docker ps | grep billme

# Or if running locally
npm run start:all
```

### Connection Refused

If a specific service fails:

1. Check if the service is running on the expected port
2. Verify the service is accessible: `curl http://localhost:PORT/api/docs`
3. Check service logs for errors

### Invalid JSON

If you get invalid JSON errors:

- The service might not have Swagger configured
- The service might be returning an error page
- Check the service logs

## Using the Merged JSON

The merged JSON file contains all services in a single object:

```json
{
  "api-gateway": { ... },
  "auth-service": { ... },
  "user-service": { ... },
  ...
}
```

You can use this for:

- API documentation generation
- Postman/Insomnia collection import
- API testing tools
- Documentation websites

## Integration with Tools

### Postman

1. Import the merged JSON file
2. Postman will create a collection with all endpoints

### Swagger UI

1. Use the merged JSON in Swagger UI
2. Or use individual service JSON files

### OpenAPI Generator

```bash
# Generate client SDKs
openapi-generator generate -i swagger-json/all-services-merged.json -g typescript-axios -o ./generated-client
```

## Scripts Location

- Bash script: `scripts/fetch-all-swagger.sh`
- Node.js script: `scripts/fetch-all-swagger.js`
- Documentation: `scripts/README.md`

## Notes

- The scripts automatically detect which services are available
- Failed services are reported in the summary
- The merged file is only created if at least one service succeeds
- All JSON files are properly formatted and validated
