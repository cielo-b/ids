# Service Testing Guide

## ✅ Build Status

All services compile successfully with no errors. Redis caching has been successfully integrated into:

- ✅ Auth Service
- ✅ User Service
- ✅ Entity Service

## 🧪 Testing Services One by One

### Prerequisites

1. **Redis** must be running (check with `redis-cli ping`)
2. **PostgreSQL containers** must be running and ports exposed

### Step 1: Start Database Containers

```bash
# Start all required databases
docker-compose up -d auth-db user-db entity-db redis

# Verify they're running
docker ps | grep -E "(auth-db|user-db|entity-db|redis)"
```

### Step 2: Test Auth Service

```bash
# Set environment variables
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5433  # Mapped from container port 5432
export POSTGRES_USER=billme_auth
export POSTGRES_PASSWORD=billme_auth_pass
export POSTGRES_DB=billme_auth
export REDIS_HOST=localhost
export REDIS_PORT=6379
export PORT=3001

# Start auth service
npm run start:auth

# In another terminal, verify it's running:
curl http://localhost:3001/api/docs
```

### Step 3: Test User Service

```bash
# Set environment variables
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5434  # Mapped from container port 5432
export POSTGRES_USER=billme_user
export POSTGRES_PASSWORD=billme_user_pass
export POSTGRES_DB=billme_users
export REDIS_HOST=localhost
export REDIS_PORT=6379
export PORT=3002

# Start user service
npm run start:user

# Verify it's running:
curl http://localhost:3002/api/docs
```

### Step 4: Test Entity Service

```bash
# Set environment variables
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5435  # Mapped from container port 5432
export POSTGRES_USER=billme_entity
export POSTGRES_PASSWORD=billme_entity_pass
export POSTGRES_DB=billme_entities
export REDIS_HOST=localhost
export REDIS_PORT=6379
export PORT=3003

# Start entity service
npm run start:entity

# Verify it's running:
curl http://localhost:3003/api/docs
```

### Step 5: Test API Gateway

Once all services are running, start the API Gateway:

```bash
npm run start:gateway

# Verify it's running:
curl http://localhost:3000/api/docs
```

## 🔍 Verification Checklist

- [ ] All services compile without errors (`npm run build`)
- [ ] Redis is running and accessible
- [ ] PostgreSQL containers are running with exposed ports
- [ ] Auth Service responds on port 3001
- [ ] User Service responds on port 3002
- [ ] Entity Service responds on port 3003
- [ ] API Gateway responds on port 3000

## 🐛 Troubleshooting

### Password Authentication Failed

- Ensure database containers are running: `docker ps`
- Verify credentials match docker-compose.yml
- Try recreating containers: `docker-compose down && docker-compose up -d`

### Port Already in Use

- Check what's using the port: `lsof -i :3001`
- Kill existing processes: `pkill -f "nest start"`

### Redis Connection Error

- Verify Redis is running: `redis-cli ping`
- Check Redis host/port in environment variables

## 📊 Expected Results

When services start successfully, you should see:

- `🚀 [Service] is running on: http://localhost:[PORT]`
- `📚 Swagger docs available at: http://localhost:[PORT]/api/docs`
- Successful connection to Redis (from CacheModule logs)
- Successful connection to PostgreSQL (from TypeOrmModule logs)

## 🚀 Quick Start All Services

```bash
# Start all services at once (if all prerequisites are met)
npm run start:all
```

## 📝 Notes

- Services are configured to use Redis caching automatically
- Cache invalidation happens in real-time when data changes
- All cache operations are logged for debugging
- TTL (Time To Live) is configured per service and entity type
