# EDUPLUS Application Features

This document summarizes the application features across backend capabilities and product/UI scope.

## Feature Status Legend
- `Implemented`: Available in current backend modules/routes.
- `Planned/UI Scope`: Included in product/design scope and prompt requirements.

## 1) Platform Foundation (`Implemented`)
- Multi-tenant architecture with tenant isolation.
- JWT-based authentication.
- Role-based access control (RBAC) with role and permission management.
- Request validation and consistent error handling.
- API rate limiting and security middleware.
- Monitoring/logging middleware.
- PostgreSQL-based data layer with indexed query patterns.
- Redis-backed caching support for frequently accessed data.

## 2) User Roles (`Implemented`)
- `ADMIN`
- `PRINCIPAL`
- `TEACHER`
- `STAFF`
- `PARENT`
- `STUDENT`

## 3) Core School Management Modules (`Implemented`)

### Authentication & Access
- Tenant-scoped login.
- User registration.
- Role CRUD and permission assignment.

### Student Management
- Student CRUD.
- Student enrollment into classes.
- Student profile data management.

### Teacher Management
- Teacher CRUD.
- Teacher profile management.

### Class Management
- Class CRUD.
- Student enrollment per class.

### Academic Calendar
- Academic year CRUD.
- Current academic year management.
- Term CRUD.
- Current term management.

### Subject & Timetable
- Subject CRUD.
- Assign teacher to subject.
- Timetable CRUD.
- Timetable lookup by class and by teacher.
- Conflict-aware scheduling support.

### Attendance
- Single attendance marking.
- Bulk attendance marking.
- Attendance query with filters.
- Student attendance statistics.
- Class attendance report.
- Attendance status types: present, absent, late, excused.

### Gradebook & Exams
- Assignment creation and listing.
- Grade recording (single and bulk).
- Student grade retrieval.
- Subject average calculations.
- Report card generation.
- Examination creation and exam result recording.

### Payments & Fees
- Fee setup/creation.
- Payment recording.
- Student payment history retrieval.

### Notices
- Create and list notices/announcements.

## 4) Parent Portal (`Implemented`)
- List children linked to parent.
- View child attendance.
- View child grades.
- View child payments.

## 5) E-Learning / LMS (`Implemented`)

### Course Management
- Create, list, update, delete courses.
- Course details with structured modules/lessons.
- Student enrollment.
- Lesson progress tracking.

### Assessments
- Quiz creation and listing.
- Quiz submission and attempt history.
- Auto-grading support for objective items.

### Assignments
- Assignment submission with files/content.
- Submission listing.
- Grading with feedback.

### Live Classes
- Schedule live classes.
- List and update classes.
- Attendance capture for live sessions.
- Attendance retrieval for sessions.

### Discussions
- Course discussion thread creation.
- List discussions per course.
- Replies on discussion threads.
- Pin/unpin moderation.

### Certificates
- Certificate generation on completion criteria.
- Student certificate retrieval.
- Certificate verification by certificate number.

## 6) Extended Operations (Tier 2+) (`Implemented`)

### Library Management
- Book catalog CRUD-style flows.
- Borrow/return workflow.
- Transaction history.
- Library statistics and fine support.

### Transport Management
- Bus management.
- Route management with stops.
- Student-to-route assignment.
- Assignment retrieval.

### Inventory Management
- Asset management.
- Inventory transactions: purchase, allocation, maintenance, disposal.
- Transaction audit trail.

### Event Management
- Event creation and listing.
- Upcoming events.
- Participant management per event.

### Disciplinary Management
- Disciplinary record creation and updates.
- Record listing and statistics.
- Severity/status tracking.

### Health Records
- Student health record management.
- Medical incident logging.
- Vaccination tracking.
- Sensitive data encryption (AES-256-GCM).

### Hostel Management
- Room creation and listing.
- Room assignment management.
- Meal plan support.
- Visitor check-in and checkout logs.

### Sports Management
- Sports activity management.
- Student enrollment into activities.
- Competition creation and listing.

## 7) File & Storage Features (`Implemented`)
- Authenticated file upload.
- Signed URL generation for secure file access.
- File delete endpoint.

## 8) Reporting & Analytics (`Implemented`)
- Attendance statistics (student and class).
- Grade averages and term report cards.
- Library usage statistics.
- Disciplinary statistics.
- Upcoming event views.

## 9) Security & Reliability (`Implemented`)
- Auth middleware protection across modules.
- Role guards on sensitive routes.
- Tenant scoping for data access.
- Validation and throttling on write-heavy/auth endpoints.
- Error handling middleware for consistent API responses.

## 10) Product/UI Scope (`Planned/UI Scope`)
- High-fidelity role-based dashboards (Admin/Teacher/Parent/Student).
- Advanced frontend workflows for all modules above.
- Responsive design for desktop, tablet, and mobile.
- Rich data tables (search/filter/sort/pagination/export).
- Full empty/loading/error/success state coverage.
- Accessibility-first UI (WCAG 2.1 AA).
- Additional auth UX flows such as forgot/reset password.

