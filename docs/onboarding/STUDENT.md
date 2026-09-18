# Onboarding: Student

Welcome to **SchoolOS**! This is your student portal — where you learn online, take quizzes, submit assignments, join live classes, and track your own progress. This guide gets you logged in and moving.

> Want exact endpoints and request bodies? Follow the cross-links to [`../how-it-works/STUDENT.md`](../how-it-works/STUDENT.md).

---

## What you'll need

- [ ] Your **student code** (e.g. `GWD250042`) — given to you by your school
- [ ] Your **password**

> **You log in with your student code, not an email.** And you don't need to type your school's web address — the system figures out your school from the start of your code (the `GWD` part).

---

## Your first 10 minutes

### 1. Log in with your student code

```
POST /auth/student-login
{ "studentId": "GWD250042", "password": "••••••••" }
```

That's it — no email, no subdomain needed. The prefix of your code tells SchoolOS which school you belong to.

Your student code was generated when you were enrolled or admitted. It's built from your **school code + year + a sequence number**:

```
GWD 25 0042
└┬┘ └┬┘ └─┬─┘
 │   │    └ your number
 │   └ year
 └ your school
```

### 2. Look around your portal

Once you're in, you can see your courses, your schedule, and your own records. Let's go through what you can do.

---

## Learning online (e-learning)

### 3. Courses and lessons

- See the courses you're **enrolled in**, with your progress percentage.
- Open a course to view its **modules and lessons**.
- As you finish each lesson, your **progress** is tracked and your completion percentage goes up automatically.

> Maps to [STUDENT.md → E-Learning Courses](../how-it-works/STUDENT.md#3-e-learning--courses).

### 4. Quizzes

- Find quizzes attached to your lessons.
- **Submit** your answers — objective questions (multiple choice, true/false) are **graded instantly**, so you see your score right away.
- Review your past attempts and scores anytime.

### 5. Assignments

- **Submit assignments** as text and/or by attaching a file.
- Submitting after the deadline marks your work **LATE**, so aim to be on time.
- Track each submission's status: `DRAFT`, `SUBMITTED`, `GRADED`, or `LATE`.

### 6. Live classes

- See **scheduled live classes** with their times and join links.
- Join at the scheduled time using the meeting link; your teacher records attendance.

### 7. Discussions and certificates

- Ask and answer questions in **course discussions**.
- When you complete **100%** of a course, you can earn a **certificate** — it has a public verification link you can share.

---

## Checking your own records

You can keep an eye on your own academic data:

- **Attendance** — see your present/absent/late/excused history.
- **Grades** — see your assignment scores and exam results.

If something looks wrong, talk to your teacher — only staff can change these records.

---

## A note on fees and access

You don't pay fees yourself — your **parent or guardian** handles fees in their portal.

But fees can affect you. If a **mandatory** school fee goes **overdue**, SchoolOS can **restrict your access to certain services** until it's paid, including:

- borrowing **library** books
- **hostel** assignment
- **meal** plans
- **transport** assignment
- enrolling in new **courses**

If you suddenly can't borrow a book or join a service, it may be due to an overdue fee. **Talk to your parent/guardian or the school office** — once the fee is paid, your access is restored automatically.

---

## Your first-week checklist

- [ ] Logged in with your student code
- [ ] Opened your enrolled courses and started a lesson
- [ ] Took at least one quiz and saw your score
- [ ] Submitted an assignment (on time!)
- [ ] Checked the schedule for any live classes
- [ ] Reviewed your own attendance and grades

---

## Where to go deeper

- Exact endpoints & payloads → [`../how-it-works/STUDENT.md`](../how-it-works/STUDENT.md)
- The whole onboarding picture → [README.md](./README.md)
