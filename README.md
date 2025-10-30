# Bill Me SaaS Platform

A comprehensive, professional microservices-based SaaS platform for managing business operations in restaurants, gas stations, supermarkets, and similar establishments.

## 🏗️ Architecture

The platform follows a **microservices architecture** with separate databases for each service, ensuring scalability, maintainability, and fault isolation.

### Services Implemented

1. **API Gateway** (Port 3000) - Single entry point for all client requests
2. **Auth Service** (Port 3001) - Authentication, JWT, 2FA, OTP, session management
3. **User Service** (Port 3002) - User profile management (customers, owners, admins)
4. **Entity Service** (Port 3003) - Entity and branch management
5. **Subscription Service** (Port 3004) - Subscription plans and billing
6. **Manager Service** (Port 3005) - Manager profiles and operations
7. **Employee Service** (Port 3006) - Employee management, availability, performance
8. **Menu Service** (Port 3007) - Menu items, categories, promotions, QR codes
9. **Order Service** (Port 3008) - Order lifecycle, bulk orders, bill splitting
10. **Payment Service** (Port 3009) - Payment processing, refunds, tips
11. **Receipt Service** (Port 3010) - Digital receipts with QR codes
12. **Notification Service** (Port 3011) - Email, SMS, push notifications
13. **Audit Service** (Port 3012) - Activity logging and audit trails
14. **Report Service** (Port 3013) - Analytics and reporting

### Technology Stack

#### Backend

- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **Database**: PostgreSQL (All services)
- **ORM**: TypeORM
- **Caching**: Redis
- **Authentication**: JWT with Passport
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI

#### Infrastructure

- **Containerization**: Docker & Docker Compose
- **Architecture Pattern**: Microservices with micro-databases

## 🚀 Features Implemented

### Authentication & Authorization

- ✅ User registration with email/phone verification
- ✅ JWT-based authentication with refresh tokens
- ✅ Two-Factor Authentication (2FA) with TOTP
- ✅ OTP generation and verification
- ✅ Session management
- ✅ Account lockout on failed login attempts
- ✅ Password strength requirements
- ✅ Role-Based Access Control (RBAC)

### User Management

- ✅ Multi-role support (Super Admin, Entity Owner, Manager, Employee, Customer)
- ✅ User profiles with preferences
- ✅ Multi-language support (English, French)
- ✅ Email and phone verification
- ✅ User statistics and analytics

### Employee Management

- ✅ Employee profiles with positions
- ✅ Real-time availability tracking (Available, Busy, On Break, Off Duty)
- ✅ Active order count management
- ✅ Performance metrics and analytics
- ✅ Tips tracking
- ✅ Revenue tracking per employee
- ✅ Rating system
- ✅ Working hours configuration

### Menu & Product Management

- ✅ Menu items with categories
- ✅ Dynamic pricing and discounted prices
- ✅ QR code generation for each item
- ✅ Barcode support
- ✅ Stock management with low-stock alerts
- ✅ Nutritional information
- ✅ Allergen tracking
- ✅ Preparation time estimates
- ✅ Rating system
- ✅ Promotions and discounts
- ✅ Category management
- ✅ Popular items tracking

### Common Features

- ✅ Centralized error handling
- ✅ Request validation
- ✅ Standardized API responses
- ✅ Pagination support
- ✅ Swagger API documentation for all services
- ✅ CORS enabled
- ✅ Professional logging

## 📁 Project Structure

```
bill-me-platform/
├── apps/
│   ├── api-gateway/          # API Gateway service
│   ├── auth-service/          # Authentication service
│   ├── user-service/          # User management service
│   ├── entity-service/        # Entity management service
│   ├── subscription-service/  # Subscription management
│   ├── manager-service/       # Manager operations
│   ├── employee-service/      # Employee management
│   ├── menu-service/          # Menu & products
│   ├── order-service/         # Order management
│   ├── payment-service/       # Payment processing
│   ├── receipt-service/       # Digital receipts
│   ├── notification-service/  # Notifications
│   ├── audit-service/         # Audit logging
│   └── report-service/        # Analytics & reports
├── libs/
│   ├── common/                # Shared utilities, enums, decorators
│   ├── database/              # Database configurations
│   └── shared/                # Shared modules
├── config/                    # Configuration files
├── docker-compose.yml         # Docker services configuration
├── Dockerfile                 # Multi-stage Docker build
├── package.json               # Dependencies
├── nest-cli.json             # NestJS configuration
└── README.md                 # This file
```

## 🔧 Installation

### Prerequisites

- Node.js (v20+)
- Docker & Docker Compose
- npm or yarn

### Steps

1. **Clone the repository**

