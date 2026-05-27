# smp-server

Multi-tenant SaaS school management platform backend (Express + TypeScript + Prisma + PostgreSQL).

<!-- AUTO-MANAGED: build-commands -->
## Build & Dev Commands

- `npm run dev` — start dev server with hot reload (`tsx watch src/server.ts`)
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — build + run production server
- `npm test` / `npm run test:watch` — Jest test suite (`ts-jest` preset, roots: `src/` + `tests/`, uses `tsconfig.jest.json`)
- `npm run db:generate` — regenerate Prisma client
- `npm run db:push` — push schema to DB
- `npm run db:migrate` — run Prisma migrations
- `npm run db:setup` — `db:push` + `db:generate`
- `npm run seed` — run idempotent demo seed (`prisma/seed.ts`)
- `npm run seed:tier1` — run tier-1 seed (`src/utils/seedTier1.ts`)
- `npm run docs:generate` — generate API docs (`scripts/generate-api-docs.ts`)
- `npm run test:e2e` — run Cypress end-to-end tests
- Load test scripts: `npm run load:basic`, `load:stress`, `load:spike`, `k6:load`, `k6:stress`, `k6:spike`
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: architecture -->
## Architecture

- `src/middleware/` - Express middleware (auth, authorization, tenant, validation, error handling)
- `src/utils/` - Shared utilities (permissions, tenant scoping, encryption, storage, schemas)
- `src/modules/<domain>/` - Module-based structure; each domain has `controller.ts`, `service.ts`, `routes.ts` (e.g. `src/modules/academicYears/`, `src/modules/attendance/`, `src/modules/gradebook/`, …)
- `src/prisma/` - Prisma client instance
- `src/workers/` - Background workers

Note: the flat `src/controllers/` layout no longer exists. Domain services have been moved into `src/modules/<domain>/service.ts`; only cross-cutting services remain in `src/services/` (`notificationService.ts`, `studentIdService.ts`, `tenantService.ts`).

### Prisma Schema Domains

All models carry `tenantId: String @db.Uuid` with cascade delete and `@index([tenantId])`. Note: `User.id` is plain `String` (not `@db.Uuid`); `User.tenantId` IS `@db.Uuid`. Exception: `Permission` has no `tenantId` — it is global (not tenant-scoped). `Role` has an `isSystem Boolean @default(false)` field. `Tenant` has `subdomain: String?`, `domain: String?`, and `schoolCode: String?` (each `@@unique`). `User.email` is **nullable** (`String? @unique`) — students log in with `studentCode` instead; `User.studentCode: String?` (e.g. `"GWD250042"`) has `@index([studentCode])`. `Student` has `studentCode: String?` (`@@unique([tenantId, studentCode])`), `userId: String? @unique` (FK to User login account), and `guardian: Json?` (legacy field, kept for migration compatibility). **`Teacher` model has two distinct subject fields**: `subject: String?` (free-text specialty, e.g. "Mathematics") AND `subjects: Subject[]` (relation to the curriculum `Subject` model) — they are not the same thing. `Attendance` has `@@unique([studentId, date])` — enforces 1 record per student per day. `Timetable.teacherId` is **non-nullable** (required at creation); `Subject.teacherId` is nullable (optional). `AcademicYear` has `@@unique([tenantId, name])`; `Subject` has `@@unique([tenantId, academicYearId, classId, code])`. `Parent` model: `userId String @unique` (FK to User), `students StudentParent[]`; `StudentParent` join table uses composite `@@id([studentId, parentId])`. `Candidate` model: `candidateCode String`, `status CandidateStatus (PENDING|ADMITTED|REJECTED)`, `admittedAt DateTime?`, `studentId?` (set when admitted); `@@unique([tenantId, candidateCode])`. `IdSequence` model: `type IdSequenceType (STUDENT|CANDIDATE)`, `year Int`, `lastSeq Int @default(0)`; `@@unique([tenantId, type, year])`.

