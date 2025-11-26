# Tier 2 Testing Guide

## Test Environment Setup

```bash
# 1. Create test database
createdb school_saas_test

# 2. Set test environment
export DATABASE_URL="postgresql://user:pass@localhost:5432/school_saas_test"
export NODE_ENV="test"

# 3. Run migrations
npm run db:push

# 4. Apply RLS
psql $DATABASE_URL -f scripts/rls-setup.sql
psql $DATABASE_URL -f scripts/setup-tier2.sql
```

## Manual Testing Scripts

### 1. Library Module Tests

```bash
# Set variables
export API_URL="http://localhost:3000"
export TOKEN="your-jwt-token"

# Test 1: Create a book
curl -X POST $API_URL/library/books \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Book",
    "author": "Test Author",
    "isbn": "978-1234567890",
    "genre": "Fiction",
    "totalCopies": 5,
    "available": 5
  }'

# Expected: 200 OK with book object

# Test 2: List books
curl $API_URL/library/books \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with array of books

# Test 3: Borrow book
BOOK_ID="<book-id-from-test-1>"
STUDENT_ID="<student-id>"

curl -X POST $API_URL/library/borrow \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookId\": \"$BOOK_ID\",
    \"borrowerId\": \"$STUDENT_ID\",
    \"borrowerType\": \"STUDENT\",
    \"dueDate\": \"2024-03-01T00:00:00Z\"
  }"

# Expected: 200 OK with transaction object
# Book available count should decrease

# Test 4: Return book
TRANSACTION_ID="<transaction-id-from-test-3>"

curl -X POST $API_URL/library/return/$TRANSACTION_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fine": 0}'

# Expected: 200 OK with updated transaction
# Book available count should increase

# Test 5: Get statistics
curl $API_URL/library/stats \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with stats object
```

### 2. Transport Module Tests

```bash
# Test 1: Create bus
curl -X POST $API_URL/transport/buses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "busNumber": "BUS-001",
    "capacity": 40,
    "driverName": "John Driver",
    "driverPhone": "+1234567890"
  }'

# Expected: 200 OK with bus object

# Test 2: Create route
BUS_ID="<bus-id-from-test-1>"

curl -X POST $API_URL/transport/routes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"busId\": \"$BUS_ID\",
    \"routeName\": \"North Route\",
    \"stops\": [
      {\"name\": \"Main Gate\", \"time\": \"07:00\"},
      {\"name\": \"Park Avenue\", \"time\": \"07:15\"},
      {\"name\": \"School\", \"time\": \"07:45\"}
    ]
  }"

# Expected: 200 OK with route object

# Test 3: Assign student
ROUTE_ID="<route-id-from-test-2>"
STUDENT_ID="<student-id>"

curl -X POST $API_URL/transport/assignments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"routeId\": \"$ROUTE_ID\",
    \"studentId\": \"$STUDENT_ID\",
    \"pickupStop\": \"Main Gate\",
    \"dropStop\": \"Main Gate\"
  }"

# Expected: 200 OK with assignment object

# Test 4: Get student assignments
curl "$API_URL/transport/assignments?studentId=$STUDENT_ID" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with array of assignments
```

### 3. Inventory Module Tests

```bash
# Test 1: Create asset
curl -X POST $API_URL/inventory/assets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop Dell XPS",
    "category": "Equipment",
    "quantity": 10,
    "supplier": "Dell Inc",
    "purchaseDate": "2024-01-15T00:00:00Z",
    "cost": 1200.00,
    "location": "Computer Lab"
  }'

# Expected: 200 OK with asset object

# Test 2: Record purchase
ASSET_ID="<asset-id-from-test-1>"

curl -X POST $API_URL/inventory/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"assetId\": \"$ASSET_ID\",
    \"type\": \"PURCHASE\",
    \"quantity\": 5,
    \"remarks\": \"New batch for science lab\"
  }"

# Expected: 200 OK with transaction object
# Asset quantity should increase

# Test 3: Record disposal
curl -X POST $API_URL/inventory/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"assetId\": \"$ASSET_ID\",
    \"type\": \"DISPOSAL\",
    \"quantity\": 2,
    \"remarks\": \"Damaged items\"
  }"

# Expected: 200 OK with transaction object
# Asset quantity should decrease
```

### 4. Event Module Tests

```bash
# Test 1: Create event
curl -X POST $API_URL/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Annual Sports Day",
    "description": "Inter-house sports competition",
    "type": "Sports",
    "venue": "Main Ground",
    "startDate": "2024-03-15T09:00:00Z",
    "endDate": "2024-03-15T17:00:00Z"
  }'

# Expected: 200 OK with event object

# Test 2: Add participant
EVENT_ID="<event-id-from-test-1>"
STUDENT_ID="<student-id>"

curl -X POST $API_URL/events/$EVENT_ID/participants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"participantId\": \"$STUDENT_ID\",
    \"participantType\": \"STUDENT\",
    \"role\": \"Participant\"
  }"

# Expected: 200 OK with participant object

# Test 3: Get upcoming events
curl $API_URL/events/upcoming \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with array of upcoming events
```

