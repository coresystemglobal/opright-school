# How It Works — Principal

The **Principal** role provides school oversight — managing staff, monitoring academics, reviewing disciplinary records, and viewing financial summaries. Principals cannot create or delete students directly but can manage teachers and view all academic data.

---

## 1. Authentication

```
POST /auth/login
{ "email": "principal@school.com", "password": "yourPassword" }
```

Use the returned JWT token in all requests: `Authorization: Bearer <token>`

---

## 2. Permissions Overview

| Resource | Create | Read | Update | Delete |
|---|---|---|---|---|
| Students | ✗ | ✓ | ✓ | ✗ |
| Teachers | ✓ | ✓ | ✓ | ✗ |
| Classes | ✓ | ✓ | ✓ | ✗ |
| Attendance | ✗ | ✓ | ✗ | ✗ |
| Fees | ✓ | ✓ | ✓ | ✗ |
| Payments | ✗ | ✓ | ✗ | ✗ |
| Roles | ✗ | ✓ | ✗ | ✗ |

---

## 3. Staff Management

### View & Manage Teachers

| Action | Endpoint |
|---|---|
| List all teachers | `GET /teachers` |
| Create teacher | `POST /teachers` |
| Update teacher | `PUT /teachers/:id` |

### View Students

| Action | Endpoint |
|---|---|
| List students | `GET /students` |
| Update student info | `PUT /students/:id` |

---

## 4. Academic Monitoring

### View Academic Structure

| Action | Endpoint |
|---|---|
| List academic years | `GET /academic-years` |
| Get current year | `GET /academic-years/current` |
| List terms | `GET /terms` |
| Get current term | `GET /terms/current` |
| List subjects | `GET /subjects` |
| View class timetable | `GET /timetables/class/:classId` |
| View teacher timetable | `GET /timetables/teacher/:teacherId` |

### View Attendance

| Action | Endpoint |
|---|---|
| List attendance records | `GET /attendances?classId=<id>&date=<date>` |
| Class attendance report | `GET /attendances/class/:classId/report?date=<date>` |
| Student attendance stats | `GET /attendances/stats/:studentId?startDate=<>&endDate=<>` |

### View Grades & Report Cards

| Action | Endpoint |
|---|---|
| Student grades | `GET /gradebook/grades/student/:studentId` |
| Subject average | `GET /gradebook/grades/student/:studentId/subject/:subjectId/average` |
| Report card | `GET /gradebook/report-card/:studentId/term/:termId` |
| Exam results | `GET /gradebook/exam-results?studentId=<id>` |

---

## 5. Disciplinary Management

Principals have full access to the disciplinary module:

| Action | Endpoint |
|---|---|
| List records | `GET /disciplinary/records?studentId=<>&status=<>` |
| Create record | `POST /disciplinary/records` |
| Update record | `PATCH /disciplinary/records/:id` |
| View statistics | `GET /disciplinary/stats` |

**Create a disciplinary record:**
```json
{
  "studentId": "<student-id>",
  "incidentType": "MISCONDUCT",
  "description": "Repeated tardiness",
  "actionTaken": "Warning issued",
  "status": "OPEN"
}
```

**Update to resolved:**
```json
{ "actionTaken": "Parent meeting held", "status": "RESOLVED" }
```

---

## 6. Financial Overview

### View Fees & Payments

| Action | Endpoint |
|---|---|
| View fee structures | `GET /payments/fees` (via fees:read permission) |
| Create fee | `POST /payments/fees` |
| View student payments | `GET /payments/student/:studentId` |

---

## 7. Class Management

| Action | Endpoint |
|---|---|
| List classes | `GET /classes` |
| Create class | `POST /classes` |
| Enroll student | `POST /classes/:classId/enroll` |

---

## 8. Typical Daily Workflow

1. **Morning** — Review class attendance reports for the day
2. **Ongoing** — Monitor disciplinary records, approve teacher actions
3. **Weekly** — Review attendance statistics across classes
4. **End of term** — Review report cards, exam results, and grade distributions
5. **As needed** — Create fee structures, manage teacher assignments
