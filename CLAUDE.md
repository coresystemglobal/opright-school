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

All models carry `tenantId: String @db.Uuid` with cascade delete and `@index([tenantId])`. Note: `User.id` is plain `String` (not `@db.Uuid`); `User.tenantId` IS `@db.Uuid`. Exception: `Permission` has no `tenantId` — it is global (not tenant-scoped). `Role` has an `isSystem Boolean @default(false)` field. `Tenant` has `subdomain: String?` and `domain: String?` (each `@@unique`). **`Teacher` model has two distinct subject fields**: `subject: String?` (free-text specialty, e.g. "Mathematics") AND `subjects: Subject[]` (relation to the curriculum `Subject` model) — they are not the same thing. `Attendance` has `@@unique([studentId, date])` — enforces 1 record per student per day. `Timetable.teacherId` is **non-nullable** (required at creation); `Subject.teacherId` is nullable (optional). `AcademicYear` has `@@unique([tenantId, name])`; `Subject` has `@@unique([tenantId, academicYearId, classId, code])`.

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

- Check `req.tenantId` at the top of every handler; return `400` if missing (exceptions: `roleController.assignRole` and `roleController.getPermissions` do not check tenantId — permissions are global)
- Parse and validate the request with an inline Zod schema; return `400` on validation failure
- Delegate to a `*Service` class instantiated with the shared `prisma` client at module level
- HTTP status conventions: `201` for create, `204` for delete, `200` + JSON for reads/updates
- Service instantiated at module level: `const service = new FooService(prisma)`

### Controller Method Coverage

| Controller | Methods |
|---|---|
| `roleController` | `createRole`, `getRoles`, `getRole`, `updateRole`, `deleteRole`, `getPermissions`, `assignRole` |
| `academicYearController` | `create` (schema: `name`, `startDate`/`endDate` string→Date, `isCurrent?`), `list`, `getCurrent`, `update` (all fields partial), `delete` |
| `termController` | `create` (schema: `name`, `academicYearId` UUID, `startDate`/`endDate` string→Date, `isCurrent?`), `list` (filter: `?academicYearId`), `getCurrent`, `update` (omits `academicYearId` — immutable; rest partial), `delete` |
| `subjectController` | `create` (schema: `name`, `code?`, `description?`, `classId` UUID **required**, `teacherId` UUID optional, `academicYearId` UUID **required**), `list` (filters: `?classId&academicYearId&teacherId`), `getById`, `update` (omits `classId`/`academicYearId`, all partial), `delete`, `assignTeacher` (body: `{ teacherId: uuid }`) |
| `timetableController` | `create` (schema: `academicYearId`, `subjectId`, `classId`, `teacherId` UUIDs; `dayOfWeek` 0–6; `startTime`/`endTime` HH:MM regex; `room?`), `listByClass` (`GET /timetable/class/:classId?academicYearId=`), `listByTeacher` (`GET /timetable/teacher/:teacherId?academicYearId=`), `update` (omits `academicYearId`, `subjectId`, `classId`, `teacherId` — all immutable; remaining fields partial), `delete` |
| `attendanceController` | `markAttendance` (schema: `studentId` uuid, `date` string→Date, `status` enum, `remarks?`), `bulkMarkAttendance` (array of same), `getAttendance` (filters: `studentId?`, `classId?`, `date?`, `startDate?`, `endDate?`), `getAttendanceStats` (params: `studentId`; query: `startDate`, `endDate`), `getClassAttendanceReport` (params: `classId`; query: `date`) |
| `gradebookController` | `createAssignment` (schema: `academicYearId`, `termId`, `subjectId` UUIDs, `title`, `description?`, `maxScore` positive, `weight?` positive, `dueDate?` string→Date), `listAssignments` (filters: `subjectId`, `termId`), `recordGrade` (schema: `studentId`, `subjectId` UUIDs, `assignmentId?` UUID, `score` min 0, `maxScore` positive, `remarks?`, `gradedBy?`), `bulkRecordGrades`, `getStudentGrades`, `calculateSubjectAverage`, `getStudentReportCard`, `createExamination` (schema: `academicYearId`, `termId`, `subjectId` UUIDs, `name`, `examDate` string→Date, `duration?` positive, `maxScore` positive, `passingScore?` positive, `room?`), `recordExamResult` (schema: `examinationId`, `studentId` UUIDs, `score` min 0, `grade?` string, `remarks?`), `getExamResults` |

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

- POST `/auth/login`: rate-limited via `authLimiter`, validates with `loginSchema`, uses `withTenant` for DB scoping, bcrypt password compare
  - JWT payload: `{ userId, tenantId, roleId, role }` where `role` = `normalizeRoleName(user.role?.name)` = `roleName.toUpperCase() ?? 'STUDENT'` (string, expires 7d)
  - Response: `{ token, user: { id, email, roleId, role, tenantId, tenantSubdomain } }` where `role` is the **full Role object** `{ id, name, description? }` (not the normalized string)
- POST `/auth/register`: rate-limited via `authLimiter`, validates with `registerSchema`, creates user + fetches tenant in the same `withTenant` transaction; sends welcome email via `NotificationService.sendEmail` fire-and-forget (`.catch` logged, never throws); response: `{ id, email, roleId }` (201)

### Standalone Permission Check

- `hasPermission(userId, resource, action)` in `src/utils/permissions.ts` - queries Prisma directly without going through `RoleService`; use when middleware context is unavailable
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: environment -->
## Environment Variables

Validated at startup by Zod schema in `src/server.ts`; process exits on failure. DB connectivity is checked post-startup via `SELECT 1` but failure only logs — does not exit.

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
- `src/config/index.ts` - typed `config` object wrapping all env vars into structured groups: `database`, `upstash`, `brevo`, `jwt`, `storage`, `payments`; available as an alternative to reading `process.env` directly; `config.brevo.fromName` defaults to `'School SaaS'`
- `prisma/seed.ts` - idempotent demo seed (`npm run seed`); creates subdomain `greenwood` (Greenwood Academy) with: 6 system roles (Admin/Principal/Teacher/Staff/Parent/Student, all `isSystem: true`); admin user `admin@greenwood.edu` / `Admin@1234` (Grace Adeyemi) and teacher user `teacher@greenwood.edu` / `Teacher@1234` (Samuel Okafor); academic year `2025/2026` with 3 terms; 4 classes (Primary 1, Primary 3, JSS 1, SS 1); 3 teachers; 8 students with enrollments; 13 subjects; 5 timetable slots for JSS 1; attendance records; 1 assignment + grades; 1 fee + payment; 4 events; skips any domain that already exists
<!-- END AUTO-MANAGED -->
