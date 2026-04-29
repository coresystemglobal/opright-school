# How It Works — Staff

The **Staff** role covers operational support — managing health records, hostel operations, transport logistics, inventory tracking, and the school library. Staff members keep the non-academic side of the school running.

---

## 1. Authentication

```
POST /auth/login
{ "email": "staff@school.com", "password": "yourPassword" }
```

Use the returned JWT token: `Authorization: Bearer <token>`

---

## 2. Permissions Overview

| Module | Access Level |
|---|---|
| Health Records | Full CRUD |
| Hostel | Full CRUD |
| Transport | Full CRUD |
| Inventory | Full CRUD |
| Library | Full CRUD |
| Students | Read only |
| Classes | Read only |
| Attendance | Read only |
| Fees | Read only |
| Payments | Read only |

---

## 3. Health Records

Health data (allergies, conditions, emergency contacts) is encrypted at rest using AES-256-GCM.

### Student Health Profiles

| Action | Endpoint |
|---|---|
| Create record | `POST /health/records` |
| Get record | `GET /health/records/:studentId` |
| Update record | `PATCH /health/records/:studentId` |

**Create a health record:**
```json
{
  "studentId": "<id>",
  "bloodGroup": "O+",
  "genotype": "AA",
  "allergies": ["Dust", "Peanuts"],
  "notes": "Carries inhaler"
}
```

### Medical Incidents

| Action | Endpoint |
|---|---|
| Log incident | `POST /health/incidents` |
| View incidents | `GET /health/incidents/:healthRecordId` |

**Log an incident:**
```json
{
  "healthRecordId": "<id>",
  "incidentType": "FEVER",
  "description": "Reported high temperature during PE",
  "treatment": "Paracetamol administered, parent notified",
  "incidentDate": "2025-03-16T10:30:00Z"
}
```

### Vaccinations

| Action | Endpoint |
|---|---|
| Record vaccination | `POST /health/vaccinations` |
| View vaccinations | `GET /health/vaccinations/:healthRecordId` |

**Record a vaccination:**
```json
{
  "healthRecordId": "<id>",
  "vaccineName": "Tetanus",
  "dateAdministered": "2025-03-01T00:00:00Z",
  "administeredBy": "School Nurse"
}
```

---

## 4. Hostel Management

### Rooms

| Action | Endpoint |
|---|---|
| List rooms | `GET /hostel/rooms` |
| Create room | `POST /hostel/rooms` |

**Create a room:**
```json
{ "roomNumber": "A12", "hostelBlock": "Girls Hostel", "capacity": 6, "occupied": 0 }
```

### Room Assignments

| Action | Endpoint |
|---|---|
| Assign student | `POST /hostel/assignments` |

```json
{ "roomId": "<id>", "studentId": "<id>", "bedNumber": "B2" }
```

### Meal Plans

| Action | Endpoint |
|---|---|
| Create meal plan | `POST /hostel/meal-plans` |

```json
{ "name": "Standard Plan", "mealsPerDay": 3, "dietaryNotes": "No peanuts" }
```

### Visitor Log

| Action | Endpoint |
|---|---|
| Register visitor | `POST /hostel/visitors` |
| Check out visitor | `POST /hostel/visitors/:id/checkout` |

**Register a visitor:**
```json
{
  "studentId": "<id>",
  "visitorName": "Jane Doe",
  "relationship": "Parent",
  "checkInTime": "2025-03-16T14:00:00Z"
}
```

---

## 5. Transport Management

### Bus Fleet

| Action | Endpoint |
|---|---|
| List buses | `GET /transport/buses` |
| Create bus | `POST /transport/buses` |

```json
{
  "busNumber": "BUS-001",
  "capacity": 40,
  "driverName": "Mr Adewale",
  "driverPhone": "+2348000000002"
}
```

### Routes

| Action | Endpoint |
|---|---|
| List routes | `GET /transport/routes?busId=<id>` |
| Create route | `POST /transport/routes` |

```json
{
  "busId": "<id>",
  "routeName": "North Route",
  "stops": ["Ikeja", "Ojodu", "Berger"],
  "pickupTime": "06:30"
}
```

### Student Assignments

| Action | Endpoint |
|---|---|
| List assignments | `GET /transport/assignments?studentId=<id>` |
| Assign student | `POST /transport/assignments` |

```json
{ "studentId": "<id>", "routeId": "<id>", "pickupStop": "Ojodu", "dropoffStop": "Ojodu" }
```

---

## 6. Inventory Management

### Assets

| Action | Endpoint |
|---|---|
| List assets | `GET /inventory/assets?category=<cat>` |
| Create asset | `POST /inventory/assets` |

```json
{
  "name": "Desktop Computer",
  "category": "IT",
  "quantity": 10,
  "unitPrice": 250000,
  "location": "ICT Lab"
}
```

### Transactions

| Action | Endpoint |
|---|---|
| List transactions | `GET /inventory/transactions?assetId=<id>` |
| Create transaction | `POST /inventory/transactions` |

Transaction types: `ALLOCATED`, `RETURNED`, `MAINTENANCE`, `DISPOSED`

```json
{
  "assetId": "<id>",
  "type": "ALLOCATED",
  "quantity": 2,
  "recipientId": "<teacher-id>",
  "notes": "Assigned to ICT department"
}
```

---

## 7. Library Management

### Book Catalog

| Action | Endpoint |
|---|---|
| List books | `GET /library/books?title=<>&author=<>&genre=<>&available=true` |
| Add book | `POST /library/books` |

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "isbn": "9780385474542",
  "genre": "Literature",
  "copies": 5
}
```

### Circulation

| Action | Endpoint |
|---|---|
| Borrow book | `POST /library/borrow` |
| Return book | `POST /library/return/:id` |
| View transactions | `GET /library/transactions?bookId=<>&status=<>` |

**Borrow:**
```json
{
  "bookId": "<id>",
  "borrowerId": "<student-id>",
  "borrowerType": "STUDENT",
  "dueDate": "2025-03-30T00:00:00Z"
}
```

**Return (with optional fine):**
```json
{ "fine": 0 }
```

### Statistics

```
GET /library/stats
```

Returns total books, borrowed count, overdue count, and fine totals.

---

## 8. Typical Daily Workflow

1. **Morning** — Check hostel visitor log, review transport assignments
2. **During school** — Handle health incidents, manage library circulation
3. **Afternoon** — Process inventory transactions, update asset records
4. **End of day** — Check out hostel visitors, review library returns
5. **Weekly** — Review library stats, inventory levels, transport route efficiency
6. **As needed** — Record vaccinations, create meal plans, register new assets
