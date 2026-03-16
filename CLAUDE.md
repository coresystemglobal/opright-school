# smp-server

Multi-tenant SaaS school management platform backend (Express + TypeScript + Prisma + PostgreSQL).

<!-- AUTO-MANAGED: architecture -->
## Architecture

- `src/middleware/` - Express middleware (auth, authorization, tenant, validation, error handling)
- `src/utils/` - Shared utilities (permissions, tenant scoping, encryption, storage, schemas)
- `src/services/` - Business logic services (`RoleService`, `AcademicYearService`, `TermService`, `SubjectService`, `TimetableService`, `GradebookService`, `AttendanceService`, …)
- `src/controllers/` - Route controllers (roles, academicYears, terms, subjects, timetable, gradebook, attendance, …)
- `src/routes/` - Express route definitions
- `src/prisma/` - Prisma client instance
- `src/workers/` - Background workers

### Prisma Schema Domains

All models carry `tenantId: String @db.Uuid` with cascade delete and `@index([tenantId])`.

| Domain | Models |
|--------|--------|
| Tenancy & Auth | `Tenant`, `User`, `Role`, `Permission`, `RolePermission` |
| People | `Student`, `Teacher` |
| Academic | `Class`, `Enrollment`, `AcademicYear`, `Term`, `Subject`, `Grade`, `Timetable` |
| Assessments | `Assignment`, `Examination`, `ExamResult` |
| Finance | `Fee`, `Payment` |
| Attendance | `Attendance` |
| Library | `Book`, `BookTransaction` |
| Transport | `Bus`, `BusRoute`, `BusAssignment` |
| Assets | `Asset`, `AssetTransaction` |
| Events & Activities | `Event`, `EventParticipant`, `Activity`, `ActivityEnrollment`, `Competition` |
| Health | `HealthRecord`, `MedicalIncident`, `Vaccination` |
| Hostel & Meals | `HostelRoom`, `HostelAssignment`, `MealPlan` |
| Visitors | `VisitorLog` |
| Discipline | `DisciplinaryRecord` |
| E-Learning | `Course`, `CourseModule`, `Lesson`, `LessonProgress`, `CourseEnrollment`, `Quiz`, `QuizAttempt`, `Submission`, `LiveClass`, `LiveClassAttendance`, `Discussion`, `DiscussionReply`, `Certificate` |
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: patterns -->
## Patterns

### Controller Pattern

All controllers follow a consistent structure:

- Check `req.tenantId` at the top of every handler; return `400` if missing
- Parse and validate the request with an inline Zod schema; return `400` on validation failure
- Delegate to a `*Service` class instantiated with the shared `prisma` client at module level
- HTTP status conventions: `201` for create, `204` for delete, `200` + JSON for reads/updates
- Service instantiated at module level: `const service = new FooService(prisma)`

### Controller Method Coverage

| Controller | Methods |
|---|---|
| `roleController` | `createRole`, `getRoles`, `getRole`, `updateRole`, `deleteRole`, `getPermissions`, `assignRole` |
| `academicYearController` | `create`, `list`, `getCurrent`, `update`, `delete` |
| `termController` | `create`, `list` (filter: `?academicYearId`), `getCurrent`, `update`, `delete` |
| `subjectController` | `create`, `list` (filter: `?classId&academicYearId&teacherId`), `getById`, `update`, `delete`, `assignTeacher` |
| `timetableController` | `create`, `listByClass`, `listByTeacher`, `update`, `delete` |
| `attendanceController` | `markAttendance`, `bulkMarkAttendance`, `getAttendance`, `getAttendanceStats`, `getClassAttendanceReport` |
| `gradebookController` | `createAssignment`, `listAssignments`, `recordGrade`, `bulkRecordGrades`, `getStudentGrades`, `calculateSubjectAverage`, `getStudentReportCard`, `createExamination`, `recordExamResult`, `getExamResults` |

### Authorization (RBAC)

