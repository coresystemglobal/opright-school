# Onboarding: Teacher

Welcome to **SchoolOS**! This guide gets you from "the school just gave me a login" to confidently running your classes — attendance, grades, e‑learning, and more.

> Want exact endpoints and request bodies? Follow the cross‑links to [`../how-it-works/TEACHER.md`](../how-it-works/TEACHER.md).

---

## What you'll need

- [ ] Your **email** and **password** (given to you by your school admin)
- [ ] Your school's **subdomain** (e.g. `greenwood.schoolos.ng`)
- [ ] To know which **classes and subjects** you teach

> **Note:** Teachers do **not** manage school fees. Fee setup, payments, and overdue handling are the admin's and parents' domain — you can teach without ever touching money.

---

## Your first 10 minutes

### 1. Log in

Go to your school's subdomain and sign in with your email and password.

```
POST /auth/login   (on greenwood.schoolos.ng)
{ "email": "teacher@greenwood.edu", "password": "••••••••" }
```

You're in as a **TEACHER**.

### 2. Find your schedule

Check your weekly timetable so you know what you're teaching and when.

- Your timetable: `GET /timetables/teacher/:yourTeacherId`
- A class's timetable: `GET /timetables/class/:classId`

### 3. See your classes and students

Open the classes you've been assigned and review the student lists. You can manage student records and class enrollments as needed.

> Maps to [TEACHER.md → Student Management](../how-it-works/TEACHER.md#3-student-management).

---

## Your first day: the daily teaching loop

### 4. Take attendance

The fastest way is to mark a whole class at once with the **bulk** endpoint, then fix any exceptions.

- One student: `POST /attendances`
- Whole class: `POST /attendances/bulk`
- Statuses: `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`

When a student is marked absent, the system can notify their parent automatically — so accuracy matters.

### 5. Create assignments and record grades

1. **Create an assignment** for a subject in the current term (title, max score, optional weight and due date).
2. **Record grades** — one at a time, or in **bulk** for the whole class.
3. Review **subject averages** and generate a **report card** at term end.

> Maps to [TEACHER.md → Gradebook](../how-it-works/TEACHER.md#5-gradebook).

### 6. Set and grade exams

Create **examinations** (with exam date, duration, max and passing scores) and record each student's **exam result**. These feed into report cards alongside assignment grades.

---

## Your first week: build out e‑learning

SchoolOS includes a full e‑learning suite. Set up at your own pace.

### 7. Create a course

Build a **course** with modules and lessons, then **enroll** your students. Student lesson progress is tracked automatically and rolls up into a completion percentage.

### 8. Add quizzes and assignments

- **Quizzes** attach to lessons; objective questions (multiple choice, true/false) are **auto‑graded**.
- **Assignment submissions** can be reviewed and graded with feedback; late submissions are flagged automatically.

### 9. Run live classes

Schedule a **live class** (powered by the school's video provider), share it with students, and record who attended. Use **discussions** for async Q&A between sessions.

### 10. Issue certificates

When a student completes 100% of a course, generate a **certificate** — each one is verifiable via a public link.

> All of this maps to [TEACHER.md → E‑Learning & Courses](../how-it-works/TEACHER.md#6-e-learning--courses).

---

## Beyond the classroom

| You can also… | Where |
|---|---|
| Organize **events** and manage participants | [TEACHER.md → Events](../how-it-works/TEACHER.md#7-events) |
| Coach **sports** activities and competitions | [TEACHER.md → Sports](../how-it-works/TEACHER.md#8-sports) |
| Log **disciplinary** incidents | [TEACHER.md → Disciplinary](../how-it-works/TEACHER.md#9-disciplinary) |
| Attach **files** to lessons/assignments via upload | upload endpoints |

---

## Communicating with parents

You don't message parents directly, but your actions reach them: marking a child absent, posting grades or exam results, adding a student to an event, or logging a disciplinary or health note all trigger **automatic notifications** to the linked parent. Keep records timely and accurate — parents are watching the same data you enter.

---

## Your first‑week checklist

- [ ] Logged in and reviewed your timetable
- [ ] Confirmed your class lists
- [ ] Took attendance for every class (try the bulk endpoint)
- [ ] Created your first assignment and recorded grades
- [ ] Set up one e‑learning course with at least one lesson
- [ ] Added a quiz and watched it auto‑grade
- [ ] Scheduled (or trialed) one live class

---

## Where to go deeper

- Exact endpoints & payloads → [`../how-it-works/TEACHER.md`](../how-it-works/TEACHER.md)
- The whole onboarding picture → [README.md](./README.md)
