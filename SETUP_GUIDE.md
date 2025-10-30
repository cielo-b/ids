# Bill Me Platform - Setup Guide

## Quick Start

### Using Docker (Recommended)

1. **Install dependencies**
```bash
npm install
```

2. **Start all services**
```bash
docker-compose up -d
```

3. **View logs**
```bash
docker-compose logs -f
```

4. **Stop all services**
```bash
docker-compose down
```

### Local Development

1. **Install dependencies**
```bash
npm install
```

2. **Set up environment variables**
```bash
# Create .env file in the root directory
cp .env.example .env
# Edit .env with your configuration
```

3. **Start individual services**

Terminal 1 - Auth Service:
```bash
npm run start:auth
```

Terminal 2 - User Service:
```bash
npm run start:user
```

Terminal 3 - Employee Service:
```bash
npm run start:employee
```

Terminal 4 - Menu Service:
```bash
npm run start:menu
```

Terminal 5 - Order Service:
```bash
npm run start:order
```

Or start all at once:
```bash
npm run start:all
```

## Service Ports

| Service | Port | Swagger Docs |
|---------|------|--------------|
| API Gateway | 3000 | http://localhost:3000/api/docs |
| Auth Service | 3001 | http://localhost:3001/api/docs |
| User Service | 3002 | http://localhost:3002/api/docs |
| Entity Service | 3003 | http://localhost:3003/api/docs |
| Subscription Service | 3004 | http://localhost:3004/api/docs |
| Manager Service | 3005 | http://localhost:3005/api/docs |
| Employee Service | 3006 | http://localhost:3006/api/docs |
| Menu Service | 3007 | http://localhost:3007/api/docs |
| Order Service | 3008 | http://localhost:3008/api/docs |
| Payment Service | 3009 | http://localhost:3009/api/docs |
| Receipt Service | 3010 | http://localhost:3010/api/docs |
| Notification Service | 3011 | http://localhost:3011/api/docs |
| Audit Service | 3012 | http://localhost:3012/api/docs |
| Report Service | 3013 | http://localhost:3013/api/docs |

## Database Access

### PostgreSQL Databases

Each service has its own PostgreSQL database:

```bash
# User Service DB
docker exec -it billme-user-db psql -U billme_user -d billme_users

# Employee Service DB
docker exec -it billme-employee-db psql -U billme_employee -d billme_employees

# Menu Service DB
docker exec -it billme-menu-db psql -U billme_menu -d billme_menus

# Order Service DB
docker exec -it billme-order-db psql -U billme_order -d billme_orders

# ...etc
```

### MongoDB Databases

```bash
# Auth Service DB
docker exec -it billme-auth-db mongosh billme-auth

# Receipt Service DB
docker exec -it billme-receipt-db mongosh billme-receipts

# Notification Service DB
docker exec -it billme-notification-db mongosh billme-notifications

# Audit Service DB
docker exec -it billme-audit-db mongosh billme-audit
```

### Redis

```bash
docker exec -it billme-redis redis-cli
```

## Testing the API

### 1. Register a User

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phoneNumber": "+250788123456",
    "password": "SecurePass123!",
    "role": "CUSTOMER"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### 3. Create Employee

```bash
curl -X POST http://localhost:3006/api/v1/employees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "user-uuid",
    "entityId": "entity-uuid",
    "position": "Waiter",
    "status": "AVAILABLE"
  }'
```

### 4. Create Menu Item

```bash
curl -X POST http://localhost:3007/api/v1/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "entityId": "entity-uuid",
    "name": "Grilled Chicken",
    "description": "Delicious grilled chicken with herbs",
    "category": "Main Course",
    "price": 15.99,
    "stockQuantity": 50
  }'
```

### 5. Create Order

```bash
curl -X POST http://localhost:3008/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "entityId": "entity-uuid",
    "customerId": "customer-uuid",
    "employeeId": "employee-uuid",
    "tableNumber": "12",
    "items": [{
      "menuItemId": "menu-item-uuid",
      "menuItemName": "Grilled Chicken",
      "price": 15.99,
      "quantity": 2
    }],
    "tipAmount": 5.00
  }'
```

## Building for Production

```bash
# Build all services
npm run build:all

# Run in production mode
NODE_ENV=production npm start
```

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process using port
lsof -ti:3001 | xargs kill -9
```

### Database Connection Issues

1. Check if database containers are running:
```bash
docker ps
```

2. Check database logs:
```bash
docker logs billme-user-db
```

3. Restart database:
```bash
docker-compose restart user-db
```

### Clear All Data

```bash
# Stop and remove all containers and volumes
docker-compose down -v
```

## Development Tips

1. **Use Swagger UI** - Each service has interactive API documentation at `/api/docs`

2. **Monitor Logs** - Use `docker-compose logs -f service-name` to watch specific service logs

3. **Database Migrations** - Services use TypeORM synchronize in development (auto-create tables)

4. **Hot Reload** - Local development mode watches for file changes

5. **Environment Variables** - Never commit `.env` file to version control

## Next Steps

1. Implement remaining services (Manager, Payment, Receipt, etc.)
2. Set up API Gateway for unified access
3. Implement comprehensive testing
4. Add CI/CD pipeline
5. Set up monitoring and logging
6. Deploy to production environment

## Support

For issues or questions, please contact: support@idservices.rw