| Domain | Models |
|--------|--------|
| Tenancy & Auth | `Tenant`, `User`, `Role`, `Permission`, `RolePermission` |
| Identity Sequences | `IdSequence` |
| People | `Student`, `Teacher`, `Parent`, `StudentParent` |
| Admissions | `Candidate` |
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
| `studentController` | `list` (query params: `classId?` filters via Enrollment join — `where.enrollments = { some: { classId } }`; `limit?` int mapped to Prisma `take`; delegates to `StudentService.list(tenantId, { classId?, limit? })`; when `classId` provided: includes `enrollments` relation + bypasses cache — no per-classId cache key), `create` (schema: `firstName`, `lastName`, `dob?` date, `guardian?` object; auto-creates linked `User` account in transaction: generates `studentCode` via `StudentIdService.generateStudentId()` using tenant's `schoolCode`, sets both `Student.studentCode` and `Student.studentId` to the generated code, sets `Student.userId`; default password = `DDMMYYYY` from dob if provided, else `"change123"`; assigns Student role), `getById`, `update` (all fields partial), `delete`, `bulkCreate` (CSV), `exportCsv` |
| `roleController` | `createRole`, `getRoles`, `getRole`, `updateRole`, `deleteRole`, `getPermissions`, `assignRole` |
| `academicYearController` | `create` (schema: `name`, `startDate`/`endDate` string→Date, `isCurrent?`), `list`, `getCurrent`, `update` (all fields partial), `delete` |
| `termController` | `create` (schema: `name`, `academicYearId` UUID, `startDate`/`endDate` string→Date, `isCurrent?`), `list` (filter: `?academicYearId`), `getCurrent`, `update` (omits `academicYearId` — immutable; rest partial), `delete` |
| `subjectController` | `create` (schema: `name`, `code?`, `description?`, `classId` UUID **required**, `teacherId` UUID optional, `academicYearId` UUID **required**), `list` (filters: `?classId&academicYearId&teacherId`), `getById`, `update` (omits `classId`/`academicYearId`, all partial), `delete`, `assignTeacher` (body: `{ teacherId: uuid }`) |
| `timetableController` | `create` (schema: `academicYearId`, `subjectId`, `classId`, `teacherId` UUIDs; `dayOfWeek` 0–6; `startTime`/`endTime` HH:MM regex; `room?`), `listByClass` (`GET /timetable/class/:classId?academicYearId=`), `listByTeacher` (`GET /timetable/teacher/:teacherId?academicYearId=`), `update` (omits `academicYearId`, `subjectId`, `classId`, `teacherId` — all immutable; remaining fields partial), `delete` |
| `attendanceController` | `markAttendance` (schema: `studentId` uuid, `date` string→Date, `status` enum, `remarks?`), `bulkMarkAttendance` (array of same), `getAttendance` (filters: `studentId?`, `classId?`, `date?`, `startDate?`, `endDate?`), `getStudentAttendance` (params: `studentId`; returns all records for student, no date filter; used by legacy route `GET /attendance/student/:studentId`), `getAttendanceStats` (params: `studentId`; query: `startDate`, `endDate`), `getClassAttendanceReport` (params: `classId`; query: `date`) |
| `gradebookController` | `createAssignment` (schema: `academicYearId`, `termId`, `subjectId` UUIDs, `title`, `description?`, `maxScore` positive, `weight?` positive, `dueDate?` string→Date), `listAssignments` (filters: `subjectId`, `termId`), `recordGrade` (schema: `studentId`, `subjectId` UUIDs, `assignmentId?` UUID, `score` min 0, `maxScore` positive, `remarks?`, `gradedBy?` **string** — any string, not UUID), `bulkRecordGrades`, `getStudentGrades`, `calculateSubjectAverage`, `getStudentReportCard`, `createExamination` (schema: `academicYearId`, `termId`, `subjectId` UUIDs, `name`, `examDate` string→Date, `duration?` positive, `maxScore` positive, `passingScore?` positive, `room?`), `recordExamResult` (schema: `examinationId`, `studentId` UUIDs, `score` min 0, `grade?` string, `remarks?`), `getExamResults` |
| `parentController` | `getChildren` (uses `ParentService.getChildren` — queries `Parent` model first, falls back to legacy `guardian.email` JSON query), `getChildAttendance` (params: `studentId`; last 30 records desc), `getChildGrades` (includes subject + assignment), `getChildPayments` (includes fee), `getChildTimetable` (resolves class via Enrollment first), `createParent` (body: `parentSchema`; creates `User` + `Parent` record in transaction); **Fee endpoints via `ParentFeeService`**: `getFeeSummaries` (`GET /fees`), `getChildFeeDetails` (`GET /fees/:studentId`), `initiatePayment` (`POST /fees/pay`; body: `{ feeAssignmentId: uuid, amount: positive, payerEmail: email }`), `listOptInTemplates` (`GET /fees/:studentId/opt-in`), `optIn` (`POST /fees/:studentId/opt-in`) |
| `aiController` | `getStudentInsights` (params: `studentId` uuid; query: `refresh=true` bypasses cache; PARENT role receives response **without** `teacherRecommendations` field; returns 503 if `ANTHROPIC_API_KEY` missing; uses `AIInsightsService` with `buildInsightPrompt` from `src/modules/ai/prompts.ts`) |

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

### App Route Summary

Routes mounted in `src/app.ts` (no-auth routes before `tenantMiddleware`; auth routes after; `auditMiddleware` applied globally alongside `authMiddleware` for all authenticated routes):

| Route prefix | Auth | Role guard |
|---|---|---|
| `GET /health` | none | none |
| `GET /metrics` | none | none (Prometheus scrape — restrict at network/firewall level) |
| `/docs` | none | none |
| `/onboarding` | none | none |
| `/queue` | none | none (QStash webhook receiver — no `X-Tenant-ID` required) |
| `/payments/webhook` | none | none (Paystack webhook receiver — mounted before `tenantMiddleware` with `express.raw` body parser) |
| `POST /master/login` | none | none (platform-level MASTER auth — no tenant header required) |
| `/auth` | none | none |
| `/roles` | none | none |
| `/audit-logs` | `authMiddleware` | ADMIN |
| `/platform` | own `masterAuthMiddleware` | MASTER-only (no tenant required) |
| `/students` | `authMiddleware` | ADMIN, TEACHER |
| `/teachers` | `authMiddleware` | ADMIN |
| `/classes` | `authMiddleware` | ADMIN, TEACHER |
| `/attendance` | `authMiddleware` | ADMIN, TEACHER (legacy routes: `POST /` markAttendance, `GET /student/:studentId` getStudentAttendance) |
| `/notices` | `authMiddleware` | none extra |
| `/notifications` | `authMiddleware` | none extra |
| `/settings` | `authMiddleware` | none extra |
| `/payments` | `authMiddleware` | ADMIN |
| `/academic-years` | `authMiddleware` | none extra |
| `/terms` | `authMiddleware` | none extra |
| `/subjects` | `authMiddleware` | none extra |
| `/timetables` | `authMiddleware` | none extra |
| `/attendances` | `authMiddleware` | ADMIN, TEACHER |
| `/gradebook` | `authMiddleware` | none extra |
| `/library` | `authMiddleware` | ADMIN, TEACHER, STAFF |
| `/transport` | `authMiddleware` | ADMIN, STAFF |
| `/inventory` | `authMiddleware` | ADMIN, STAFF |
| `/events` | `authMiddleware` | ADMIN, TEACHER |
| `/disciplinary` | `authMiddleware` | ADMIN, PRINCIPAL, TEACHER |
| `/health` (domain) | `authMiddleware` | ADMIN, STAFF |
| `/hostel` | `authMiddleware` | ADMIN, STAFF |
| `/sports` | `authMiddleware` | ADMIN, TEACHER |
| `/upload` | `authMiddleware` | none extra |
| `/parent` | `authMiddleware` | PARENT (both `/parent` and `/parents` use the same `parentRoutes` handler) |
| `/parents` | `authMiddleware` | ADMIN |
| `/student/me` | `authMiddleware` | STUDENT |
| `/candidates` | `authMiddleware` | ADMIN |
| `/courses` | `authMiddleware` | ADMIN, TEACHER |
| `/elearning` | `authMiddleware` | none extra |
| `/billing` | `authMiddleware` | ADMIN |
| `/fees` | `authMiddleware` | ADMIN |
| `/api/admin/website/domain` | `authMiddleware` | ADMIN |
| `/ai` | `authMiddleware` | ADMIN, TEACHER, PARENT |

Note: server mounts timetable at `/timetables` (plural); client calls `/timetable` (singular) — this is an intentional naming split between server mount path and client API base. `/grades` route is not present in `app.ts` — gradebook is served under `/gradebook`. `domainRewriteMiddleware` runs before `tenantMiddleware`.

### Auth Routes

- POST `/auth/login`: rate-limited via `authLimiter`, validates with `loginSchema`, uses `withTenant` for DB scoping, bcrypt password compare
  - JWT payload: `{ userId, tenantId, roleId, role }` where `role` = `normalizeRoleName(user.role?.name)` = `roleName.toUpperCase() ?? 'STUDENT'` (string, expires 7d)
  - Response: `{ token, user: { id, email, firstName?, lastName?, roleId, role, tenantId, tenantSubdomain } }` where `role` is the **full Role object** `{ id, name, description? }` (not the normalized string)
- POST `/auth/register`: rate-limited via `authLimiter`, validates with `registerSchema`, creates user + fetches tenant in the same `withTenant` transaction; sends welcome email via `NotificationService.sendEmail` fire-and-forget (`.catch` logged, never throws); response: `{ id, email, roleId }` (201)
- POST `/auth/student-login`: rate-limited via `authLimiter`, validates with `studentLoginSchema`; no tenant header required — resolves tenant by extracting schoolCode prefix from `studentId` (e.g. `"GWD250042"` → `"GWD"`) via `StudentIdService.extractSchoolCode()`, then `prisma.tenant.findFirst` (case-insensitive match on `schoolCode`); finds `User` by `{ tenantId, studentCode: upperStudentId }`; bcrypt compare; JWT payload same as `/auth/login`; Response: `{ token, user: { id, studentCode, firstName?, lastName?, roleId, role, tenantId, tenantSubdomain? } }` — **`email` is omitted** (students may have null email)

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
- `PORT` (default: `3000`; local dev uses `3001`), `NODE_ENV` (`development`|`production`|`test`)
- `CORS_ORIGIN` — comma-separated allowed origins (permissive in development)
- `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`
- `S3_BUCKET`, `S3_ENDPOINT`, `S3_PUBLIC_ENDPOINT` (optional CDN/read URL; falls back to `S3_ENDPOINT` if omitted), `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION` (S3-compatible storage; dev uses Backblaze B2)
- `PAYSTACK_SECRET_KEY`
- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_CNAME_TARGET` — custom subdomain provisioning via Cloudflare DNS
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — web push notifications (generate with `npx web-push generate-vapid-keys`)
- `JITSI_APP_ID`, `JITSI_APP_SECRET`, `JITSI_BASE_URL` — live classes via Jitsi (primary, self-hosted)
- `HUNDREDMS_APP_ACCESS_KEY`, `HUNDREDMS_APP_SECRET` — 100ms live class fallback/scalable provider
- `ANTHROPIC_API_KEY` — Claude API key for AI student insights (`/ai` routes); service returns 503 if missing
- `MASTER_EMAIL`, `MASTER_PASSWORD` — used only for the `seed:master` script (platform-level seed)
- Observability (all optional, app runs without them): `SERVICE_NAME`, `SERVICE_VERSION` (shown in Grafana/traces); `LOG_LEVEL` (trace|debug|info|warn|error|fatal, default `info`); `LOKI_URL` (Loki push URL — omit to log to stdout only); `OTEL_EXPORTER_OTLP_ENDPOINT` (OpenTelemetry OTLP trace endpoint — omit to disable tracing); `SLOW_QUERY_THRESHOLD_MS` (Prisma slow query warning threshold, default `500`)
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: dependencies -->
## Key Dependencies

- `src/prisma/client.ts` - Shared Prisma client instance (injected into every service at module load)
- `src/utils/permissions.ts` - `RESOURCES`, `ACTIONS` constants + `hasPermission()` utility
- `src/modules/roles/service.ts` - `RoleService`: role CRUD, permission assignment, `checkPermission()`
- `src/modules/academicYears/service.ts` - `AcademicYearService`: create/list/getCurrent/update/delete academic years
- `src/modules/terms/service.ts` - `TermService`: term management scoped to an academic year
- `src/modules/subjects/service.ts` - `SubjectService`: subject CRUD + `assignTeacher()`
- `src/modules/timetables/service.ts` - `TimetableService`: timetable entries; query by class or teacher
- `src/modules/gradebook/service.ts` - `GradebookService`: assignments, grades (bulk), examinations, exam results, report cards
- `src/modules/attendance/service.ts` - `AttendanceService`: mark/bulk-mark attendance, stats, class reports; statuses: `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`
- `src/modules/parent/service.ts` - `ParentService`: `getChildren` (Parent model + legacy guardian.email fallback), `getChildAttendance/Grades/Payments/Timetable`, `createParent` (User + Parent transaction)
- `src/modules/fees/parentFeeService.ts` - `ParentFeeService`: parent-facing fee self-service — `getChildrenFeeSummaries`, `getChildFeeDetails`, `initiatePayment`, `listOptInTemplates`, `optIn`
- `src/modules/ai/service.ts` - `AIInsightsService`: `getStudentInsights(tenantId, studentId, { refresh? })` — fetches attendance + grade data, calls Claude API via `buildInsightPrompt`, caches result; returns `{ strengths, concerns, parentRecommendations, teacherRecommendations }`
- `src/config/index.ts` - typed `config` object wrapping all env vars into structured groups: `database`, `upstash`, `brevo`, `jwt`, `storage` (includes `publicEndpoint`), `payments`, `cloudflare` (`{ apiToken, zoneId, cnameTarget }`), `ai` (`{ anthropicApiKey }`); available as an alternative to reading `process.env` directly; `config.brevo.fromName` defaults to `'School SaaS'` in code; `.env.example` recommends `BREVO_FROM_NAME=SchoolOS`
- `prisma/seed.ts` - idempotent demo seed (`npm run seed`); creates subdomain `greenwood` (Greenwood Academy, `schoolCode: 'GWD'`) with `config.gradingSystem` bands (A=70–100, B=60–69, C=50–59, D=45–49, F=0–44); patches `schoolCode` on existing tenant if missing; 6 system roles (Admin/Principal/Teacher/Staff/Parent/Student, all `isSystem: true`); 4 demo users: admin `admin@greenwood.edu`/`Admin@1234` (Grace Adeyemi), teacher `teacher@greenwood.edu`/`Teacher@1234` (Samuel Okafor), parent `parent@greenwood.edu`/`Parent@1234` (Funke Obi — linked to student Emeka Obi via `guardian.email`), student `student@greenwood.edu`/`Student@1234` (Chisom Nkem); academic year `2025/2026` with 3 terms; 4 classes (Primary 1, Primary 3, JSS 1, SS 1); 3 teachers; 8 students with enrollments; 13 subjects; 5 timetable slots for JSS 1; attendance records; 1 assignment + grades; 1 fee + payment; 5 events; library (6 books), hostel (4 rooms + assignments), transport (2 buses + routes), inventory (6 assets), sports (4 activities), health (4 records), 3 courses, disciplinary (2 records); skips any domain that already exists. Role default permissions: Admin=all; Principal=read-only (students/teachers/classes/attendance/fees/payments/roles); Teacher=students+classes read + attendance CRUD; Staff=students/classes/fees/payments/attendance read; Parent+Student=none
- `src/utils/seedTier1.ts` - alternative tier-1 seed (`npm run seed:tier1`); separate from the demo seed
- `src/services/studentIdService.ts` - `StudentIdService.extractSchoolCode(studentId: string): string | null`: parses the school code prefix from a student ID (e.g. `"GWD250042"` → `"GWD"`); used by `/auth/student-login` to resolve tenant without a tenant header
<!-- END AUTO-MANAGED -->
