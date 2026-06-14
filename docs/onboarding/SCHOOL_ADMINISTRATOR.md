# Onboarding: School Administrator

Welcome — you're the person who brings your whole school onto **SchoolOS**. This guide is your end‑to‑end journey: from creating the school, to setting up academics, to switching on **online fee collection**, to inviting everyone in.

> Looking for exact endpoints and request bodies? This guide cross‑links to [`../how-it-works/ADMIN.md`](../how-it-works/ADMIN.md) throughout.

---

## What you'll need before you start

- [ ] Your **school's official details** (name, type, approximate student count)
- [ ] A working **email** for your admin account
- [ ] Your school's **bank details** — bank and account number — for online fee collection (you can add these later, but you can't collect fees without them)
- [ ] A list of your **classes, subjects, and teachers** (a spreadsheet is fine)
- [ ] About **30–45 minutes** for first setup

---

## The journey at a glance

```
(a) Create & claim school   →   (b) Configure academics
        │                              │
        ▼                              ▼
(c) Set up payment account  →   (d) Create fee templates & assign
        │                              │
        ▼                              ▼
(e) Invite teachers, staff, parents, students
        │
        ▼
(f) Run daily operations & monitor
```

---

## (a) Create and claim your school

### Step 1 — Sign your school up

A brand‑new school is created from the public sign‑up flow — no login required. You provide your school name, a short **school code** (e.g. `greenwood`), and your admin name, email, and password.

