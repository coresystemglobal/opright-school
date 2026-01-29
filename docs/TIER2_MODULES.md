# Tier 2 Modules - Implementation Guide

## Overview
This document covers 7 additional modules for the School Management System:
1. Library Management
2. Transport Management
3. Inventory Management
4. Event Management
5. Disciplinary Management
6. Health Records

---

## 1. Library Management

### Features
- Book catalog with title, author, ISBN, genre
- Borrow/return system for students and staff
- Due date tracking and fine calculation
- Statistics: total issued, returned, lost books

### API Endpoints

#### Create Book
```http
POST /library/books
Content-Type: application/json

{
  "title": "To Kill a Mockingbird",
  "author": "Harper Lee",
  "isbn": "978-0061120084",
  "genre": "Fiction",
  "totalCopies": 5,
  "available": 5
}
```

#### Get Books
```http
GET /library/books?genre=Fiction
```

#### Borrow Book
```http
POST /library/borrow
Content-Type: application/json

{
  "bookId": "uuid",
  "borrowerId": "student-uuid",
  "borrowerType": "STUDENT",
  "dueDate": "2024-02-01T00:00:00Z"
}
```

#### Return Book
```http
POST /library/return/:transactionId
Content-Type: application/json

{
  "fine": 5.00
}
```

#### Get Transactions
```http
GET /library/transactions?borrowerId=uuid&status=BORROWED
```

#### Get Statistics
```http
GET /library/stats
Response: { "total": 100, "borrowed": 20, "returned": 75, "lost": 5 }
```

---

## 2. Transport Management

### Features
- Bus routes with stops and assigned drivers
- Student assignments to buses/routes
- Pickup/drop location tracking

### API Endpoints

#### Create Bus
```http
POST /transport/buses
Content-Type: application/json

{
  "busNumber": "BUS-001",
  "capacity": 40,
  "driverName": "John Doe",
  "driverPhone": "+1234567890"
}
```

#### Get Buses
```http
GET /transport/buses
```

#### Create Route
```http
POST /transport/routes
Content-Type: application/json

{
  "busId": "uuid",
  "routeName": "North Route",
  "stops": [
    {"name": "Main Gate", "time": "07:00"},
    {"name": "Park Avenue", "time": "07:15"},
    {"name": "School", "time": "07:45"}
  ]
}
```

#### Get Routes
```http
GET /transport/routes?busId=uuid
```

#### Assign Student to Route
```http
POST /transport/assignments
Content-Type: application/json

{
  "routeId": "uuid",
  "studentId": "uuid",
  "pickupStop": "Main Gate",
  "dropStop": "Main Gate"
}
```

#### Get Assignments
```http
GET /transport/assignments?studentId=uuid
```

---

## 3. Inventory Management

### Features
- Track school assets (furniture, equipment, lab items)
- Record purchases, allocations, maintenance, disposals
- Supplier and stock level management

### API Endpoints

#### Create Asset
```http
POST /inventory/assets
Content-Type: application/json

{
  "name": "Laptop Dell XPS",
  "category": "Equipment",
  "quantity": 10,
  "supplier": "Dell Inc",
  "purchaseDate": "2024-01-15T00:00:00Z",
  "cost": 1200.00,
  "location": "Computer Lab"
}
```

#### Get Assets
```http
GET /inventory/assets?category=Equipment
```

#### Record Transaction
```http
POST /inventory/transactions
Content-Type: application/json

{
  "assetId": "uuid",
  "type": "PURCHASE",
  "quantity": 5,
  "remarks": "New batch for science lab"
}
```

Types: `PURCHASE`, `ALLOCATION`, `MAINTENANCE`, `DISPOSAL`

#### Get Transactions
```http
GET /inventory/transactions?assetId=uuid
```

---

## 4. Event Management

### Features
- School events (sports, cultural, academic)
- Event calendar with venue and dates
- Participant management
- Upcoming events listing

### API Endpoints

#### Create Event
```http
POST /events
Content-Type: application/json

{
  "title": "Annual Sports Day",
  "description": "Inter-house sports competition",
  "type": "Sports",
  "venue": "Main Ground",
  "startDate": "2024-03-15T09:00:00Z",
  "endDate": "2024-03-15T17:00:00Z"
}
```

#### Get Events
```http
GET /events?type=Sports
```

#### Get Upcoming Events
```http
GET /events/upcoming
```

#### Add Participant
```http
POST /events/:eventId/participants
Content-Type: application/json

{
  "participantId": "uuid",
  "participantType": "STUDENT",
  "role": "Participant"
}
```

Types: `STUDENT`, `TEACHER`, `STAFF`

#### Get Participants
```http
GET /events/:eventId/participants
```

---

## 5. Disciplinary Management

### Features
- Record incidents involving students
- Track actions taken and responsible authorities
- Status tracking (Open, Resolved, Under Review)
- Generate reports and summaries

### API Endpoints

