# School SaaS Setup Guide

## Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Git

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
Copy `.env` and update with your database credentials:
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/school_saas"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key"
```

### 3. Database Setup
```bash
# Create database
createdb school_saas

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Setup RLS policies
psql $DATABASE_URL -f scripts/rls-setup.sql
```

### 4. Start Services
```bash
# Start Redis (if not running)
redis-server

# Start application
npm run dev
```

### 5. Create First Tenant
```bash
node -e "
const { TenantService } = require('./dist/services/tenantService');
TenantService.createTenant({
  name: 'Demo School',
  subdomain: 'demo',
  adminEmail: 'admin@demo.com',
  adminPassword: 'password123',
  adminName: 'Admin User'
}).then(console.log);
"
```

### 6. Test API
```bash
# Login (use subdomain in Host header)
curl -X POST http://localhost:3000/auth/login \
  -H "Host: demo.localhost" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password123"}'
```

## Troubleshooting
- Ensure PostgreSQL is running on port 5432
- Ensure Redis is running on port 6379
- Check database connection in .env file
- Verify RLS policies are applied