# How It Works — Student

The **Student** role provides self-service access to e-learning — taking courses, submitting quizzes and assignments, joining live classes, participating in discussions, and earning certificates.

---

## 1. Authentication

Students log in with their student ID (not email):

```
POST /auth/student-login
{ "studentId": "GWD250042", "password": "yourPassword" }
```

The student ID is generated automatically when a student is created or admitted from the candidate pipeline. Use the returned JWT token: `Authorization: Bearer <token>`

---

## 2. How Your Account Is Created

Student accounts are created in one of two ways:

1. **Direct creation** by Admin/Teacher:
   ```
   POST /students
   { "firstName": "Ada", "lastName": "Nwosu", "dateOfBirth": "2012-05-20", "classId": "<id>" }
   ```

2. **Admission from candidate pipeline:**
   ```
   POST /candidates/:id/admit   (Admin only)
   ```

Both methods generate a unique student ID (e.g. `GWD250042`) based on the school code, year, and sequence number.

---

## 3. E-Learning — Courses

### View Your Enrollments

```
GET /courses/enrollments/:yourStudentId
```

Returns all courses you're enrolled in, with your progress percentage and enrollment status (ACTIVE, COMPLETED, DROPPED).

### View Course Details

```
GET /courses/:id
```

Returns the full course structure — modules, lessons, and your completion status for each.

### Update Lesson Progress

When you complete a lesson, the system tracks it:

```
POST /courses/progress
{
  "enrollmentId": "<your-enrollment-id>",
  "lessonId": "<lesson-id>",
  "completed": true,
  "timeSpent": 15
}
```

The course completion percentage is automatically recalculated based on how many lessons you've finished.

---

## 4. Quizzes

### View Available Quizzes

```
GET /elearning/quizzes?lessonId=<id>
```

### Submit a Quiz

```
POST /elearning/quizzes/:quizId/submit
{
  "studentId": "<your-student-id>",
  "answers": [
    { "questionId": "q1", "answer": "4" },
    { "questionId": "q2", "answer": "True" }
  ]
}
```

Quizzes are auto-graded for objective questions (multiple choice, true/false). The response includes your score and which answers were correct.

### View Your Attempts

```
GET /elearning/quizzes/:quizId/attempts?studentId=<your-id>
```

Returns all your previous attempts with scores and timestamps.

---

## 5. Assignments

### Submit an Assignment

```
POST /elearning/assignments/:assignmentId/submit
{
  "studentId": "<your-student-id>",
  "submissionText": "Here is my solution to the problem set.",
  "attachmentUrl": "https://example.com/my-submission.pdf"
}
```

- Submissions after the due date are automatically marked as `LATE`
- You can attach files using the upload endpoint first, then reference the URL

### View Your Submissions

```
GET /elearning/submissions?studentId=<your-id>
```

Returns all your submissions with their status: `DRAFT`, `SUBMITTED`, `GRADED`, or `LATE`.

---

## 6. Live Classes

### View Scheduled Classes

```
GET /elearning/live-classes
```

Returns upcoming and past live classes with meeting URLs, schedules, and statuses (SCHEDULED, LIVE, COMPLETED).

### Join a Live Class

Use the `meetingUrl` from the live class record to join via Zoom, Google Meet, or Teams. Your teacher records your attendance:

```
POST /elearning/live-classes/:id/attendance
{
  "studentId": "<your-id>",
  "joinedAt": "2025-03-20T15:02:00Z",
  "leftAt": "2025-03-20T15:57:00Z"
}
```

---

## 7. Discussions

### View Course Discussions

```
GET /elearning/discussions/:courseId
```

### Create a Discussion Thread

```
POST /elearning/discussions
{
  "courseId": "<course-id>",
  "title": "Question about Chapter 3",
  "content": "Can someone explain the difference between..."
}
```

### Reply to a Discussion

```
POST /elearning/discussions/:id/replies
{ "content": "Here is my understanding of that topic..." }
```

---

## 8. Certificates

When you complete 100% of a course, a certificate can be generated:

### View Your Certificates

```
GET /elearning/certificates/:yourStudentId
```

### Verify a Certificate

Anyone can verify a certificate (public endpoint):

```
GET /elearning/certificates/verify/CERT-1234567890-abc12345
```

---

## 9. File Uploads

To attach files to assignments or submissions:

```
POST /upload
Content-Type: multipart/form-data
file: <your-file>
```

Returns a file key and URL. Use the URL in your submission's `attachmentUrl` field.

### Get a Signed URL for a File

```
GET /upload/signed-url/:key
```

---

## 10. Available Endpoints Summary

| Action | Endpoint | Method |
|---|---|---|
| Login | `/auth/student-login` | POST |
| My enrollments | `/courses/enrollments/:studentId` | GET |
| Course details | `/courses/:id` | GET |
| Update progress | `/courses/progress` | POST |
| List quizzes | `/elearning/quizzes` | GET |
| Submit quiz | `/elearning/quizzes/:id/submit` | POST |
| My quiz attempts | `/elearning/quizzes/:id/attempts` | GET |
| Submit assignment | `/elearning/assignments/:id/submit` | POST |
| My submissions | `/elearning/submissions` | GET |
| Live classes | `/elearning/live-classes` | GET |
| Discussions | `/elearning/discussions/:courseId` | GET |
| Create discussion | `/elearning/discussions` | POST |
| Reply to discussion | `/elearning/discussions/:id/replies` | POST |
| My certificates | `/elearning/certificates/:studentId` | GET |
| Upload file | `/upload` | POST |
| Signed URL | `/upload/signed-url/:key` | GET |

---

## 11. Typical Usage

1. **Daily** — Check for new lessons, complete assigned quizzes
2. **Before deadlines** — Submit assignments (late submissions are flagged)
3. **Scheduled times** — Join live classes via meeting URLs
4. **Ongoing** — Participate in course discussions, track your progress
5. **On completion** — View and share your course certificates
