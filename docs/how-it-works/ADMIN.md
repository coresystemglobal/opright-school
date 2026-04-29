# How It Works — Admin

The **Admin** role has full system access. Admins onboard the school, manage all users, configure academics, handle billing, and oversee every module.

---

## 1. School Onboarding

A new school is created via the public onboarding endpoint (no auth required):

```
POST /onboarding/school
```

**Body:**
```json
{
  "schoolName": "Greenwood Academy",
  "schoolCode": "greenwood",
  "adminName": "Ada Nwosu",
  "adminEmail": "admin@greenwood.edu",
  "adminPassword": "securePass123",
  "schoolType": "SECONDARY",
  "studentCount": 200
}
```

This creates:
- A new **Tenant** (isolated school)
- Default **Roles** (Admin, Principal, Teacher, Staff, Parent, Student)
- Default **Permissions** (CRUD on students, teachers, classes, attendance, fees, payments, roles)
- The first **Admin user** account

After onboarding, the admin logs in at the school's subdomain:

```
POST /auth/login   (on greenwood.schoolos.ng)
{ "email": "admin@greenwood.edu", "password": "securePass123" }
```

The response contains a JWT token used for all subsequent requests.

---

## 2. User & Role Management

### Register Users

```
POST /auth/register
{ "email": "teacher@school.com", "password": "pass1234", "firstName": "Emeka", "lastName": "Okafor", "roleId": "<role-id>" }
```

### Manage Roles

| Action | Endpoint |
|---|---|
| List roles | `GET /roles` |
| Create role | `POST /roles` |
| Get role | `GET /roles/:id` |
| Update role | `PUT /roles/:id` |
| Delete role | `DELETE /roles/:id` |
| Assign role to user | `POST /roles/assign` |
| List permissions | `GET /roles/permissions` |

Roles are tenant-scoped. System roles (Admin, Principal, Teacher, Staff, Parent, Student) are created automatically during onboarding and marked `isSystem: true`.

### Create Parent Accounts

Admins create parent accounts and link them to students:

```
POST /parents
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "phone": "+2348000000000",
  "password": "parentPass1",
  "studentIds": ["<student-uuid-1>", "<student-uuid-2>"]
}
```

---

## 3. Academic Structure Setup

The typical setup flow each school year:

### Step 1 — Academic Year

```
POST /academic-years
{ "name": "2025/2026", "startDate": "2025-09-01", "endDate": "2026-07-31", "isCurrent": true }
```

Only one academic year can be `isCurrent` at a time. Setting a new one automatically deactivates the previous.

### Step 2 — Terms

```
POST /terms
{ "name": "First Term", "academicYearId": "<id>", "startDate": "2025-09-01", "endDate": "2025-12-15", "isCurrent": true }
```

### Step 3 — Classes

```
POST /classes
{ "name": "JSS 1A", "level": "JSS1", "teacherId": "<homeroom-teacher-id>" }
```

### Step 4 — Subjects

```
POST /subjects
{ "name": "Mathematics", "code": "MTH101", "classId": "<id>", "teacherId": "<id>", "academicYearId": "<id>" }
```

### Step 5 — Timetables

```
POST /timetables
{
  "academicYearId": "<id>", "subjectId": "<id>", "classId": "<id>",
  "teacherId": "<id>", "dayOfWeek": 1, "startTime": "09:00", "endTime": "10:00", "room": "Block A"
}
```

The system detects conflicts — it rejects entries where the same class, teacher, or room is double-booked at the same time.

---

## 4. Student Management

| Action | Endpoint |
|---|---|
| List students | `GET /students` |
| Create student | `POST /students` |
| Update student | `PUT /students/:id` |
| Delete student | `DELETE /students/:id` |
| Enroll in class | `POST /classes/:classId/enroll` |

### Candidate Admissions Pipeline

Admins manage applicants before they become students:

| Action | Endpoint |
|---|---|
| List candidates | `GET /candidates` |
| Create candidate | `POST /candidates` |
| Get candidate | `GET /candidates/:id` |
| Update candidate | `PUT /candidates/:id` |
| Admit candidate → student | `POST /candidates/:id/admit` |

Admitting a candidate automatically creates a Student record with a generated student ID.

---

## 5. Teacher Management

| Action | Endpoint |
|---|---|
| List teachers | `GET /teachers` |
| Create teacher | `POST /teachers` |
| Update teacher | `PUT /teachers/:id` |
| Delete teacher | `DELETE /teachers/:id` |
| Assign to subject | `POST /subjects/:id/assign-teacher` |

---

## 6. Fee & Payment Management

| Action | Endpoint |
|---|---|
| Create fee | `POST /payments/fees` |
| Record payment | `POST /payments` |
| Get student payments | `GET /payments/student/:studentId` |

---

## 7. Billing & Subscription

Admins manage the school's SaaS subscription:

| Action | Endpoint |
|---|---|
| View pricing tiers | `GET /billing/pricing` |
| Initialize payment | `POST /billing/initialize` |
| Verify payment | `POST /billing/verify` |
| View subscription | `GET /billing/subscription` |

**Initialize payment body:**
```json
{ "studentCount": 200, "billingCycle": "per_term", "email": "admin@school.com" }
```

---

## 8. All Module Access

As Admin, you have full access to every module in the system:

| Module | Base Path | Key Operations |
|---|---|---|
| Attendance | `/attendances` | Mark, bulk mark, stats, class reports |
| Gradebook | `/gradebook` | Assignments, grades, exams, report cards |
| E-Learning | `/elearning` + `/courses` | Courses, quizzes, live classes, certificates |
| Library | `/library` | Books, borrow/return, fines, stats |
| Transport | `/transport` | Buses, routes, student assignments |
| Inventory | `/inventory` | Assets, transactions |
| Events | `/events` | Create events, manage participants |
| Disciplinary | `/disciplinary` | Records, stats |
| Health | `/health` | Records (encrypted), incidents, vaccinations |
| Hostel | `/hostel` | Rooms, assignments, meal plans, visitors |
| Sports | `/sports` | Activities, enrollments, competitions |
| Notices | `/notices` | Create/list notices |
| Uploads | `/upload` | File upload, signed URLs, delete |

---

## 9. Custom Domain Setup

Admins can configure a custom domain for the school website:

| Step | Endpoint | Description |
|---|---|---|
| 1. Initiate | `POST /api/admin/website/domain/initiate` | Submit desired domain |
| 2. Configure DNS | — | Add CNAME record pointing to `websites.schoolos.ng` |
| 3. Verify | `POST /api/admin/website/domain/verify` | System checks DNS and provisions SSL |
| 4. Check SSL | `GET /api/admin/website/domain/ssl-status` | Monitor SSL certificate provisioning |

---

## 10. System Monitoring

| Action | Endpoint | Auth |
|---|---|---|
| Health check | `GET /health` | Public |
| API docs (Swagger UI) | `GET /docs` | Public |
| OpenAPI spec | `GET /docs/openapi.json` | Public |
| Postman collection | `GET /docs/postman-collection.json` | Public |

---

## Typical Daily Workflow

1. **Morning** — Review attendance reports, check system health
2. **Ongoing** — Approve candidate admissions, manage user accounts
3. **As needed** — Create fees, verify payments, handle disciplinary escalations
4. **End of term** — Generate report cards, review gradebook summaries
5. **Annually** — Create new academic year/terms, update billing subscription