### 5. Disciplinary Module Tests

```bash
# Test 1: Create record
STUDENT_ID="<student-id>"

curl -X POST $API_URL/disciplinary/records \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"studentId\": \"$STUDENT_ID\",
    \"incidentDate\": \"2024-01-20T10:30:00Z\",
    \"description\": \"Fighting in classroom\",
    \"severity\": \"Major\",
    \"reportedBy\": \"teacher-uuid\"
  }"

# Expected: 200 OK with record object

# Test 2: Update record
RECORD_ID="<record-id-from-test-1>"

curl -X PATCH $API_URL/disciplinary/records/$RECORD_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Resolved",
    "actionTaken": "Parent meeting completed, student counseled"
  }'

# Expected: 200 OK with updated record

# Test 3: Get statistics
curl $API_URL/disciplinary/stats \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with stats object
```

### 6. Health Module Tests

```bash
# Test 1: Create health record
STUDENT_ID="<student-id>"

curl -X POST $API_URL/health/records \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"studentId\": \"$STUDENT_ID\",
    \"bloodGroup\": \"O+\",
    \"allergies\": \"Peanuts, Dust\",
    \"conditions\": \"Asthma\",
    \"emergencyContact\": {
      \"name\": \"Jane Doe\",
      \"phone\": \"+1234567890\",
      \"relation\": \"Mother\"
    }
  }"

# Expected: 200 OK with health record object

# Test 2: Record incident
HEALTH_RECORD_ID="<health-record-id-from-test-1>"

curl -X POST $API_URL/health/incidents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"healthRecordId\": \"$HEALTH_RECORD_ID\",
    \"description\": \"Minor cut on finger\",
    \"treatment\": \"Cleaned and bandaged\",
    \"treatedBy\": \"School Nurse\"
  }"

# Expected: 200 OK with incident object

# Test 3: Record vaccination
curl -X POST $API_URL/health/vaccinations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"healthRecordId\": \"$HEALTH_RECORD_ID\",
    \"vaccineName\": \"COVID-19 Booster\",
    \"date\": \"2024-01-15T00:00:00Z\",
    \"nextDue\": \"2024-07-15T00:00:00Z\"
  }"

# Expected: 200 OK with vaccination object

# Test 4: Get health record
curl $API_URL/health/records/$STUDENT_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with complete health record including incidents and vaccinations
```

## Automated Test Suite

### Unit Tests Example

```typescript
// tests/unit/libraryService.test.ts
import { LibraryService } from '../../src/services/libraryService';

describe('LibraryService', () => {
  const tenantId = 'test-tenant-id';

  describe('borrowBook', () => {
    it('should decrease available count when borrowing', async () => {
      const book = await LibraryService.createBook(tenantId, {
        title: 'Test Book',
        author: 'Test Author',
        totalCopies: 5,
        available: 5
      });

      await LibraryService.borrowBook(tenantId, {
        bookId: book.id,
        borrowerId: 'student-id',
        borrowerType: 'STUDENT',
        dueDate: new Date('2024-03-01')
      });

      const updatedBook = await prisma.book.findUnique({
        where: { id: book.id }
      });

      expect(updatedBook?.available).toBe(4);
    });

    it('should throw error when book not available', async () => {
      const book = await LibraryService.createBook(tenantId, {
        title: 'Test Book',
        author: 'Test Author',
        totalCopies: 1,
        available: 0
      });

      await expect(
        LibraryService.borrowBook(tenantId, {
          bookId: book.id,
          borrowerId: 'student-id',
          borrowerType: 'STUDENT',
          dueDate: new Date('2024-03-01')
        })
      ).rejects.toThrow('Book not available');
    });
  });

  describe('returnBook', () => {
    it('should increase available count when returning', async () => {
      // Test implementation
    });
  });
});
```

### Integration Tests Example

```typescript
// tests/integration/library.test.ts
import request from 'supertest';
import app from '../../src/app';

describe('Library API', () => {
  let token: string;
  let bookId: string;

  beforeAll(async () => {
    // Setup: Login and get token
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'password' });
    token = response.body.token;
  });

  describe('POST /library/books', () => {
    it('should create a new book', async () => {
      const response = await request(app)
        .post('/library/books')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test Book',
          author: 'Test Author',
          isbn: '978-1234567890',
          genre: 'Fiction',
          totalCopies: 5,
          available: 5
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Test Book');
      bookId = response.body.id;
    });
  });

  describe('POST /library/borrow', () => {
    it('should borrow a book', async () => {
      const response = await request(app)
        .post('/library/borrow')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bookId,
          borrowerId: 'student-id',
          borrowerType: 'STUDENT',
          dueDate: '2024-03-01T00:00:00Z'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('BORROWED');
    });
  });
});
```

