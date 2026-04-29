# How It Works — Teacher

The **Teacher** role covers classroom operations — managing students, marking attendance, grading assignments, running e-learning courses, scheduling events, and coaching sports activities.

---

## 1. Authentication

```
POST /auth/login
{ "email": "teacher@school.com", "password": "yourPassword" }
```

Use the returned JWT token: `Authorization: Bearer <token>`

---

## 2. Permissions Overview

Teachers have access to these modules via role restrictions:

| Module | Access Level |
|---|---|
| Students | Full CRUD |
| Classes | Full CRUD + enrollment |
| Attendance | Full CRUD (legacy + new) |
| Grades (legacy) | Full CRUD |
| Gradebook | Full access |
| Courses | Full CRUD |
| E-Learning | Full access |
| Events | Full CRUD |
| Sports | Full CRUD |
| Disciplinary | Full CRUD |
| Subjects | Read + assign |
| Timetables | Read + CRUD |

---

## 3. Student Management

| Action | Endpoint |
|---|---|
| List students | `GET /students` |
| Create student | `POST /students` |
| Update student | `PUT /students/:id` |
| Delete student | `DELETE /students/:id` |

### Class Enrollment

```
POST /classes/:classId/enroll
{ "studentId": "<student-id>" }
```

---

## 4. Attendance

### Mark Single Attendance

```
POST /attendances
{ "studentId": "<id>", "date": "2025-03-16", "status": "PRESENT", "remarks": "On time" }
```

Status options: `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`

### Bulk Mark (Entire Class)

```
POST /attendances/bulk
[
  { "studentId": "<id-1>", "date": "2025-03-16", "status": "PRESENT" },
  { "studentId": "<id-2>", "date": "2025-03-16", "status": "ABSENT" }
]
```

### View & Report

| Action | Endpoint |
|---|---|
| List records | `GET /attendances?classId=<id>&date=<date>` |
| Student stats | `GET /attendances/stats/:studentId?startDate=<>&endDate=<>` |
| Class report | `GET /attendances/class/:classId/report?date=<date>` |

---

## 5. Gradebook

### Create Assignments

```
POST /gradebook/assignments
{
  "academicYearId": "<id>", "termId": "<id>", "subjectId": "<id>",
  "title": "Algebra Homework", "description": "Solve questions 1-10",
  "maxScore": 20, "weight": 10, "dueDate": "2025-03-20T12:00:00Z"
}
```

### Record Grades

**Single:**
```
POST /gradebook/grades
{
  "studentId": "<id>", "subjectId": "<id>", "assignmentId": "<id>",
  "score": 18, "maxScore": 20, "remarks": "Excellent", "gradedBy": "<your-teacher-id>"
}
```

**Bulk:**
```
POST /gradebook/grades/bulk
[
  { "studentId": "<id>", "subjectId": "<id>", "assignmentId": "<id>", "score": 18, "maxScore": 20 }
]
```

### View Grades

| Action | Endpoint |
|---|---|
| Student grades | `GET /gradebook/grades/student/:studentId` |
| Subject average | `GET /gradebook/grades/student/:studentId/subject/:subjectId/average` |
| Report card | `GET /gradebook/report-card/:studentId/term/:termId` |

### Examinations

```
POST /gradebook/examinations
{
  "academicYearId": "<id>", "termId": "<id>", "subjectId": "<id>",
  "name": "Midterm Exam", "examDate": "2025-03-25T09:00:00Z",
  "duration": 90, "maxScore": 100, "passingScore": 40, "room": "Hall 1"
}
```

```
POST /gradebook/exam-results
{ "examinationId": "<id>", "studentId": "<id>", "score": 84, "grade": "A", "remarks": "Strong" }
```

---

## 6. E-Learning & Courses

### Course Management

| Action | Endpoint |
|---|---|
| List courses | `GET /courses?teacherId=<your-id>` |
| Create course | `POST /courses` |
| Get course | `GET /courses/:id` |
| Update course | `PUT /courses/:id` |
| Delete course | `DELETE /courses/:id` |
| Enroll student | `POST /courses/:id/enroll` |
| Update progress | `POST /courses/progress` |

### Quizzes

| Action | Endpoint |
|---|---|
| Create quiz | `POST /elearning/quizzes` |
| List quizzes | `GET /elearning/quizzes?lessonId=<id>` |
| View attempts | `GET /elearning/quizzes/:id/attempts` |

**Create quiz:**
```json
{
  "lessonId": "<id>", "title": "Week 1 Quiz",
  "questions": [
    { "prompt": "2 + 2 = ?", "options": ["3", "4"], "answer": "4" }
  ]
}
```

### Assignment Submissions

| Action | Endpoint |
|---|---|
| List submissions | `GET /elearning/submissions?assignmentId=<id>` |
| Grade submission | `PUT /elearning/submissions/:id/grade` |

**Grade a submission:**
```json
{ "grade": 88, "feedback": "Well researched", "gradedBy": "<your-teacher-id>" }
```

### Live Classes

| Action | Endpoint |
|---|---|
| Schedule class | `POST /elearning/live-classes` |
| List classes | `GET /elearning/live-classes?teacherId=<your-id>` |
| Update class | `PUT /elearning/live-classes/:id` |
| Record attendance | `POST /elearning/live-classes/:id/attendance` |
| View attendance | `GET /elearning/live-classes/:id/attendance` |

**Schedule a live class:**
```json
{
  "title": "Physics Revision", "teacherId": "<your-id>",
  "scheduledAt": "2025-03-20T15:00:00Z", "status": "SCHEDULED",
  "meetingUrl": "https://meet.example.com/physics"
}
```

### Discussions

| Action | Endpoint |
|---|---|
| Create discussion | `POST /elearning/discussions` |
| List discussions | `GET /elearning/discussions/:courseId` |
| Reply | `POST /elearning/discussions/:id/replies` |
| Pin/unpin | `PUT /elearning/discussions/:id/pin` |

### Certificates

| Action | Endpoint |
|---|---|
| Generate certificate | `POST /elearning/certificates` |
| View student certs | `GET /elearning/certificates/:studentId` |
| Verify certificate | `GET /elearning/certificates/verify/:number` |

---

## 7. Events

| Action | Endpoint |
|---|---|
| List events | `GET /events?startDate=<>&endDate=<>` |
| Create event | `POST /events` |
| Upcoming events | `GET /events/upcoming` |
| List participants | `GET /events/:id/participants` |
| Add participant | `POST /events/:id/participants` |

---

## 8. Sports

| Action | Endpoint |
|---|---|
| List activities | `GET /sports/activities` |
| Create activity | `POST /sports/activities` |
| Enroll student | `POST /sports/enrollments` |
| List competitions | `GET /sports/competitions` |
| Create competition | `POST /sports/competitions` |

---

## 9. Disciplinary

| Action | Endpoint |
|---|---|
| List records | `GET /disciplinary/records?studentId=<id>` |
| Create record | `POST /disciplinary/records` |
| Update record | `PATCH /disciplinary/records/:id` |
| View stats | `GET /disciplinary/stats` |

---

## 10. View Schedules

| Action | Endpoint |
|---|---|
| Your timetable | `GET /timetables/teacher/:yourTeacherId` |
| Class timetable | `GET /timetables/class/:classId` |

---

## Typical Daily Workflow

1. **Morning** — Mark attendance for your classes (bulk endpoint)
2. **During class** — Start live classes, manage discussions
3. **After class** — Grade submissions, record quiz results
4. **Weekly** — Create assignments, review attendance stats
5. **End of term** — Create exams, record results, generate report cards
6. **As needed** — Log disciplinary incidents, manage sports activities