```bash
git clone <repository-url>
cd bill-me-platform
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start all services with Docker**

```bash
npm run docker:up
```

5. **View logs**

```bash
npm run docker:logs
```

6. **Stop all services**

```bash
npm run docker:down
```

## 🏃 Running Services Locally (Development)

### Run all services concurrently

```bash
npm run start:all
```

### Run individual services

```bash
npm run start:gateway       # API Gateway
npm run start:auth          # Auth Service
npm run start:user          # User Service
npm run start:employee      # Employee Service
npm run start:menu          # Menu Service
# ... etc
```

### Build all services

```bash
npm run build:all
```

## 📚 API Documentation

Each microservice exposes Swagger documentation at `/api/docs`:

- Auth Service: http://localhost:3001/api/docs
- User Service: http://localhost:3002/api/docs
- Employee Service: http://localhost:3006/api/docs
- Menu Service: http://localhost:3007/api/docs
- ... (all other services follow the same pattern)

## 🔐 Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ Refresh token rotation
- ✅ 2FA with TOTP
- ✅ OTP verification for email/phone
- ✅ Account lockout after failed attempts
- ✅ Session management
- ✅ Role-based access control
- ✅ Input validation and sanitization
- ✅ CORS configuration
- ✅ Helmet for security headers

## 🗄️ Database Architecture

### PostgreSQL Databases (All Services)

- `billme_auth` - Authentication credentials, sessions, OTPs
- `billme_users` - User profiles and data
- `billme_entities` - Entity information
- `billme_subscriptions` - Subscription data
- `billme_managers` - Manager information
- `billme_employees` - Employee data
- `billme_menus` - Menu items, categories, promotions
- `billme_orders` - Order information
- `billme_payments` - Payment transactions
- `billme_receipts` - Digital receipts
- `billme_notifications` - Notification logs
- `billme_audit` - Audit trails
- `billme_reports` - Analytics data

**Note**: The platform now uses PostgreSQL exclusively for all services, providing consistency, ACID compliance, and powerful relational capabilities across the entire system.

## 🎯 User Roles & Permissions

### Super Admin

- Full system access
- Manage all entities
- System configuration
- Global analytics

### Entity Owner

- Manage own entity and branches
- View financial reports
- Manage subscriptions
- Add managers

### Manager

- Manage employees
- Approve orders and refunds
- View entity analytics
- Manage menu items

### Employee

- Handle customer orders
- Update order status
- Mark payments
- View performance metrics

### Customer

- Browse menus
- Place orders
- Make payments
- Add tips
- View receipts
- Rate items and employees

## 🔄 Order Lifecycle

1. **INCOMING** - Order placed by customer
2. **PROCESSING** - Order being prepared
3. **SERVED** - Order delivered to customer
4. **PAID** - Payment completed
5. **CANCELLED** - Order cancelled (requires manager approval)

## 📊 Key Features by Service

### Auth Service

- User registration & login
- JWT token management
- 2FA enable/disable
- OTP generation & verification
- Session tracking
- Password change

### Employee Service

- Employee CRUD operations
- Status management (Available, Busy, On Break, Off Duty)
- Performance tracking
- Tips management
- Revenue tracking
- Rating system

### Menu Service

- Menu item management
- QR code generation
- Stock tracking
- Promotions & discounts
- Category management
- Low stock alerts

## 🚧 Pending Implementation

The following services are partially implemented and need completion:

- Manager Service (complete implementation)
- Order Service (bulk orders, bill splitting, QR tracking)
- Payment Service (payment gateway integrations)
- Receipt Service (PDF generation, QR receipts)
- Subscription Service (billing, auto-renewal)
- Entity Service (branches, categories)
- Notification Service (email/SMS templates)
- Audit Service (comprehensive logging)
- Report Service (dashboard, PDF exports)
- API Gateway (routing, rate limiting)

## 📝 Environment Variables

Key environment variables (see `.env.example`):

```env
# App
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_EXPIRATION=24h
JWT_REFRESH_EXPIRATION=7d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password

# SMS
SMS_API_KEY=your-sms-api-key

# Payment Gateways
PAYSTACK_SECRET_KEY=your-key
FLUTTERWAVE_SECRET_KEY=your-key
MTN_MOMO_API_KEY=your-key
```

## 🤝 Contributing

This is a professional enterprise SaaS platform. Contributions should follow:

- Clean code principles
- SOLID principles
- Comprehensive error handling
- Input validation
- API documentation
- Unit tests (when applicable)

## 📄 License

MIT License - ID Services Ltd.

## 👥 Authors

- ID Services Ltd
- 2nd Floor, Makuza Plaza
- Kigali, Rwanda

---

**Version**: 1.0.0  
**Last Updated**: October 2025

For support or inquiries, please contact: support@idservices.rw
