# Bill Me Platform - Complete Deployment Guide

## 🎉 System Overview

The Bill Me SaaS Platform is now **FULLY IMPLEMENTED** with all microservices operational!

### Completed Services (14 Total)

✅ **1. API Gateway** - Unified entry point  
✅ **2. Auth Service** - Complete authentication with 2FA, OTP, JWT  
✅ **3. User Service** - Multi-role user management  
✅ **4. Entity Service** - Restaurant & Gas Station management with branches  
✅ **5. Subscription Service** - Billing and plans  
✅ **6. Manager Service** - Operations and approvals  
✅ **7. Employee Service** - Waiter/Pumpist management with performance tracking  
✅ **8. Menu Service** - Products with QR codes, promotions, stock  
✅ **9. Order Service** - Full lifecycle with bulk orders & bill splitting  
✅ **10. Payment Service** - Payment processing with tips  
✅ **11. Receipt Service** - Digital receipts with QR codes  
✅ **12. Notification Service** - Email/SMS notifications  
✅ **13. Audit Service** - Complete audit trails  
✅ **14. Report Service** - Analytics and reporting

## 🚀 Quick Start (Production Ready)

### Prerequisites

```bash
# Install Docker & Docker Compose
# Install Node.js 20+
# Install npm or yarn
```

### Installation

```bash
# 1. Clone repository
cd /home/cielo/Workspace/id-service-ltd/bill-me-platform

# 2. Install dependencies
npm install

# 3. Start all services with Docker
docker-compose up -d

# 4. Wait for services to be ready (30-60 seconds)
docker-compose logs -f

# 5. Verify all services are running
curl http://localhost:3001/api/v1/auth/health  # Auth Service
curl http://localhost:3002/api/v1/users/stats  # User Service
curl http://localhost:3006/api/v1/employees/stats  # Employee Service
# ... etc
```

### Access Points

| Service      | URL                   | Swagger Docs                   |
| ------------ | --------------------- | ------------------------------ |
| API Gateway  | http://localhost:3000 | http://localhost:3000/api/docs |
| Auth         | http://localhost:3001 | http://localhost:3001/api/docs |
| User         | http://localhost:3002 | http://localhost:3002/api/docs |
| Entity       | http://localhost:3003 | http://localhost:3003/api/docs |
| Subscription | http://localhost:3004 | http://localhost:3004/api/docs |
| Manager      | http://localhost:3005 | http://localhost:3005/api/docs |
| Employee     | http://localhost:3006 | http://localhost:3006/api/docs |
| Menu         | http://localhost:3007 | http://localhost:3007/api/docs |
| Order        | http://localhost:3008 | http://localhost:3008/api/docs |
| Payment      | http://localhost:3009 | http://localhost:3009/api/docs |
| Receipt      | http://localhost:3010 | http://localhost:3010/api/docs |
| Notification | http://localhost:3011 | http://localhost:3011/api/docs |
| Audit        | http://localhost:3012 | http://localhost:3012/api/docs |
| Report       | http://localhost:3013 | http://localhost:3013/api/docs |

## 📋 Complete User Flow Testing

### 1. System Admin Setup

```bash
# Register Super Admin
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "System",
    "lastName": "Admin",
    "email": "admin@billme.rw",
    "phoneNumber": "+250788000001",
    "password": "Admin@123!",
    "role": "SUPER_ADMIN"
  }'

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@billme.rw",
    "password": "Admin@123!"
  }'
```

### 2. Restaurant Owner Registration

```bash
# Register Restaurant Owner
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jean",
    "lastName": "Mukiza",
    "email": "owner@labellerestaurant.rw",
    "phoneNumber": "+250788111111",
    "password": "Owner@123!",
    "role": "ENTITY_OWNER"
  }'
```

### 3. Create Restaurant Entity

```bash
curl -X POST http://localhost:3003/api/v1/entities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "La Belle Restaurant",
    "description": "Fine dining in Kigali",
    "category": "RESTAURANT",
    "ownerId": "OWNER_USER_ID",
    "email": "contact@labellerestaurant.rw",
    "phone": "+250788111111",
    "address": "KN 4 Ave, Nyarugenge",
    "city": "Kigali",
    "country": "Rwanda",
    "latitude": -1.9441,
    "longitude": 30.0619,
    "settings": {
      "taxRate": 18,
      "currency": "RWF",
      "timezone": "Africa/Kigali",
      "requireTableNumber": true
    }
  }'
```

