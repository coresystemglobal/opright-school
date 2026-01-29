# School Management System - API Guide

## Quick Start

### 1. Setup Database
```bash
npm run db:setup
```

### 2. Start Server
```bash
npm run dev
```

### 3. Get Authentication Token
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.com",
    "password": "password123"
  }'
```

Use the token in all subsequent requests:
```
Authorization: Bearer <your-token>
```

## API Endpoints

### Academic Year Management

**Create Academic Year:**
```bash
curl -X POST http://localhost:3000/academic-years \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "2024/2025",
    "startDate": "2024-09-01",
    "endDate": "2025-06-30",
    "isCurrent": true
  }'
```

**List Academic Years:**
```bash
curl http://localhost:3000/academic-years \
  -H "Authorization: Bearer <token>"
```

**Get Current Academic Year:**
```bash
curl http://localhost:3000/academic-years/current \
  -H "Authorization: Bearer <token>"
```

**Update Academic Year:**
```bash
curl -X PUT http://localhost:3000/academic-years/<id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "2024/2025 Updated"}'
```

**Delete Academic Year:**
```bash
curl -X DELETE http://localhost:3000/academic-years/<id> \
  -H "Authorization: Bearer <token>"
```

### Term Management

**Create Term:**
```bash
curl -X POST http://localhost:3000/terms \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Term 1",
    "academicYearId": "<academic-year-id>",
    "startDate": "2024-09-01",
    "endDate": "2024-12-15",
    "isCurrent": true
  }'
```

**List Terms:**
```bash
# All terms
curl http://localhost:3000/terms \
  -H "Authorization: Bearer <token>"

# Filter by academic year
curl "http://localhost:3000/terms?academicYearId=<id>" \
  -H "Authorization: Bearer <token>"
```

**Get Current Term:**
```bash
curl http://localhost:3000/terms/current \
  -H "Authorization: Bearer <token>"
```

### Subject Management

**Create Subject:**
```bash
curl -X POST http://localhost:3000/subjects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mathematics",
    "code": "MATH101",
    "description": "Advanced Mathematics",
    "classId": "<class-id>",
    "teacherId": "<teacher-id>",
    "academicYearId": "<academic-year-id>"
  }'
```

**List Subjects:**
```bash
# All subjects
curl http://localhost:3000/subjects \
  -H "Authorization: Bearer <token>"

# Filter by class
curl "http://localhost:3000/subjects?classId=<id>" \
  -H "Authorization: Bearer <token>"

# Filter by teacher
curl "http://localhost:3000/subjects?teacherId=<id>" \
  -H "Authorization: Bearer <token>"
```

**Assign Teacher:**
```bash
curl -X POST http://localhost:3000/subjects/<subject-id>/assign-teacher \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"teacherId": "<teacher-id>"}'
```

### Timetable Management

**Create Timetable Entry:**
```bash
curl -X POST http://localhost:3000/timetables \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "academicYearId": "<academic-year-id>",
    "subjectId": "<subject-id>",
    "classId": "<class-id>",
    "teacherId": "<teacher-id>",
    "dayOfWeek": 1,
    "startTime": "09:00",
    "endTime": "10:00",
    "room": "Room 101"
  }'
```

Note: `dayOfWeek` is 0=Sunday, 1=Monday, ..., 6=Saturday

**Get Class Timetable:**
```bash
curl http://localhost:3000/timetables/class/<class-id> \
  -H "Authorization: Bearer <token>"
```

**Get Teacher Timetable:**
```bash
curl http://localhost:3000/timetables/teacher/<teacher-id> \
  -H "Authorization: Bearer <token>"
```

### Attendance Management

**Mark Single Attendance:**
```bash
curl -X POST http://localhost:3000/attendances \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "<student-id>",
    "date": "2024-01-15",
    "status": "PRESENT"
  }'
```

Status options: `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`

**Bulk Mark Attendance:**
```bash
curl -X POST http://localhost:3000/attendances/bulk \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "studentId": "<student-id-1>",
      "date": "2024-01-15",
      "status": "PRESENT"
    },
    {
      "studentId": "<student-id-2>",
      "date": "2024-01-15",
      "status": "ABSENT",
      "remarks": "Sick"
    }
  ]'
```

**Get Attendance Records:**
```bash
# By student
curl "http://localhost:3000/attendances?studentId=<id>" \
  -H "Authorization: Bearer <token>"

# By class and date
curl "http://localhost:3000/attendances?classId=<id>&date=2024-01-15" \
  -H "Authorization: Bearer <token>"

# Date range
curl "http://localhost:3000/attendances?studentId=<id>&startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer <token>"
```

**Get Attendance Statistics:**
```bash
curl "http://localhost:3000/attendances/stats/<student-id>?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer <token>"
```

**Get Class Attendance Report:**
```bash
curl "http://localhost:3000/attendances/class/<class-id>/report?date=2024-01-15" \
  -H "Authorization: Bearer <token>"
