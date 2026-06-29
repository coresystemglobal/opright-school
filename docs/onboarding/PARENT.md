# Onboarding: Parent

Welcome to **SchoolOS**! This is your parent portal — one place to follow each of your children's progress and to **pay school fees online**. This guide walks you through getting in and getting set up.

> Want exact endpoints and request bodies? Follow the cross-links to [`../how-it-works/PARENT.md`](../how-it-works/PARENT.md).

---

## What you'll need

- [ ] The **email** and **password** the school gave you
- [ ] Your school's **subdomain** (e.g. `greenwood.schoolos.ng`)
- [ ] A **phone** ready for your bank app (you'll pay fees by bank transfer)

> **You don't create your own account.** The school admin creates it for you and links it to your child or children. If you can't log in, contact the school office.

---

## Your first 10 minutes

### 1. Log in

Go to your school's subdomain and sign in with the email and password the school provided.

```
POST /auth/login   (on greenwood.schoolos.ng)
{ "email": "parent@greenwood.edu", "password": "••••••••" }
```

You're in as a **PARENT**.

### 2. See your children

Your account is already **linked to your children** by the school. Open your children list to confirm everyone is there — names, classes, and student codes.

- Your children: `GET /parent/children`

If a child is missing or someone else's child appears, tell the school admin — only they can fix the links.

---

## Following your child's progress

Everything in the parent portal is **read-only** for academics — you watch, you don't edit.

### 3. Attendance

Check whether your child showed up, and see any teacher remarks.

- `GET /parent/children/:studentId/attendance`
- Statuses you'll see: `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`

### 4. Grades and report cards

See assignment scores, exam results, and end-of-term report cards.

- `GET /parent/children/:studentId/grades`

> Maps to [PARENT.md → View Grades](../how-it-works/PARENT.md#5-view-grades).

If you have more than one child, repeat for each child's `studentId`.

---

## Paying school fees online

This is the part most parents use most. SchoolOS lets you **pay the school directly** through **Paystack bank transfer** — the money goes to the school's own account.

### 5. See what's owed

Open each child's fees to see every charge the school has assigned — tuition, transport, exam, library, sports, hostel, meals, and more — with amounts, due dates, and whether each is **mandatory** or **optional (opt-in)**.

- Your child's fees live under `/parent/fees/*`.

### 6. Pay by bank transfer (virtual account)

1. Choose a fee (or installment) to pay.
2. SchoolOS generates a **virtual account number** for that payment.
3. Open your bank app and **transfer** the exact amount to that account number.
4. Payment is confirmed automatically and the fee is marked paid — you'll get a receipt notification.

> The virtual account is tied to your payment, so you don't need to share anything else with the school.

### 7. Pay in installments (where allowed)

Some fees allow **installments**. If a fee is split-payment enabled, you can pay it in parts over time instead of all at once. Each installment generates its own transfer. The fee is fully settled once all installments are paid.

### 8. Opt in to optional fees

Some fees are **opt-in** — things your child only needs if you choose them, like **transport** or **meal plans**. These won't be charged unless you opt in.

1. Browse the optional fees available to your child.
2. **Opt in** to the ones you want (e.g. the school bus).
3. The fee then appears as payable, and you pay it like any other.

You only pay for what you actually use.

---

## If fees go overdue — service access

Mandatory fees have a **due date** and a short **grace period**. SchoolOS runs a **nightly check**:

```
Mandatory fee unpaid past due date + grace period
        │
        ▼
Fee marked OVERDUE  →  child's "service access" is restricted
        │
        ▼
You and your child get a notification
```

While a mandatory fee is overdue, your child can be **blocked** from:

- hostel assignment
- meal plans
- transport assignment
- borrowing library books
- enrolling in new courses

### How to restore access

**Pay the overdue fee.** Once the payment clears, your child's service access is **restored automatically** — no need to call the school to flip a switch. If access doesn't return shortly after payment, contact the office.

> Tip: pay before the grace period ends to avoid any interruption to meals, transport, or the hostel.

---

## Notifications

SchoolOS keeps you informed automatically. Expect alerts for:

- **Attendance** — when your child is marked absent
- **Grades & exams** — when new results are posted
- **Payment receipts** — when a fee payment is confirmed
- **Service restrictions** — when overdue fees limit your child's access
- **Events, disciplinary notices, and health incidents** involving your child

---

## Your first-week checklist

- [ ] Logged in and confirmed all your children appear
- [ ] Reviewed each child's attendance and grades
- [ ] Opened the fees screen and reviewed what's owed
- [ ] Made one payment by bank transfer (virtual account)
- [ ] Opted in to any optional fees you want (e.g. transport)
- [ ] Checked that you're receiving notifications

---

## Where to go deeper

- Exact endpoints & payloads → [`../how-it-works/PARENT.md`](../how-it-works/PARENT.md)
- The whole onboarding picture → [README.md](./README.md)
