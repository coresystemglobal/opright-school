# Tier 2 Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
│  (Web App, Mobile App, Admin Dashboard, Parent Portal)      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTPS/REST API
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Express.js Server                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Middleware Layer                          │   │
│  │  • tenantMiddleware (Multi-tenancy)                  │   │
│  │  • authMiddleware (JWT Authentication)               │   │
│  │  • authorize (Role-based Access Control)             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Route Handlers (API Layer)                │   │
│  │  • /library      • /transport    • /inventory        │   │
│  │  • /events       • /disciplinary • /health           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Service Layer (Business Logic)            │   │
│  │  • LibraryService    • TransportService              │   │
│  │  • InventoryService  • EventService                  │   │
│  │  • DisciplinaryService • HealthService               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Data Access Layer (Prisma ORM)            │   │
│  │  • withTenant() - Tenant-scoped queries              │   │
│  │  • Transaction support                               │   │
│  │  • Type-safe database access                         │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ SQL
                         │
┌────────────────────────▼────────────────────────────────────┐
│              PostgreSQL Database                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Row Level Security (RLS) Policies                   │   │
│  │  • Automatic tenant isolation                        │   │
│  │  • Policy: tenantId = current_setting()              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Tier 2 Tables                                       │   │
│  │  • Book, BookTransaction                             │   │
│  │  • Bus, BusRoute, BusAssignment                      │   │
│  │  • Asset, AssetTransaction                           │   │
│  │  • Event, EventParticipant                           │   │
│  │  • DisciplinaryRecord                                │   │
│  │  • HealthRecord, MedicalIncident, Vaccination        │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## Module Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                         Tenant                               │
│  (Multi-tenant root - all data scoped to tenant)            │
└───┬─────────────────────────────────────────────────────────┘
    │
    ├─── Student ──┬─── BookTransaction (borrower)
    │              ├─── BusAssignment
    │              ├─── DisciplinaryRecord
    │              └─── HealthRecord ──┬─── MedicalIncident
    │                                  └─── Vaccination
    │
    ├─── Teacher ──── (Can also borrow books)
    │
    ├─── Book ──── BookTransaction
    │
    ├─── Bus ──── BusRoute ──── BusAssignment
    │
    ├─── Asset ──── AssetTransaction
    │
    └─── Event ──── EventParticipant
```

## Data Flow Examples

### 1. Library - Borrow Book Flow

```
Client Request
    │
    ▼
POST /library/borrow
    │
    ▼
authMiddleware (verify JWT)
    │
    ▼
tenantMiddleware (extract tenantId)
    │
    ▼
LibraryService.borrowBook()
    │
    ├─── Check book availability
    │
    ├─── Create BookTransaction
    │
    └─── Update Book.available (decrement)
         │
         ▼
    Database Transaction
         │
         ▼
    Return success response
```

### 2. Transport - Assign Student Flow

```
Client Request
    │
    ▼
POST /transport/assignments
    │
    ▼
authMiddleware + tenantMiddleware
    │
    ▼
TransportService.assignStudent()
    │
    ├─── Validate route exists
    │
    ├─── Validate student exists
    │
    └─── Create BusAssignment
         │
         ▼
    Database Insert (with RLS)
         │
         ▼
    Return assignment details
```

### 3. Health - Record Incident Flow

```
Client Request
    │
    ▼
POST /health/incidents
    │
    ▼
authMiddleware + tenantMiddleware
    │
    ▼
HealthService.recordIncident()
    │
    ├─── Validate HealthRecord exists
    │
    └─── Create MedicalIncident
         │
         ▼
    Database Insert
         │
         ▼
    Return incident record
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Authentication (JWT)                               │
│  • Verify user identity                                      │
│  • Extract user claims                                       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│  Layer 2: Authorization (RBAC)                               │
│  • Check user role                                           │
│  • Verify permissions                                        │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│  Layer 3: Tenant Isolation (Middleware)                      │
│  • Extract tenantId from subdomain/domain                    │
│  • Set tenant context                                        │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│  Layer 4: Row Level Security (Database)                      │
│  • Automatic filtering by tenantId                           │
│  • Prevent cross-tenant data access                          │
└──────────────────────────────────────────────────────────────┘
```

## Database Schema Relationships

### Library Module
```
┌──────────────┐
│     Book     │
│──────────────│
│ id           │◄────┐
│ tenantId     │     │
│ title        │     │
│ author       │     │
│ isbn         │     │
│ totalCopies  │     │
│ available    │     │
└──────────────┘     │
                     │
              ┌──────┴──────────┐
              │ BookTransaction │
              │─────────────────│
              │ id              │
              │ tenantId        │
              │ bookId          │
              │ borrowerId      │
              │ borrowerType    │
              │ borrowDate      │
              │ dueDate         │
              │ returnDate      │
              │ fine            │
              │ status          │
              └─────────────────┘
