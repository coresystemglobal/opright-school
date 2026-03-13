# Screen-by-Screen High-Fidelity Design Prompt

Use this as a master prompt in ChatGPT, Claude, Gemini, Midjourney-style UI generators, or any design assistant that can output detailed UX/UI specifications.

## How to Use

1. Copy everything in the **Master Prompt** section.
2. Replace all placeholder values in `[brackets]`.
3. Paste into your design AI tool.
4. If output is too long, ask it to continue from the last screen ID.

## Master Prompt

```text
You are a principal product designer and design systems architect.

Your job is to produce complete, screen-by-screen, high-fidelity product design specifications for a multi-tenant School Management SaaS called EDUPLUS.

Do not return generic suggestions. Return production-grade design direction with concrete screen details, component decisions, interactions, and edge states.

## 1) Product Context

Build a modern, web-first responsive app (desktop + tablet + mobile) for these roles:
- ADMIN
- PRINCIPAL
- TEACHER
- STAFF
- PARENT
- STUDENT

Core modules:
- Authentication
- Role-based dashboards
- Students
- Teachers
- Classes
- Attendance
- Grades/Gradebook
- Payments/Fees
- Academic Years/Terms
- Subjects/Timetable
- Library
- Transport
- Inventory
- Events
- Disciplinary
- Health Records
- Hostel
- Sports
- E-learning (courses, lessons, quizzes, assignments, live classes, discussions, certificates)
- Parent portal
- Settings

## 2) Design Direction

Create a premium, confident, contemporary UI with strong visual hierarchy.

Brand inputs:
- Brand personality: [e.g. trustworthy, energetic, academic, tech-forward]
- Primary color: [HEX]
- Accent color: [HEX]
- Neutral palette preference: [warm/cool]
- Typography pair: [Heading Font] + [Body Font]
- Visual style: [clean editorial / soft glass / modern enterprise / etc.]

Output a full design system proposal:
- Color tokens (primary, secondary, semantic, surfaces, borders, chart palette)
- Typography scale (H1-H6, body, label, caption)
- Spacing scale (4/8-based), radius, shadows
- Icon style guidance
- Grid and layout rules by breakpoint
- Motion rules (duration/easing for page transition, modal, hover, feedback)

## 3) Mandatory Screen Inventory

Create a screen map with IDs using this format: `MODULE-XX`.
Example: `AUTH-01 Login`, `STD-04 Student Detail`.

You must include at minimum the following screens:

Authentication:
- Login
- Register
- Forgot password
- Reset password
- Session expired / unauthorized

Global shell:
- App shell desktop
- App shell tablet
- App shell mobile
- Notification center
- Global search results

Role dashboards:
- Admin dashboard
- Teacher dashboard
- Parent dashboard
- Student dashboard

Students:
- Student list
- Add student
- Edit student
- Student detail overview
- Student attendance tab
- Student grades tab
- Student payments tab
- Bulk import students

Teachers:
- Teacher list
- Add/Edit teacher
- Teacher profile
- Teacher schedule

Classes:
- Class list
- Class detail
- Create/Edit class
- Assign homeroom teacher
- Class timetable

Attendance:
- Daily attendance grid
- Bulk attendance
- Attendance calendar
- Attendance analytics/report

Grades:
- Gradebook list
- Grade entry form
- Report card preview
- Grade analytics

Payments:
- Fee structure list
- Record payment
- Payment history
- Outstanding fees report
- Receipt view

Academic:
- Academic years
- Terms
- Subjects
- Timetable builder
- Timetable conflict modal

Library:
- Book catalog
- Book detail
- Borrow/return flow
- Library transactions

Transport:
- Bus list
- Route list/map view
- Assign student to route

Inventory:
- Asset list
- Asset detail
- Inventory transaction form

Events:
- Event calendar
- Event list
- Event detail
- Create/Edit event

Disciplinary:
- Case list
- Case detail
- Create/Edit case

Health:
- Health records list
- Student medical profile
- Incident form
- Vaccination record

Hostel:
- Room list
- Room occupancy detail
- Assign bed
- Visitor logs

Sports:
- Activities list
- Competition detail
- Enrollment management

E-learning:
- Course catalog
- Course detail
- Enrolled courses
- Course player (video/text/pdf)
- Lesson resources panel
- Quiz taking
- Quiz result
- Assignment list
- Assignment submission
- Submission feedback
- Live classes list
- Live class detail/join
- Discussion threads
- Discussion detail with replies
- Certificates list
- Certificate detail/download/share

Parent portal:
- Children selector/home
- Child attendance view
- Child grades view
- Child payments view
- Notices/announcements

Settings:
- Profile settings
- Password/security
- Notification preferences
- Tenant settings (admin)
- Role/permission management

System states:
- 404
- Empty state template
- Error state template
- Success confirmation template

## 4) For Every Screen, Provide This Exact Structure

For each screen ID, output:

1. Purpose
2. Primary users/roles
3. Layout blueprint
4. Components used
5. Content hierarchy
6. Key interactions
7. Validation rules
8. States
9. Accessibility requirements
10. Responsive behavior (desktop/tablet/mobile)
11. Motion/animation notes
12. API data dependencies
13. Acceptance criteria

State coverage per screen must include:
- Default
- Loading (skeleton/progress)
- Empty
- Error
- Success
- Permission restricted (if applicable)

## 5) Data-Dense UI Standards

For all list/table pages, include:
- Sticky headers
- Sort/filter/search behavior
- Bulk select actions
- Pagination or infinite scroll decision with rationale
- Column-level responsiveness rules
- CSV/PDF export placement

For all form pages, include:
- Required vs optional fields
- Inline validation and submit validation
- Error messages with exact microcopy
- Unsaved changes warning
- Post-submit confirmation pattern

## 6) E-Learning Deep Detail Requirements

Be explicit for:
- Course authoring flow (create course, module, lesson)
- Lesson type variants (video, text, PDF, quiz, assignment)
- Quiz timer, autosave, submit guardrails
- Assignment upload states and late submission handling
- Live class states (scheduled/live/completed/cancelled)
- Discussion moderation (pin/resolve/report)
- Certificate generation and verification UX

## 7) Output Format Rules

Return output in this order:

A. Executive design direction (short)
B. Design system tokens table
C. Information architecture / sitemap
D. User journeys by role
E. Full screen inventory table (ID, name, role, priority)
F. Detailed screen-by-screen specs (all screens)
G. Cross-screen interaction patterns
H. Accessibility checklist (WCAG 2.1 AA)
I. Developer handoff notes
J. Open assumptions and decisions made

Use clear tables where helpful.
Use concrete labels and microcopy, not placeholders like "Lorem ipsum".
Do not skip screens.

## 8) Quality Bar

Design output should be implementation-ready for a frontend team using React + Tailwind + shadcn/ui.

Ensure:
- Consistent component usage
- Cohesive visual language
- Strong hierarchy and readability
- Practical spacing and alignment
- Touch-friendly controls on mobile
- Clear role-based visibility rules

If the response length limit is reached, continue in the next message starting from the next uncompleted screen ID.
```

