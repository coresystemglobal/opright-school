# Migration Guide - Tier 1 Features

## Overview
This guide helps you migrate your existing school management system to include all Tier 1 features.

## Prerequisites
- Node.js installed
- PostgreSQL database running
- Existing tenant data (optional)

## Step-by-Step Migration

### 1. Update Dependencies
Ensure all dependencies are installed:
```bash
npm install
```

### 2. Update Database Schema
Apply the new schema changes:
```bash
# Push schema changes to database
npm run db:push

# Generate Prisma client
npm run db:generate
```

This will create the following new tables:
- `AcademicYear`
- `Term`
- `Subject`
- `Timetable`
- `Assignment`
- `Grade`
- `Examination`
- `ExamResult`

### 3. Verify Database Changes
Check that all tables were created:
```bash
psql $DATABASE_URL -c "\dt"
```

You should see all the new tables listed.

### 4. Seed Initial Data (Optional)
If you want to populate test data:
```bash
# Get your tenant ID first
psql $DATABASE_URL -c "SELECT id, name FROM \"Tenant\";"

# Run seed script
tsx src/utils/seedTier1.ts <your-tenant-id>
```

### 5. Start the Server
```bash
npm run dev
```

### 6. Test the API
Use the examples in [TIER1_API_GUIDE.md](TIER1_API_GUIDE.md) to test each endpoint.

## Data Migration from Existing System

If you're migrating from an existing system, follow these steps:

### Academic Years
```sql
-- Example: Migrate from old academic_years table
INSERT INTO "AcademicYear" (id, "tenantId", name, "startDate", "endDate", "isCurrent", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  '<your-tenant-id>',
  year_name,
  start_date,
  end_date,
  is_active,
  NOW(),
  NOW()
FROM old_academic_years;
```

### Terms
```sql
-- Example: Migrate from old terms table
INSERT INTO "Term" (id, "tenantId", "academicYearId", name, "startDate", "endDate", "isCurrent", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  '<your-tenant-id>',
  (SELECT id FROM "AcademicYear" WHERE name = old_terms.academic_year LIMIT 1),
  term_name,
  start_date,
  end_date,
  is_active,
  NOW(),
  NOW()
FROM old_terms;
```

### Subjects
```sql
-- Example: Migrate from old subjects table
INSERT INTO "Subject" (id, "tenantId", "academicYearId", name, code, "classId", "teacherId", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  '<your-tenant-id>',
  (SELECT id FROM "AcademicYear" WHERE "isCurrent" = true LIMIT 1),
  subject_name,
  subject_code,
  class_id,
  teacher_id,
  NOW(),
  NOW()
FROM old_subjects;
```

### Attendance Records
```sql
-- Example: Migrate from old attendance table
INSERT INTO "Attendance" (id, "tenantId", "studentId", date, status, remarks, "createdAt")
SELECT 
  gen_random_uuid(),
  '<your-tenant-id>',
  student_id,
  attendance_date,
  CASE 
    WHEN status = 'P' THEN 'PRESENT'::\"AttendanceStatus\"
    WHEN status = 'A' THEN 'ABSENT'::\"AttendanceStatus\"
    WHEN status = 'L' THEN 'LATE'::\"AttendanceStatus\"
    ELSE 'EXCUSED'::\"AttendanceStatus\"
  END,
  notes,
  NOW()
FROM old_attendance;
```

### Grades
```sql
-- Example: Migrate from old grades table
INSERT INTO "Grade" (id, "tenantId", "studentId", "subjectId", score, "maxScore", remarks, "gradedAt", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  '<your-tenant-id>',
  student_id,
  (SELECT id FROM "Subject" WHERE code = old_grades.subject_code LIMIT 1),
  score,
  max_score,
  comments,
  graded_date,
  NOW(),
  NOW()
FROM old_grades;
```

## Rollback Plan

If you need to rollback the migration:

### 1. Backup Current Data
```bash
pg_dump $DATABASE_URL > backup_before_tier1.sql
```

### 2. Drop New Tables (if needed)
```sql
DROP TABLE IF EXISTS "ExamResult" CASCADE;
DROP TABLE IF EXISTS "Examination" CASCADE;
DROP TABLE IF EXISTS "Grade" CASCADE;
DROP TABLE IF EXISTS "Assignment" CASCADE;
DROP TABLE IF EXISTS "Timetable" CASCADE;
DROP TABLE IF EXISTS "Subject" CASCADE;
DROP TABLE IF EXISTS "Term" CASCADE;
DROP TABLE IF EXISTS "AcademicYear" CASCADE;
```

### 3. Restore from Backup
```bash
psql $DATABASE_URL < backup_before_tier1.sql
```

## Post-Migration Checklist

- [ ] All new tables created successfully
- [ ] Existing data still accessible
- [ ] Academic year created for current year
- [ ] Terms created (at least one marked as current)
- [ ] Subjects created and assigned to classes
- [ ] Teachers assigned to subjects
- [ ] Timetable entries created
- [ ] Test attendance marking works
- [ ] Test grade recording works
- [ ] Report card generation works
- [ ] All API endpoints responding correctly
- [ ] Multi-tenant isolation still working
- [ ] Authentication still working

## Common Issues

### Issue: Prisma Client Out of Sync
**Solution:**
```bash
npm run db:generate
```

### Issue: Foreign Key Constraint Errors
**Solution:** Ensure parent records exist before creating child records. Order:
1. AcademicYear
2. Term
3. Subject (requires Class and Teacher)
4. Timetable (requires Subject, Class, Teacher)
5. Assignment (requires Subject, Term)
6. Grade (requires Student, Subject, Assignment)

### Issue: Unique Constraint Violations
**Solution:** Check for duplicate:
- Academic year names per tenant
- Term names per academic year
- Subject codes per class/academic year
- Attendance records per student/date
- Grades per student/assignment

### Issue: Timetable Conflicts
**Solution:** The system automatically detects conflicts. Ensure:
- No class is scheduled in two places at once
- No teacher is scheduled in two places at once
- No room is double-booked

## Performance Optimization

After migration, create additional indexes if needed:
```sql
-- For frequently queried date ranges
CREATE INDEX idx_attendance_date_range ON "Attendance" ("tenantId", date);
CREATE INDEX idx_assignment_due_date ON "Assignment" ("tenantId", "dueDate");

-- For report generation
CREATE INDEX idx_grade_student_subject ON "Grade" ("tenantId", "studentId", "subjectId");
CREATE INDEX idx_exam_result_student ON "ExamResult" ("tenantId", "studentId");
```

## Support

If you encounter issues during migration:
1. Check the error logs
2. Verify database connection
3. Ensure all foreign key references are valid
4. Review the [TIER1_FEATURES.md](TIER1_FEATURES.md) documentation
5. Test with the [TIER1_API_GUIDE.md](TIER1_API_GUIDE.md) examples

## Next Steps

After successful migration:
1. Train staff on new features
2. Import historical data if needed
3. Set up current academic year and term
4. Create class schedules
5. Begin daily attendance tracking
6. Start using the gradebook
7. Plan for Tier 2 features (Fee Management, Parent Portal, etc.)