```

### Transport Module
```
┌──────────────┐
│     Bus      │
│──────────────│
│ id           │◄────┐
│ tenantId     │     │
│ busNumber    │     │
│ capacity     │     │
│ driverName   │     │
└──────────────┘     │
                     │
              ┌──────┴──────────┐
              │    BusRoute     │◄────┐
              │─────────────────│     │
              │ id              │     │
              │ tenantId        │     │
              │ busId           │     │
              │ routeName       │     │
              │ stops (JSON)    │     │
              └─────────────────┘     │
                                      │
                               ┌──────┴──────────┐
                               │ BusAssignment   │
                               │─────────────────│
                               │ id              │
                               │ tenantId        │
                               │ routeId         │
                               │ studentId       │
                               │ pickupStop      │
                               │ dropStop        │
                               └─────────────────┘
```

### Health Module
```
┌──────────────────┐
│  HealthRecord    │
│──────────────────│
│ id               │◄────┬────────────────┐
│ tenantId         │     │                │
│ studentId        │     │                │
│ bloodGroup       │     │                │
│ allergies        │     │                │
│ conditions       │     │                │
│ emergencyContact │     │                │
└──────────────────┘     │                │
                         │                │
                  ┌──────┴──────────┐     │
                  │ MedicalIncident │     │
                  │─────────────────│     │
                  │ id              │     │
                  │ tenantId        │     │
                  │ healthRecordId  │     │
                  │ date            │     │
                  │ description     │     │
                  │ treatment       │     │
                  └─────────────────┘     │
                                          │
                                   ┌──────┴──────────┐
                                   │  Vaccination    │
                                   │─────────────────│
                                   │ id              │
                                   │ tenantId        │
                                   │ healthRecordId  │
                                   │ vaccineName     │
                                   │ date            │
                                   │ nextDue         │
                                   └─────────────────┘
```

## API Request Flow

```
1. Client sends request
   ↓
2. Express receives request
   ↓
3. tenantMiddleware extracts tenant
   ↓
4. authMiddleware verifies JWT
   ↓
5. authorize checks permissions
   ↓
6. Route handler receives request
   ↓
7. Service layer processes business logic
   ↓
8. withTenant() scopes database query
   ↓
9. Prisma executes query
   ↓
10. PostgreSQL applies RLS policy
    ↓
11. Results filtered by tenantId
    ↓
12. Response sent to client
```

## Multi-Tenancy Implementation

```
┌─────────────────────────────────────────────────────────────┐
│  Tenant A (demo.school.com)                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Books     │  │  Buses     │  │  Events    │            │
│  │  (Tenant A)│  │  (Tenant A)│  │  (Tenant A)│            │
│  └────────────┘  └────────────┘  └────────────┘            │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Tenant B (greenwood.school.com)                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Books     │  │  Buses     │  │  Events    │            │
│  │  (Tenant B)│  │  (Tenant B)│  │  (Tenant B)│            │
│  └────────────┘  └────────────┘  └────────────┘            │
└──────────────────────────────────────────────────────────────┘

                    Same Database
                    Different Data
                    Isolated by tenantId + RLS
```

## Scalability Considerations

```
┌─────────────────────────────────────────────────────────────┐
│  Load Balancer                                               │
└────────┬────────────────────────────────────────────────────┘
         │
    ┌────┴────┬────────┬────────┐
    │         │        │        │
┌───▼───┐ ┌───▼───┐ ┌──▼────┐ ┌▼────────┐
│ App 1 │ │ App 2 │ │ App 3 │ │ App N   │
└───┬───┘ └───┬───┘ └──┬────┘ └┬────────┘
    │         │        │        │
    └────┬────┴────────┴────────┘
         │
    ┌────▼────────────────────────┐
    │  PostgreSQL (Primary)       │
    │  + Read Replicas            │
    └─────────────────────────────┘
         │
    ┌────▼────────────────────────┐
    │  Redis Cache                │
    │  • Session storage          │
    │  • Query caching            │
    └─────────────────────────────┘
```

## Performance Optimization

### Caching Strategy
```
Request → Check Redis Cache
              │
              ├─ Cache Hit → Return cached data
              │
              └─ Cache Miss → Query Database
                              │
                              └─ Store in cache → Return data
```

### Database Indexing
```
Indexes Created:
• Book: (tenantId, isbn)
• BookTransaction: (tenantId, borrowerId), (tenantId, status)
• Bus: (tenantId, busNumber)
• BusRoute: (tenantId, busId)
• BusAssignment: (tenantId, studentId)
• Asset: (tenantId, category)
• AssetTransaction: (tenantId, assetId)
• Event: (tenantId, startDate)
• EventParticipant: (tenantId, eventId)
• DisciplinaryRecord: (tenantId, studentId)
• HealthRecord: (tenantId, studentId)
• MedicalIncident: (tenantId, healthRecordId)
• Vaccination: (tenantId, healthRecordId)
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Railway / Cloud Platform                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Application Instances (Auto-scaling)                  │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL Database (Managed)                         │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Redis Cache (Managed)                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Backblaze B2 Storage (File uploads)                   │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

This architecture ensures:
- ✅ Scalability through horizontal scaling
- ✅ Security through multiple layers
- ✅ Performance through caching and indexing
- ✅ Reliability through managed services
- ✅ Maintainability through clean separation of concerns
