# Database Access Scripts

This directory contains convenient scripts to access each PostgreSQL database in the Bill Me Platform.

## Quick Access Scripts

Each database has its own dedicated access script:

- `access-auth-db.sh` - Auth database (port 5433)
- `access-user-db.sh` - User database (port 5434)
- `access-entity-db.sh` - Entity database (port 5435)
- `access-subscription-db.sh` - Subscription database (port 5436)
- `access-manager-db.sh` - Manager database (port 5437)
- `access-employee-db.sh` - Employee database (port 5438)
- `access-menu-db.sh` - Menu database (port 5439)
- `access-order-db.sh` - Order database (port 5440)
- `access-payment-db.sh` - Payment database (port 5441)
- `access-receipt-db.sh` - Receipt database (port 5442)
- `access-notification-db.sh` - Notification database (port 5443)
- `access-audit-db.sh` - Audit database (port 5444)
- `access-report-db.sh` - Report database (port 5445)

## Usage

### Individual Database Scripts

Simply run the script for the database you want to access:

```bash
# Access user database
./scripts/access-user-db.sh

# Access auth database
./scripts/access-auth-db.sh

# Access any other database
./scripts/access-<database-name>-db.sh
```

**Note:** You'll be prompted for the password. The passwords are:

- Auth: `billme_auth_pass`
- User: `billme_user_pass`
- Entity: `billme_entity_pass`
- Subscription: `billme_subscription_pass`
- Manager: `billme_manager_pass`
- Employee: `billme_employee_pass`
- Menu: `billme_menu_pass`
- Order: `billme_order_pass`
- Payment: `billme_payment_pass`
- Receipt: `billme_receipt_pass`
- Notification: `billme_notification_pass`
- Audit: `billme_audit_pass`
- Report: `billme_report_pass`

### Interactive Access Script

Use the interactive script to select a database:

```bash
# Show menu and select database
./scripts/access-db.sh

# Or directly specify the database name
./scripts/access-db.sh user
./scripts/access-db.sh auth
./scripts/access-db.sh entity
```

## Requirements

- PostgreSQL client (`psql`) must be installed on your system
- Docker containers must be running
- You must be in the project root directory when running the scripts

## Troubleshooting

### Script not executable

If you get a "Permission denied" error, make the script executable:

```bash
chmod +x scripts/access-*.sh
```

### psql not found

Install PostgreSQL client:

```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# macOS
brew install postgresql

# Fedora/RHEL
sudo dnf install postgresql
```

### Connection refused

Make sure the Docker containers are running:

```bash
docker ps | grep billme
```

If containers are not running, start them:

```bash
docker-compose up -d
```

---

## Swagger JSON Fetching Scripts

### Fetch All Swagger JSON

Fetch Swagger/OpenAPI JSON documentation from all services:

```bash
# Using bash script
./scripts/fetch-all-swagger.sh

# Using Node.js script
node scripts/fetch-all-swagger.js

# Specify custom output directory
./scripts/fetch-all-swagger.sh my-swagger-files
node scripts/fetch-all-swagger.js my-swagger-files
```

**What it does:**

- Fetches Swagger JSON from all 14 services
- Saves individual JSON files for each service
- Creates a merged JSON file with all services combined
- Outputs to `swagger-json/` directory by default

**Service Ports:**

- API Gateway: 3000
- Auth Service: 3001
- User Service: 3002
- Entity Service: 3003
- Subscription Service: 3004
- Manager Service: 3005
- Employee Service: 3006
- Menu Service: 3007
- Order Service: 3008
- Payment Service: 3009
- Receipt Service: 3010
- Notification Service: 3011
- Audit Service: 3012
- Report Service: 3013

**Output:**

- Individual files: `swagger-json/<service-name>.json`
- Merged file: `swagger-json/all-services-merged.json`

**Requirements:**

- All services must be running
- `curl` (for bash script) or Node.js (for JS script)
- Optional: `jq` for better JSON validation (bash script)

**Example:**

```bash
# Make sure services are running
npm run start:all

# In another terminal, fetch all Swagger JSON
./scripts/fetch-all-swagger.sh

# Files will be in swagger-json/ directory
ls -lh swagger-json/
```
