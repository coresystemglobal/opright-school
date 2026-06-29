# Getting Started with SchoolOS

Welcome to **SchoolOS** — the all-in-one platform for running your school online: academics, attendance, grades, e‑learning, and online fee collection.

These **onboarding guides** are friendly, step-by-step "getting started" journeys. They walk you through what to do, in what order, and why. They are *not* API references — when you want exact endpoints, request bodies, and curl examples, follow the cross-links to the matching guide in [`../how-it-works/`](../how-it-works/).

---

## Who are you?

Pick the guide that matches your role:

| You are a… | Start here | What you'll do |
|---|---|---|
| **School Administrator** (owner / IT lead) | [SCHOOL_ADMINISTRATOR.md](./SCHOOL_ADMINISTRATOR.md) | Create the school, set up academics, configure online fee collection, invite everyone |
| **Teacher** | [TEACHER.md](./TEACHER.md) | Run your classes — attendance, grades, assignments, e‑learning, events |
| **Parent / Guardian** | [PARENT.md](./PARENT.md) | Track your children, **pay school fees online**, get notifications |
| **Student** | [STUDENT.md](./STUDENT.md) | Log in with your student code, learn online, check your own progress |

> **Principal** and **Staff** roles use the platform too. Principals oversee academics and discipline (read‑heavy); Staff handle library, transport, hostel, inventory, and health. For those roles, see [`../how-it-works/PRINCIPAL.md`](../how-it-works/PRINCIPAL.md) and [`../how-it-works/STAFF.md`](../how-it-works/STAFF.md).

---

## The big picture: how a school comes online

Onboarding flows in one direction. Each step unlocks the next.

```
   1. SCHOOL CREATED
      Admin signs up at schoolos.ng → school (tenant) provisioned
      → subdomain like greenwood.schoolos.ng
                 │
                 ▼
   2. ADMIN SETS UP THE FOUNDATION
      ├── Academics:  academic year → terms → classes → subjects → timetables
      └── Money:      payment account (bank verified via Paystack) →
                      fee templates → generate assignments to students
                 │
                 ▼
   3. PEOPLE INVITED
      ├── Teachers & Staff  (email + password)
      ├── Parents           (created by admin, linked to children)
      └── Students          (get a student CODE, e.g. GWD250042)
                 │
                 ▼
   4. EVERYONE USES IT DAILY
      Teachers take attendance & grade · Parents pay fees & watch progress ·
      Students learn online · Admin monitors overdue fees & notifications
```

The key idea: **the admin builds the rails first** (academics + payments), then the rest of the school rides on them.

---

## A note on fees (new!)

SchoolOS now collects **school fees online**. In short:

- The admin links the school's **bank account** (verified through Paystack) so money lands in the school's account automatically.
- Admins create **fee templates** (tuition, transport, exam, etc.) and push them to students in bulk.
- **Parents pay** by bank transfer to a virtual account, can pay in **installments**, and can **opt in** to optional fees.
- Mandatory fees left unpaid past their due date trigger **service access restrictions** (no hostel, meals, transport, library borrowing, or course enrollment) until they're settled.

Each guide covers the part of this that's relevant to you.

---

## Where to go next

- New school? → [School Administrator guide](./SCHOOL_ADMINISTRATOR.md)
- Joining an existing school? → pick your role above.
- Need exact API details? → [`../how-it-works/`](../how-it-works/README.md)