## Optional Add-On Prompt (for visual exploration)

Use this after the master prompt if you want multiple visual directions before finalizing.

```text
Generate 3 distinct high-fidelity visual themes for the same product and screen architecture:
1) Modern Academic Enterprise
2) Youthful Digital Campus
3) Minimal Professional Admin

For each theme, provide:
- Color and typography system
- Dashboard hero style
- Card/table style
- Form style
- Navigation style
- Example treatment for: Login, Admin Dashboard, Student Detail, Course Player

Then recommend one theme with reasons tied to usability, accessibility, and implementation effort.
```

## Codia AI Design Prompt (Recommended)

Use this version when generating high-fidelity screens directly in Codia AI Design.

```text
You are a principal product designer creating implementation-ready, high-fidelity UI designs in Codia AI Design.

Goal:
Design a complete multi-tenant School Management SaaS with screen-by-screen coverage, consistent design system usage, and role-based UX for:
ADMIN, PRINCIPAL, TEACHER, STAFF, PARENT, STUDENT.

Project:
- Product name: [PRODUCT_NAME]
- Brand personality: [trustworthy / modern / academic / energetic]
- Primary color: [HEX]
- Accent color: [HEX]
- Neutral style: [warm or cool]
- Heading font: [FONT]
- Body font: [FONT]
- Visual style: [modern enterprise / editorial / clean minimal]

Design constraints:
- Web-first responsive UI: desktop (1440), tablet (1024), mobile (390)
- High-fidelity only (not wireframes)
- Use consistent component system across all screens
- Include complete states for each screen: default, loading, empty, error, success, restricted
- Focus on accessibility (WCAG 2.1 AA): contrast, focus states, labels, keyboard flow

System modules to cover:
- Auth, Dashboards, Students, Teachers, Classes, Attendance, Grades, Payments, Academic, Library, Transport, Inventory, Events, Disciplinary, Health, Hostel, Sports, E-learning, Parent Portal, Settings, System states

Output format (strict):
1) Design System
- Color tokens: primary/secondary/semantic/surfaces/border/chart
- Typography scale: H1-H6/body/label/caption
- Spacing/radius/shadow tokens
- Grid rules per breakpoint
- Motion rules (duration/easing)

2) Component Library
- Navigation, cards, forms, table, filters, tabs, modals, toasts, pagination, empty/error blocks
- For each component include: variants, sizes, states, usage rules

3) Screen Map
- Provide screen inventory with IDs in format MODULE-XX
- Include columns: ID | Screen Name | Primary Role | Priority | Device(s)

4) High-Fidelity Screen Specs
- Generate detailed specs for each screen with this structure:
  - Purpose
  - Users/Roles
  - Layout blueprint
  - Components used
  - Content hierarchy
  - Interaction details
  - Validation + microcopy
  - Screen states
  - Accessibility notes
  - Responsive behavior
  - Motion notes
  - API/data dependencies
  - Acceptance criteria

5) Cross-Screen Patterns
- Global navigation behavior
- Search/filter pattern
- Table interaction pattern
- Form submission and confirmation pattern
- Permission and role visibility pattern

6) Developer Handoff
- Token naming conventions
- Component naming conventions
- Suggested React + Tailwind + shadcn/ui mapping
- Risk notes and assumptions

Hard requirements:
- No placeholder lorem ipsum.
- Use realistic school-management microcopy.
- Ensure data-heavy screens are practical and readable.
- Keep visual hierarchy strong and spacing consistent.
- Do not skip any modules.

Screen coverage must include at least:
- Authentication: Login/Register/Forgot/Reset/Unauthorized
- Global: App shell desktop/tablet/mobile, notifications, global search
- Dashboards: Admin/Teacher/Parent/Student
- Students: list/create/edit/detail + attendance/grades/payments tabs + import
- Teachers: list/create-edit/profile/schedule
- Classes: list/detail/create-edit/assign teacher/timetable
- Attendance: daily grid/bulk/calendar/analytics
- Grades: gradebook/entry/report preview/analytics
- Payments: fee structure/record/history/outstanding/receipt
- Academic: years/terms/subjects/timetable builder/conflict modal
- Library: catalog/detail/borrow-return/transactions
- Transport: buses/routes(assignments)
- Inventory: assets/detail/transactions
- Events: calendar/list/detail/create-edit
- Disciplinary: list/detail/create-edit
- Health: records list/medical profile/incident/vaccination
- Hostel: rooms/occupancy/assign bed/visitor logs
- Sports: activities/competition/enrollment
- E-learning: catalog/detail/enrollments/player/resources/quiz/assignment/live class/discussions/certificates
- Parent portal: children overview + attendance/grades/payments/notices
- Settings: profile/security/notifications/tenant/roles-permissions
- System: 404/empty/error/success templates

If output is too long, split into batches and continue automatically in this order:
Batch 1: Auth + Global + Dashboards
Batch 2: Students + Teachers + Classes
Batch 3: Attendance + Grades + Payments + Academic
Batch 4: Library + Transport + Inventory + Events
Batch 5: Disciplinary + Health + Hostel + Sports
Batch 6: E-learning
Batch 7: Parent Portal + Settings + System States + Final QA pass

Start now with Batch 1 and include its mini screen inventory before detailed specs.
```

## Codia Continuation Prompt

Use this when Codia stops mid-output.

```text
Continue from the next uncompleted screen ID in the current batch.
Keep the same design tokens, component rules, and output format.
Do not repeat completed screens.
After finishing this batch, start the next batch automatically.
```
