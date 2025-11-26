# School SaaS - Multi-tenant School Management System

## Quick Start

```bash
# Install dependencies
npm install

# Setup database
npm run db:push
npm run db:generate

# Run RLS setup
psql $DATABASE_URL -f scripts/rls-setup.sql
psql $DATABASE_URL -f scripts/setup-tier2.sql

# Start development
npm run dev
```

## Architecture

- **Multi-tenancy**: Shared schema with `tenantId` + Postgres RLS
- **Database**: PostgreSQL with Row Level Security
- **Cache/Queue**: Redis for caching and background jobs
- **Storage**: Backblaze B2 (S3-compatible) for file uploads - See [STORAGE_GUIDE.md](STORAGE_GUIDE.md)
- **Payments**: Stripe/Paystack integration
- **Deployment**: Railway (or any Node.js hosting)

## API Endpoints

### Authentication
- `POST /auth/login` - Tenant-scoped authentication

### Core Management
- `GET /students` - List students for tenant
- `POST /students` - Create student
- `GET /teachers` - List teachers for tenant
- `POST /teachers` - Create teacher

### Tier 1 Features (Academic Management)
- `POST /academic-years` - Create academic year
- `GET /academic-years` - List academic years
- `POST /terms` - Create term/semester
- `POST /subjects` - Create subject
- `POST /timetables` - Create schedule entry
- `POST /attendances` - Mark attendance
- `POST /gradebook/assignments` - Create assignment
- `POST /gradebook/grades` - Record grade
- `POST /gradebook/examinations` - Create examination

### Tier 2 Features (Extended Management)
- `POST /library/books` - Add book to catalog
- `POST /library/borrow` - Borrow book
- `POST /library/return/:id` - Return book
- `POST /transport/buses` - Create bus
- `POST /transport/routes` - Create route
- `POST /transport/assignments` - Assign student to route
- `POST /inventory/assets` - Create asset
- `POST /inventory/transactions` - Record asset transaction
- `POST /events` - Create event
- `POST /events/:id/participants` - Add event participant
- `POST /disciplinary/records` - Create disciplinary record
- `POST /health/records` - Create health record
- `POST /health/incidents` - Record medical incident
- `POST /health/vaccinations` - Record vaccination

See [APP_GUIDE.md](APP_GUIDE.md) and [TIER2_MODULES.md](TIER2_MODULES.md) for complete API documentation.

## Environment Variables

Copy `.env.example` to `.env` and update with your values:
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_SECRET` - JWT signing key
- Backblaze B2 credentials for file storage
- Payment provider keys (Stripe/Paystack)

See `.env.example` for full configuration.

## Features Implemented

### Tier 1 (Core Academic)
✅ **Academic Year/Term Management** - School calendar, terms, semesters
✅ **Class/Grade Management** - Classes with sections
✅ **Subject Management** - Subjects per grade with teacher assignments
✅ **Timetable/Schedule Management** - Class & teacher schedules with conflict detection
✅ **Attendance Tracking** - Daily attendance with bulk operations & statistics
✅ **Basic Gradebook** - Assignments, grades, weighted calculations, report cards, exams

### Tier 2 (Extended Features)
✅ **Library Management** - Book catalog, borrow/return, fines, statistics
✅ **Transport Management** - Bus routes, stops, drivers, student assignments
✅ **Inventory Management** - Asset tracking, purchases, allocations, maintenance
✅ **Event Management** - School events, calendar, participants, notifications
✅ **Disciplinary Management** - Incident records, actions, status tracking
✅ **Health Records** - Student health profiles, medical incidents, vaccinations, **AES-256-GCM encryption**

### Tier 3 (Advanced Features)
✅ **Hostel Management** - Room assignments, meal plans, visitor management
✅ **Sports/Extracurricular** - Activity enrollment, scheduling, competitions

See [APP_FEATURES.md](APP_FEATURES.md) and [TIER2_MODULES.md](TIER2_MODULES.md) for detailed feature documentation.

## File Upload

```bash
# Upload file
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@document.pdf"

# Get signed URL
curl http://localhost:3000/upload/signed-url/{key} \
  -H "Authorization: Bearer $TOKEN"
```

See [STORAGE_GUIDE.md](STORAGE_GUIDE.md) for Backblaze B2 setup.

## Tenant Creation

```javascript
import { TenantService } from './src/services/tenantService';

await TenantService.createTenant({
  name: 'Demo School',
  subdomain: 'demo',
  adminEmail: 'admin@demo.com',
  adminPassword: 'password123',
  adminName: 'Admin User'
});
```

Access at: `http://demo.localhost:3000`