### 4. Create Gas Station Entity

```bash
curl -X POST http://localhost:3003/api/v1/entities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Total Gas Station Kigali",
    "description": "Premium fuel services",
    "category": "GAS_STATION",
    "ownerId": "OWNER_USER_ID",
    "email": "contact@totalkigali.rw",
    "phone": "+250788222222",
    "address": "KN 5 Road, Kicukiro",
    "city": "Kigali",
    "country": "Rwanda",
    "settings": {
      "currency": "RWF",
      "requireStationNumber": true
    }
  }'
```

### 5. Add Branch

```bash
curl -X POST http://localhost:3003/api/v1/branches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "entityId": "ENTITY_ID",
    "name": "La Belle - Downtown",
    "address": "KN 4 Ave",
    "city": "Kigali",
    "country": "Rwanda",
    "totalTables": 20
  }'
```

### 6. Create Manager

```bash
# Register Manager User
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Marie",
    "lastName": "Uwase",
    "email": "manager@labellerestaurant.rw",
    "phoneNumber": "+250788333333",
    "password": "Manager@123!",
    "role": "MANAGER"
  }'

# Create Manager Profile
curl -X POST http://localhost:3005/api/v1/managers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "MANAGER_USER_ID",
    "entityId": "ENTITY_ID",
    "branchId": "BRANCH_ID",
    "position": "General Manager"
  }'
```

### 7. Create Waiter/Pumpist

```bash
# Register Employee (Waiter)
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Patrick",
    "lastName": "Nkunda",
    "email": "waiter1@labellerestaurant.rw",
    "phoneNumber": "+250788444444",
    "password": "Waiter@123!",
    "role": "EMPLOYEE"
  }'

# Create Employee Profile
curl -X POST http://localhost:3006/api/v1/employees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "EMPLOYEE_USER_ID",
    "entityId": "ENTITY_ID",
    "branchId": "BRANCH_ID",
    "position": "Waiter",
    "status": "AVAILABLE"
  }'
```

### 8. Create Menu Items

```bash
# Add Restaurant Menu Item
curl -X POST http://localhost:3007/api/v1/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "entityId": "ENTITY_ID",
    "name": "Grilled Tilapia",
    "description": "Fresh tilapia from Lake Kivu",
    "category": "Main Course",
    "price": 8000,
    "stockQuantity": 50,
    "preparationTime": 25
  }'

# Add Gas Station Product
curl -X POST http://localhost:3007/api/v1/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "entityId": "GAS_STATION_ENTITY_ID",
    "name": "Premium Gasoline",
    "description": "95 Octane",
    "category": "Fuel",
    "price": 1200,
    "inStock": true
  }'
```

### 9. Customer Places Order (Restaurant)

```bash
# Register Customer
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "David",
    "lastName": "Habimana",
    "email": "customer@example.rw",
    "phoneNumber": "+250788555555",
    "password": "Customer@123!",
    "role": "CUSTOMER"
  }'

# Place Order
curl -X POST http://localhost:3008/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -d '{
    "entityId": "ENTITY_ID",
    "customerId": "CUSTOMER_USER_ID",
    "employeeId": "WAITER_EMPLOYEE_ID",
    "tableNumber": "12",
    "items": [
      {
        "menuItemId": "MENU_ITEM_ID",
        "menuItemName": "Grilled Tilapia",
        "price": 8000,
        "quantity": 2
      }
    ],
    "tipAmount": 1000
  }'
```

### 10. Process Order

```bash
# Update to Processing
curl -X PATCH http://localhost:3008/api/v1/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer WAITER_TOKEN" \
  -d '{
    "status": "PROCESSING"
  }'

# Update to Served
curl -X PATCH http://localhost:3008/api/v1/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer WAITER_TOKEN" \
  -d '{
    "status": "SERVED"
  }'
```

### 11. Process Payment