## Test Checklist

### Library Module
- [ ] Create book
- [ ] List books
- [ ] Filter books by genre
- [ ] Borrow book (student)
- [ ] Borrow book (staff)
- [ ] Return book without fine
- [ ] Return book with fine
- [ ] Mark book as lost
- [ ] Check availability updates
- [ ] Get transaction history
- [ ] Get statistics
- [ ] Test overdue detection

### Transport Module
- [ ] Create bus
- [ ] List buses
- [ ] Create route with stops
- [ ] List routes
- [ ] Assign student to route
- [ ] Prevent duplicate assignment
- [ ] Get student assignments
- [ ] Get route assignments
- [ ] Update bus details
- [ ] Update route stops

### Inventory Module
- [ ] Create asset
- [ ] List assets
- [ ] Filter by category
- [ ] Record purchase (increase quantity)
- [ ] Record disposal (decrease quantity)
- [ ] Record allocation
- [ ] Record maintenance
- [ ] Get transaction history
- [ ] Check quantity updates

### Event Module
- [ ] Create event
- [ ] List events
- [ ] Filter by type
- [ ] Get upcoming events
- [ ] Add student participant
- [ ] Add teacher participant
- [ ] Add staff participant
- [ ] Prevent duplicate participants
- [ ] Get event participants
- [ ] Update event details

### Disciplinary Module
- [ ] Create record
- [ ] List records
- [ ] Filter by student
- [ ] Filter by status
- [ ] Update record status
- [ ] Update action taken
- [ ] Get student history
- [ ] Get statistics
- [ ] Test severity levels

### Health Module
- [ ] Create health record
- [ ] Get health record
- [ ] Update health record
- [ ] Record medical incident
- [ ] Get incident history
- [ ] Record vaccination
- [ ] Get vaccination history
- [ ] Check emergency contact
- [ ] Test unique constraint (one record per student)

## Security Tests

### Tenant Isolation
```bash
# Test 1: Create book in Tenant A
curl -X POST http://tenant-a.localhost:3000/library/books \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{"title": "Book A", ...}'

# Test 2: Try to access from Tenant B
curl http://tenant-b.localhost:3000/library/books \
  -H "Authorization: Bearer $TOKEN_B"

# Expected: Should NOT see Book A
```

### Authentication
```bash
# Test without token
curl http://localhost:3000/library/books

# Expected: 401 Unauthorized
```

### Authorization
```bash
# Test with student token (if restricted)
curl http://localhost:3000/inventory/assets \
  -H "Authorization: Bearer $STUDENT_TOKEN"

# Expected: 403 Forbidden (if students can't access inventory)
```

## Performance Tests

### Load Testing with Apache Bench
```bash
# Test library endpoint
ab -n 1000 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/library/books

# Expected: < 100ms average response time
```

### Database Query Performance
```sql
-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%Book%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Test Data Cleanup

```bash
# Clean test data
psql $DATABASE_URL << EOF
DELETE FROM "BookTransaction" WHERE "tenantId" = 'test-tenant-id';
DELETE FROM "Book" WHERE "tenantId" = 'test-tenant-id';
DELETE FROM "BusAssignment" WHERE "tenantId" = 'test-tenant-id';
DELETE FROM "BusRoute" WHERE "tenantId" = 'test-tenant-id';
DELETE FROM "Bus" WHERE "tenantId" = 'test-tenant-id';
DELETE FROM "AssetTransaction" WHERE "tenantId" = 'test-tenant-id';
DELETE FROM "Asset" WHERE "tenantId" = 'test-tenant-id';
DELETE FROM "EventParticipant" WHERE "tenantId" = 'test-tenant-id';
DELETE FROM "Event" WHERE "tenantId" = 'test-tenant-id';
DELETE FROM "DisciplinaryRecord" WHERE "tenantId" = 'test-tenant-id';
DELETE FROM "Vaccination" WHERE "tenantId" = 'test-tenant-id';
DELETE FROM "MedicalIncident" WHERE "tenantId" = 'test-tenant-id';
DELETE FROM "HealthRecord" WHERE "tenantId" = 'test-tenant-id';
EOF
```

## CI/CD Integration

```yaml
# .github/workflows/test-tier2.yml
name: Tier 2 Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm run db:push
      - run: npm test
```

## Test Coverage Goals

- Unit Tests: > 80% coverage
- Integration Tests: All endpoints
- E2E Tests: Critical workflows
- Security Tests: All modules
- Performance Tests: Key endpoints

---

**Run all tests:**
```bash
npm test
```

**Run specific module:**
```bash
npm test -- library
```

**Run with coverage:**
```bash
npm test -- --coverage
```
