# How It Works — User Guides

Comprehensive guides for every user type in the School Management Platform.

| Guide | Role | Description |
|---|---|---|
| [Admin](./ADMIN.md) | `ADMIN` | Full system control — school setup, users, billing, academics, and all modules |
| [Principal](./PRINCIPAL.md) | `PRINCIPAL` | School oversight — staff management, disciplinary, and academic monitoring |
| [Teacher](./TEACHER.md) | `TEACHER` | Classroom operations — attendance, grading, e-learning, and student management |
| [Staff](./STAFF.md) | `STAFF` | Operational support — health records, hostel, transport, inventory, and library |
| [Parent](./PARENT.md) | `PARENT` | Parent portal — view children's attendance, grades, and payment history |
| [Student](./STUDENT.md) | `STUDENT` | Student portal — e-learning, quizzes, assignments, and course progress |

## System Overview

The platform is a multi-tenant SaaS where each school is an isolated tenant. Users authenticate via `POST /auth/login` (or `POST /auth/student-login` for students) and receive a JWT bearer token. All subsequent API calls require this token in the `Authorization: Bearer <token>` header.

Tenant resolution is host-based — each school uses a subdomain (e.g. `greenwood.schoolos.ng`) or a custom domain.

## Role Hierarchy

```
Admin ──────── Full access to every module
Principal ──── Read/write staff, read-only students, fees, attendance
Teacher ────── Classroom: students, attendance, grades, e-learning, events, sports
Staff ─────── Operations: health, hostel, transport, inventory, library
Parent ─────── Read-only: own children's data
Student ────── Self-service: e-learning, quizzes, assignments
```