```

### Gradebook Management

**Create Assignment:**
```bash
curl -X POST http://localhost:3000/gradebook/assignments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "academicYearId": "<academic-year-id>",
    "termId": "<term-id>",
    "subjectId": "<subject-id>",
    "title": "Algebra Quiz 1",
    "description": "Complete exercises 1-10",
    "maxScore": 100,
    "weight": 1.5,
    "dueDate": "2024-01-20"
  }'
```

**List Assignments:**
```bash
# All assignments
curl http://localhost:3000/gradebook/assignments \
  -H "Authorization: Bearer <token>"

# Filter by subject
curl "http://localhost:3000/gradebook/assignments?subjectId=<id>" \
  -H "Authorization: Bearer <token>"
```

**Record Single Grade:**
```bash
curl -X POST http://localhost:3000/gradebook/grades \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "<student-id>",
    "subjectId": "<subject-id>",
    "assignmentId": "<assignment-id>",
    "score": 85,
    "maxScore": 100,
    "remarks": "Good work",
    "gradedBy": "<teacher-id>"
  }'
```

**Bulk Record Grades:**
```bash
curl -X POST http://localhost:3000/gradebook/grades/bulk \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "studentId": "<student-id-1>",
      "subjectId": "<subject-id>",
      "assignmentId": "<assignment-id>",
      "score": 85,
      "maxScore": 100,
      "gradedBy": "<teacher-id>"
    }
  ]'
```

**Get Student Grades:**
```bash
curl http://localhost:3000/gradebook/grades/student/<student-id> \
  -H "Authorization: Bearer <token>"
```

**Calculate Subject Average:**
```bash
curl http://localhost:3000/gradebook/grades/student/<student-id>/subject/<subject-id>/average \
  -H "Authorization: Bearer <token>"
```

**Generate Report Card:**
```bash
curl http://localhost:3000/gradebook/report-card/<student-id>/term/<term-id> \
  -H "Authorization: Bearer <token>"
```

**Create Examination:**
```bash
curl -X POST http://localhost:3000/gradebook/examinations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "academicYearId": "<academic-year-id>",
    "termId": "<term-id>",
    "subjectId": "<subject-id>",
    "name": "Mid-term Exam",
    "examDate": "2024-11-15",
    "duration": 120,
    "maxScore": 100,
    "passingScore": 50,
    "room": "Exam Hall"
  }'
```

**Record Exam Result:**
```bash
curl -X POST http://localhost:3000/gradebook/exam-results \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "examinationId": "<examination-id>",
    "studentId": "<student-id>",
    "score": 78,
    "grade": "B",
    "remarks": "Good performance"
  }'
```

**Get Exam Results:**
```bash
# By examination
curl "http://localhost:3000/gradebook/exam-results?examinationId=<id>" \
  -H "Authorization: Bearer <token>"

# By student
curl "http://localhost:3000/gradebook/exam-results?studentId=<id>" \
  -H "Authorization: Bearer <token>"
```

## Complete Workflow

### 1. Setup Academic Structure
```bash
# Create academic year
curl -X POST http://localhost:3000/academic-years ...

# Create terms
curl -X POST http://localhost:3000/terms ...

# Create subjects
curl -X POST http://localhost:3000/subjects ...

# Create timetable
curl -X POST http://localhost:3000/timetables ...
```

### 2. Daily Operations
```bash
# Mark attendance
curl -X POST http://localhost:3000/attendances/bulk ...

# Create assignment
curl -X POST http://localhost:3000/gradebook/assignments ...

# Record grades
curl -X POST http://localhost:3000/gradebook/grades/bulk ...
```

### 3. End of Term
```bash
# Create examinations
curl -X POST http://localhost:3000/gradebook/examinations ...

# Record exam results
curl -X POST http://localhost:3000/gradebook/exam-results ...

# Generate report cards
curl http://localhost:3000/gradebook/report-card/<student-id>/term/<term-id>
```

## Seed Test Data

```bash
# Get tenant ID
psql $DATABASE_URL -c "SELECT id, name FROM \"Tenant\";"

# Run seed script
npm run seed:tier1 <tenant-id>
```

## Error Responses

All endpoints return consistent error responses:
```json
{
  "error": "Error message description"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `204` - No Content (successful deletion)
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

## Tips

1. **Conflict Detection:** Timetable creation fails if there's a scheduling conflict
2. **Unique Constraints:** Cannot create duplicate attendance for same student/date
3. **Weighted Grades:** Use `weight` field in assignments for weighted calculations
4. **Current Flags:** Only one academic year and one term per year can be current
5. **Bulk Operations:** Use bulk endpoints for better performance
6. **Date Format:** Use ISO 8601 format (YYYY-MM-DD)
7. **Time Format:** Use 24-hour format (HH:MM)

## Common Issues

### Issue: Prisma Client Out of Sync
**Solution:**
```bash
npm run db:generate
```

### Issue: Database Connection Error
**Solution:** Ensure PostgreSQL is running and DATABASE_URL is correct

### Issue: Timetable Conflicts
**Solution:** Check existing schedules for class, teacher, and room

### Issue: Unique Constraint Violations
**Solution:** Check for duplicate records before creating

## Documentation

- [APP_FEATURES.md](APP_FEATURES.md) - Feature documentation
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Migration instructions
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Quick reference
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Deployment guide