> API detail: `POST /onboarding/school`. See [ADMIN.md → School Onboarding](../how-it-works/ADMIN.md#1-school-onboarding).

This provisions your isolated **school workspace** and gives you:

- Your own **subdomain** — e.g. `greenwood.schoolos.ng`
- The six standard **roles** (Admin, Principal, Teacher, Staff, Parent, Student)
- Your **admin login**

The **school code** matters more than it looks: it becomes the prefix of every student code (e.g. `GWD250042`). Choose something short and memorable.

### Step 2 — First login

Go to your subdomain and log in with the email + password you just set.

```
POST /auth/login   (on greenwood.schoolos.ng)
{ "email": "admin@greenwood.edu", "password": "••••••••" }
```

You're now the **ADMIN** with full access to every module.

---

## (b) Configure your academics

Set these up **in order** — each one depends on the one above it.

### Step 3 — Academic year

Create the current school year (e.g. `2025/2026`) and mark it **current**. Only one year is current at a time; setting a new one retires the old one automatically.

### Step 4 — Terms

Add the terms/semesters inside that year (First, Second, Third…), each with start/end dates. Mark the active one **current**.

### Step 5 — Classes

Create your classes (e.g. *JSS 1A*, *Primary 3*). You can assign a **homeroom teacher** to each (you may need to create teachers first — see step 9 — then come back).

### Step 6 — Subjects

Add subjects per class for the academic year (e.g. *Mathematics — MTH101* in *JSS 1A*). Optionally assign a teacher to each subject.

### Step 7 — Timetables

Build the weekly schedule: each entry ties a subject + class + teacher to a day and time slot. SchoolOS **detects conflicts** and blocks double‑booking a class, teacher, or room.

> All of (b) maps to [ADMIN.md → Academic Structure Setup](../how-it-works/ADMIN.md#3-academic-structure-setup).

**Checkpoint — academics ready:**
- [ ] Current academic year created
- [ ] Terms added and current term set
- [ ] Classes created (homeroom teachers optional)
- [ ] Subjects created per class
- [ ] Timetables built with no conflicts

---

## (c) Set up your payment account (online fee collection)

This is what lets parents pay you online and have the money land **in your school's bank account**.

### Step 8 — Link and verify your bank account

1. Provide your school's **bank code** and **account number**.
2. SchoolOS verifies them through **Paystack** (it confirms the account name matches).
3. A Paystack **sub‑account** is created for your school, so when a parent pays, funds are **remitted to your school automatically**.
4. SchoolOS retains a small, configurable **commission percentage** on collected fees (your platform agreement defines the rate).

> API detail: admin endpoints live under `/fees/*`. See the fees how‑it‑works reference for exact payloads.

### The bank‑change security model — read this

Changing the school's bank account is **not self‑service**. This protects you from fraud (no single admin can quietly redirect school money).

```
Admin submits bank-change request
        │
        ▼
Platform MASTER super-admin reviews & approves   (endpoints under /platform/*)
        │
        ▼
ALL admins are alerted that the account changed
```

So: your first bank setup goes live after verification, but any **later change** waits for platform approval, and every admin gets notified. Keep your bank details accurate the first time to avoid delays.

**Checkpoint — payments ready:**
- [ ] Bank account linked and Paystack‑verified
- [ ] Sub‑account active (funds route to the school)
- [ ] Commission rate understood
- [ ] You know that bank changes require MASTER approval

---

## (d) Create fee templates and generate assignments

With money plumbing in place, define **what** students owe.

### Step 9 — Create fee templates

A **fee template** is a reusable definition of a charge. For each one you set:

| Setting | Options / meaning |
|---|---|
| **Category** | `TUITION`, `TRANSPORT`, `EXAM`, `LIBRARY`, `SPORTS`, `HOSTEL`, `MEAL`, `OTHER` |
| **Amount** | How much is owed |
| **Due date** | When payment is expected |
| **Grace period** | Days after the due date before it counts as overdue |
| **Installments** | Optionally allow paying in parts |
| **Mandatory vs opt‑in** | Required for everyone, or something parents choose (e.g. transport) |
| **Target audience** | `ALL`, `CLASS`, `TERM`, `ACADEMIC_YEAR`, or `OPT_IN` |

> Tip: make tuition **mandatory** and things like transport or meals **opt‑in** so parents only pay for what they use.

### Step 10 — Generate assignments

A template by itself charges no one. **Generating assignments** pushes the fee to the targeted students in **bulk** — e.g. apply the *First Term Tuition* template to every student in *JSS 1A*. Each targeted student then owes that fee, and their parents can see and pay it.

**Checkpoint — fees live:**
- [ ] Templates created for each charge type
- [ ] Mandatory vs opt‑in decided per template
- [ ] Assignments generated to the right students
- [ ] Spot‑checked a student to confirm the fee appears

---

## (e) Invite and create users

Now bring people in. Different roles arrive different ways.

### Step 11 — Teachers and staff

Create accounts with an **email + password** and the right role (TEACHER, STAFF, PRINCIPAL). They log in at your subdomain via `POST /auth/login`. Point new teachers to the [Teacher onboarding guide](./TEACHER.md).

### Step 12 — Parents

You create parent accounts and **link them to their children** at creation time (by passing the children's student IDs). A parent can be linked to multiple students. Share the [Parent onboarding guide](./PARENT.md) so they know how to pay fees.

> API detail: `POST /parents`. See [ADMIN.md → Create Parent Accounts](../how-it-works/ADMIN.md#2-user--role-management).

### Step 13 — Students and how student codes work

Students are created either directly (`POST /students`) or by **admitting a candidate** from the admissions pipeline. Either way, SchoolOS generates a unique **student code** from your school code + year + sequence:

```
GWD 25 0042
└┬┘ └┬┘ └─┬─┘
 │   │    └ sequence number
 │   └ year
 └ your school code
```

Students **don't use email** — they log in with this code at `POST /auth/student-login` (the platform figures out the school from the code prefix, so they don't even need to type the subdomain). Hand each student their code and initial password. Point them to the [Student onboarding guide](./STUDENT.md).

**Checkpoint — people in:**
- [ ] Teachers/staff created with correct roles
- [ ] Parents created and linked to children
- [ ] Students created/admitted and codes distributed

---

## (f) Ongoing operations — what to run and monitor

You're live. Here's the steady‑state job.

### Daily
- Review **attendance** reports for the day.
- Scan **notifications** (new payments, disciplinary records, health incidents).
- Approve **candidate admissions** as applications come in.

### Around due dates — watch fees and service denial
A **nightly job** sweeps fees automatically:

1. Mandatory fees past their due date (plus grace period) are marked **OVERDUE**.
2. Students with overdue mandatory fees have **service access revoked** — they're blocked from:
   - hostel assignment
   - meal plans
   - transport assignment
   - library borrowing
   - course enrollment
3. Affected **parents and students are notified** automatically.
4. Access is **restored once the fee is paid**.

As admin, keep an eye on the **overdue list** so you can follow up with families before access is cut — and so you understand why a student suddenly "can't borrow a book."

### Each term / each year
- Generate **report cards** at term end.
- Roll over to a **new academic year and terms**, then rebuild classes/subjects/timetables and re‑run fee assignments.

> Other modules you own as admin (library, transport, inventory, events, health, hostel, sports, disciplinary, e‑learning) are listed in [ADMIN.md → All Module Access](../how-it-works/ADMIN.md#8-all-module-access).

---

## Your first day — checklist

- [ ] Create the school and log in
- [ ] Create the current academic year and term
- [ ] Create your classes
- [ ] Add a few teachers so you can assign homeroom/subjects
- [ ] Link and verify the school **bank account** (start the Paystack verification)
- [ ] Create your first **tuition** fee template

## Your first week — checklist

- [ ] Finish all subjects and timetables (conflict‑free)
- [ ] Confirm the payment sub‑account is active
- [ ] Create all fee templates (mandatory + opt‑in) and **generate assignments**
- [ ] Create/admit all students; distribute **student codes**
- [ ] Create all parent accounts and link children
- [ ] Send teachers, parents, and students their onboarding guide links
- [ ] Verify one full path end‑to‑end: a parent can see a child's fee and pay it

---

## Where to go deeper

- Exact endpoints & payloads → [`../how-it-works/ADMIN.md`](../how-it-works/ADMIN.md)
- What teachers, parents, and students experience → their guides in this folder
- Platform/architecture reference → `../../CLAUDE.md`