#### Create Record
```http
POST /disciplinary/records
Content-Type: application/json

{
  "studentId": "uuid",
  "incidentDate": "2024-01-20T10:30:00Z",
  "description": "Fighting in classroom",
  "severity": "Major",
  "actionTaken": "Parent meeting scheduled",
  "reportedBy": "teacher-uuid",
  "status": "Open"
}
```

Severity: `Minor`, `Major`, `Severe`
Status: `Open`, `Resolved`, `Under Review`

#### Get Records
```http
GET /disciplinary/records?studentId=uuid&status=Open
```

#### Update Record
```http
PATCH /disciplinary/records/:id
Content-Type: application/json

{
  "status": "Resolved",
  "actionTaken": "Parent meeting completed, student counseled"
}
```

#### Get Statistics
```http
GET /disciplinary/stats
Response: { "total": 50, "open": 10, "resolved": 40 }
```

---

## 6. Health Records

### Features
- Student health profiles (blood group, allergies, conditions)
- **Encrypted sensitive data** (allergies, conditions, emergency contacts)
- AES-256-GCM encryption for HIPAA/GDPR compliance
- Medical incident tracking
- Vaccination history
- Emergency contact information
- Automatic encryption/decryption

### API Endpoints

#### Create Health Record
```http
POST /health/records
Content-Type: application/json

{
  "studentId": "uuid",
  "bloodGroup": "O+",
  "allergies": "Peanuts, Dust",
  "conditions": "Asthma",
  "emergencyContact": {
    "name": "Jane Doe",
    "phone": "+1234567890",
    "relation": "Mother"
  }
}
```

#### Get Health Record
```http
GET /health/records/:studentId
```

#### Update Health Record
```http
PATCH /health/records/:studentId
Content-Type: application/json

{
  "allergies": "Peanuts, Dust, Pollen"
}
```

#### Record Medical Incident
```http
POST /health/incidents
Content-Type: application/json

{
  "healthRecordId": "uuid",
  "description": "Minor cut on finger",
  "treatment": "Cleaned and bandaged",
  "treatedBy": "School Nurse"
}
```

#### Get Incidents
```http
GET /health/incidents/:healthRecordId
```

#### Record Vaccination
```http
POST /health/vaccinations
Content-Type: application/json

{
  "healthRecordId": "uuid",
  "vaccineName": "COVID-19 Booster",
  "date": "2024-01-15T00:00:00Z",
  "nextDue": "2024-07-15T00:00:00Z"
}
```

#### Get Vaccinations
```http
GET /health/vaccinations/:healthRecordId
```

---

## Database Migration

After implementing these modules, run:

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Or create migration
npx prisma migrate dev --name add_tier2_modules
```

---

## Testing

Example test flow for Library module:

```javascript
// 1. Create a book
const book = await fetch('/library/books', {
  method: 'POST',
  body: JSON.stringify({
    title: "Test Book",
    author: "Test Author",
    totalCopies: 3,
    available: 3
  })
});

// 2. Borrow the book
const transaction = await fetch('/library/borrow', {
  method: 'POST',
  body: JSON.stringify({
    bookId: book.id,
    borrowerId: studentId,
    borrowerType: "STUDENT",
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  })
});

// 3. Return the book
await fetch(`/library/return/${transaction.id}`, {
  method: 'POST',
  body: JSON.stringify({ fine: 0 })
});
```

---

## Security Considerations

All endpoints require authentication via `authMiddleware`. Consider adding role-based permissions:

- Library: ADMIN, TEACHER, STAFF
- Transport: ADMIN, STAFF
- Inventory: ADMIN, STAFF
- Events: ADMIN, TEACHER
- Disciplinary: ADMIN, PRINCIPAL, TEACHER
- Health: ADMIN, NURSE, PRINCIPAL

### Health Data Encryption

Sensitive health information is automatically encrypted at rest:

**Encrypted Fields:**
- `allergies` - Student allergies
- `conditions` - Medical conditions
- `emergencyContact` - Emergency contact details

**Encryption Details:**
- Algorithm: AES-256-GCM
- Key: 256-bit from environment variable
- Automatic: Encrypts on write, decrypts on read
- Compliance: HIPAA/GDPR ready

**Setup:**
```bash
# Generate encryption key (64 hex characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env file
ENCRYPTION_KEY=your-64-character-hex-key
```

**Usage:**
```javascript
// Data is automatically encrypted when creating/updating
POST /health/records
{
  "allergies": "Peanuts, Dust",  // Encrypted in database
  "conditions": "Asthma"          // Encrypted in database
}

// Data is automatically decrypted when reading
GET /health/records/:studentId
// Returns decrypted data
```

---

## Future Enhancements

1. **Library**: Reservation system, digital library integration
2. **Transport**: Real-time GPS tracking, parent notifications
3. **Inventory**: Barcode scanning, depreciation tracking
4. **Events**: Calendar integration, automated reminders
5. **Disciplinary**: Behavior trend analysis, parent portal
6. **Health**: Telemedicine integration, health screening schedules
