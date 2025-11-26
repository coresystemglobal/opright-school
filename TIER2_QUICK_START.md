# Tier 2 Modules - Quick Start Guide

## Setup

```bash
# 1. Update database schema
npm run db:generate
npm run db:push

# 2. Apply RLS policies
psql $DATABASE_URL -f scripts/setup-tier2.sql

# 3. Restart server
npm run dev
```

## Quick Examples

### Library Management

```bash
# Add a book
curl -X POST http://localhost:3000/library/books \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Harry Potter",
    "author": "J.K. Rowling",
    "isbn": "978-0439708180",
    "genre": "Fantasy",
    "totalCopies": 3,
    "available": 3
  }'

# Borrow book
curl -X POST http://localhost:3000/library/borrow \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "bookId": "book-uuid",
    "borrowerId": "student-uuid",
    "borrowerType": "STUDENT",
    "dueDate": "2024-02-15T00:00:00Z"
  }'

# Return book with fine
curl -X POST http://localhost:3000/library/return/transaction-uuid \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"fine": 2.50}'
```

### Transport Management

```bash
# Create bus
curl -X POST http://localhost:3000/transport/buses \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "busNumber": "BUS-001",
    "capacity": 40,
    "driverName": "John Driver",
    "driverPhone": "+1234567890"
  }'

# Create route
curl -X POST http://localhost:3000/transport/routes \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "busId": "bus-uuid",
    "routeName": "North Route",
    "stops": [
      {"name": "Main Gate", "time": "07:00"},
      {"name": "Park Ave", "time": "07:15"}
    ]
  }'

# Assign student
curl -X POST http://localhost:3000/transport/assignments \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "routeId": "route-uuid",
    "studentId": "student-uuid",
    "pickupStop": "Main Gate",
    "dropStop": "Main Gate"
  }'
```

### Inventory Management

```bash
# Add asset
curl -X POST http://localhost:3000/inventory/assets \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Laptop Dell",
    "category": "Equipment",
    "quantity": 10,
    "supplier": "Dell Inc",
    "cost": 1200.00
  }'

# Record purchase
curl -X POST http://localhost:3000/inventory/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "assetId": "asset-uuid",
    "type": "PURCHASE",
    "quantity": 5,
    "remarks": "New batch"
  }'
```

### Event Management

```bash
# Create event
curl -X POST http://localhost:3000/events \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Sports Day",
    "type": "Sports",
    "venue": "Main Ground",
    "startDate": "2024-03-15T09:00:00Z",
    "endDate": "2024-03-15T17:00:00Z"
  }'

# Add participant
curl -X POST http://localhost:3000/events/event-uuid/participants \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "participantId": "student-uuid",
    "participantType": "STUDENT",
    "role": "Participant"
  }'

# Get upcoming events
curl http://localhost:3000/events/upcoming \
  -H "Authorization: Bearer $TOKEN"
```

### Disciplinary Management

```bash
# Create record
curl -X POST http://localhost:3000/disciplinary/records \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "studentId": "student-uuid",
    "incidentDate": "2024-01-20T10:30:00Z",
    "description": "Fighting in classroom",
    "severity": "Major",
    "reportedBy": "teacher-uuid"
  }'

# Update record
curl -X PATCH http://localhost:3000/disciplinary/records/record-uuid \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "Resolved",
    "actionTaken": "Parent meeting completed"
  }'

# Get stats
curl http://localhost:3000/disciplinary/stats \
  -H "Authorization: Bearer $TOKEN"
```

### Health Records

```bash
# Create health record
curl -X POST http://localhost:3000/health/records \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "studentId": "student-uuid",
    "bloodGroup": "O+",
    "allergies": "Peanuts",
    "conditions": "Asthma",
    "emergencyContact": {
      "name": "Jane Doe",
      "phone": "+1234567890",
      "relation": "Mother"
    }
  }'

# Record incident
curl -X POST http://localhost:3000/health/incidents \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "healthRecordId": "health-record-uuid",
    "description": "Minor cut",
    "treatment": "Cleaned and bandaged",
    "treatedBy": "School Nurse"
  }'

# Record vaccination
curl -X POST http://localhost:3000/health/vaccinations \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "healthRecordId": "health-record-uuid",
    "vaccineName": "COVID-19",
    "date": "2024-01-15T00:00:00Z",
    "nextDue": "2024-07-15T00:00:00Z"
  }'
```

## Common Queries

### Library
- Get overdue books: `GET /library/transactions?status=OVERDUE`
- Get student's borrowed books: `GET /library/transactions?borrowerId=uuid&status=BORROWED`
- Get books by genre: `GET /library/books?genre=Fiction`

### Transport
- Get student's route: `GET /transport/assignments?studentId=uuid`
- Get bus routes: `GET /transport/routes?busId=uuid`

### Inventory
- Get equipment: `GET /inventory/assets?category=Equipment`
- Get asset history: `GET /inventory/transactions?assetId=uuid`

### Events
- Get sports events: `GET /events?type=Sports`
- Get event participants: `GET /events/:id/participants`

### Disciplinary
- Get open cases: `GET /disciplinary/records?status=Open`
- Get student records: `GET /disciplinary/records?studentId=uuid`

### Health
- Get student health: `GET /health/records/:studentId`
- Get medical history: `GET /health/incidents/:healthRecordId`
- Get vaccinations: `GET /health/vaccinations/:healthRecordId`

## Database Schema Overview

```
Library:
- Book (catalog)
- BookTransaction (borrow/return)

Transport:
- Bus (vehicles)
- BusRoute (routes with stops)
- BusAssignment (student assignments)

Inventory:
- Asset (items)
- AssetTransaction (movements)

Events:
- Event (events)
- EventParticipant (participants)

Disciplinary:
- DisciplinaryRecord (incidents)

Health:
- HealthRecord (profiles)
- MedicalIncident (incidents)
- Vaccination (immunizations)
```

## Permissions

Add these permissions to your roles:

```javascript
// Library
{ resource: "library", action: "read" }
{ resource: "library", action: "create" }
{ resource: "library", action: "update" }

// Transport
{ resource: "transport", action: "read" }
{ resource: "transport", action: "create" }

// Inventory
{ resource: "inventory", action: "read" }
{ resource: "inventory", action: "create" }

// Events
{ resource: "events", action: "read" }
{ resource: "events", action: "create" }

// Disciplinary
{ resource: "disciplinary", action: "read" }
{ resource: "disciplinary", action: "create" }

// Health
{ resource: "health", action: "read" }
{ resource: "health", action: "create" }
```

## Troubleshooting

### Issue: "Book not available"
- Check book's `available` count
- Verify no duplicate borrow transactions

### Issue: "Asset not found"
- Ensure assetId is correct
- Check tenant isolation

### Issue: "Duplicate assignment"
- Student already assigned to route
- Use PATCH to update instead

### Issue: "Health record not found"
- Create health record first before adding incidents/vaccinations
- One health record per student

## Next Steps

1. Add role-based permissions for each module
2. Implement notification system for events
3. Add fine calculation automation for library
4. Create reports for each module
5. Add parent portal access for relevant modules