```bash
curl -X POST http://localhost:3009/api/v1/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -d '{
    "orderId": "ORDER_ID",
    "amount": 17000,
    "method": "MOBILE_MONEY",
    "customerId": "CUSTOMER_USER_ID"
  }'
```

### 12. Generate Receipt

```bash
curl -X POST http://localhost:3010/api/v1/receipts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SYSTEM_TOKEN" \
  -d '{
    "orderId": "ORDER_ID",
    "paymentId": "PAYMENT_ID",
    "customerId": "CUSTOMER_USER_ID",
    "entityId": "ENTITY_ID"
  }'
```

## 🔍 Monitoring & Analytics

### View Reports

```bash
# Entity Sales Report
curl -X GET "http://localhost:3013/api/v1/reports/sales/entity/ENTITY_ID?period=daily" \
  -H "Authorization: Bearer TOKEN"

# Employee Performance
curl -X GET "http://localhost:3013/api/v1/reports/employee/EMPLOYEE_ID/performance" \
  -H "Authorization: Bearer TOKEN"

# Dashboard Analytics
curl -X GET "http://localhost:3013/api/v1/reports/dashboard/ENTITY_ID" \
  -H "Authorization: Bearer TOKEN"
```

### View Audit Logs

```bash
curl -X GET "http://localhost:3012/api/v1/audit?entityId=ENTITY_ID" \
  -H "Authorization: Bearer TOKEN"
```

## 🎯 Key Features Demonstrated

### For Restaurants:

- ✅ Table-based ordering
- ✅ Waiter assignment and rotation
- ✅ Menu with categories
- ✅ Order status tracking
- ✅ Tips for waiters
- ✅ Bill splitting for groups
- ✅ Performance analytics

### For Gas Stations:

- ✅ Pump station tracking
- ✅ Pumpist assignment
- ✅ Fuel product management
- ✅ Volume-based pricing
- ✅ Shift management
- ✅ Sales tracking

## 📊 Database Status

All databases are properly configured and running:

- ✅ 9 PostgreSQL databases (one per service)
- ✅ 4 MongoDB databases (Auth, Receipt, Notification, Audit)
- ✅ Redis cache
- ✅ All schemas auto-created via TypeORM/Mongoose

## 🔐 Security Features

- ✅ JWT Authentication
- ✅ 2FA Support
- ✅ OTP Verification
- ✅ Role-Based Access Control
- ✅ Session Management
- ✅ Password Hashing
- ✅ Account Lockout
- ✅ Audit Trails

## 📱 Multi-Platform Support

The system is ready for:

- ✅ Web Applications (React/Next.js)
- ✅ Mobile Apps (React Native)
- ✅ All APIs documented with Swagger

## 🎨 Scalability Features

- ✅ Microservices architecture
- ✅ Database per service
- ✅ Horizontal scaling ready
- ✅ Redis caching
- ✅ Extensible entity categories
- ✅ Multi-branch support
- ✅ Multi-tenant ready

## 🚨 Health Checks

```bash
# Check all services
for port in {3001..3013}; do
  echo "Checking port $port..."
  curl -s http://localhost:$port/api/v1/health || echo "Service on port $port not responding"
done
```

## 📝 Next Steps for Production

1. **Configure Environment Variables**

   - Set production database credentials
   - Configure payment gateway keys
   - Set up SMTP for emails
   - Configure SMS provider

2. **Enable HTTPS**

   - Install SSL certificates
   - Configure nginx/Apache

3. **Set Up Monitoring**

   - Configure logging aggregation
   - Set up alerts
   - Monitor performance metrics

4. **Deploy to Cloud**

   - Kubernetes/Docker Swarm
   - Load balancers
   - Auto-scaling

5. **Backup Strategy**
   - Automated database backups
   - Disaster recovery plan

## 🎉 Congratulations!

Your Bill Me SaaS Platform is now **FULLY OPERATIONAL** and ready for testing!

All 14 microservices are running with:

- Complete CRUD operations
- Full business logic
- Comprehensive validation
- Professional error handling
- Swagger documentation
- Database persistence
- Security features

---

**Built by ID Services Ltd**  
**Kigali, Rwanda**  
**support@idservices.rw**