- Use `authorize(resource, action)` middleware from `src/middleware/authorize.ts` to protect routes
- `RESOURCES` const (`src/utils/permissions.ts`): `students`, `teachers`, `classes`, `attendance`, `fees`, `payments`, `roles` — newer domains (`academicYears`, `terms`, `subjects`, `timetables`, `gradebook`) are not yet added to `RESOURCES` and cannot use `authorize()` until they are
- `ACTIONS` const: `create`, `read`, `update`, `delete`
- Permission check delegates to `RoleService.checkPermission(userId, resource, action)`
- Data model: `User -> Role -> RolePermission -> Permission (resource + action)`
- Returns `401` if unauthenticated, `403` if permission denied

```ts
// Route usage
router.post('/students', authenticate, authorize(RESOURCES.STUDENTS, ACTIONS.CREATE), handler);
```

### Multi-Tenancy (Row-Level Security)

- Use `withTenant(tenantId, fn)` from `src/utils/withTenant.ts` to scope DB operations
- Sets PostgreSQL session variable `app.current_tenant` via `set_config()` inside a transaction
- Enables PostgreSQL RLS policies to automatically filter rows by tenant

```ts
// Usage
const result = await withTenant(tenantId, (tx) => tx.student.findMany());
```

### Auth Routes

- POST `/auth/login`: rate-limited via `authLimiter`, validates with `loginSchema`, uses `withTenant` for DB scoping, bcrypt password compare; JWT payload: `{ userId, tenantId, roleId }` (expires 7d); response: `{ token, user: { id, email, roleId, role, tenantId } }`
- POST `/auth/register`: rate-limited via `authLimiter`, validates with `registerSchema`, creates user; sends welcome email via `NotificationService.sendEmail` fire-and-forget (`.catch` logged, never throws); response: `{ id, email, roleId }` (201)

### Standalone Permission Check

- `hasPermission(userId, resource, action)` in `src/utils/permissions.ts` - queries Prisma directly without going through `RoleService`; use when middleware context is unavailable
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: environment -->
## Environment Variables

Validated at startup by Zod schema in `src/server.ts`; process exits on failure.

**Required:**
- `DATABASE_URL` — direct PostgreSQL URL (used by Prisma for migrations)
- `PRISMA_DATABASE_URL` — pooled PostgreSQL URL (used by Prisma client at runtime)
- `JWT_SECRET` — min 32 characters
- `ENCRYPTION_KEY` — exactly 64 hex characters
- `UPSTASH_REDIS_REST_URL` — Upstash Redis REST URL (must be a valid URL)
- `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis REST token
- `QSTASH_TOKEN` — QStash publish token
- `QSTASH_CURRENT_SIGNING_KEY` — QStash current signing key
- `QSTASH_NEXT_SIGNING_KEY` — QStash next signing key
- `APP_URL` — public app URL (must be a valid URL)

**Optional:**
- `PORT` (default: `3000`), `NODE_ENV` (`development`|`production`|`test`)
- `CORS_ORIGIN`
- `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`
- `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`
- `PAYSTACK_SECRET_KEY`
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: dependencies -->
## Key Dependencies

- `src/prisma/client.ts` - Shared Prisma client instance (injected into every service at module load)
- `src/utils/permissions.ts` - `RESOURCES`, `ACTIONS` constants + `hasPermission()` utility
- `src/services/roleService.ts` - `RoleService`: role CRUD, permission assignment, `checkPermission()`
- `src/services/academicYearService.ts` - `AcademicYearService`: create/list/getCurrent/update/delete academic years
- `src/services/termService.ts` - `TermService`: term management scoped to an academic year
- `src/services/subjectService.ts` - `SubjectService`: subject CRUD + `assignTeacher()`
- `src/services/timetableService.ts` - `TimetableService`: timetable entries; query by class or teacher
- `src/services/gradebookService.ts` - `GradebookService`: assignments, grades (bulk), examinations, exam results, report cards
- `src/services/attendanceService.ts` - `AttendanceService`: mark/bulk-mark attendance, stats, class reports; statuses: `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`
<!-- END AUTO-MANAGED -->
