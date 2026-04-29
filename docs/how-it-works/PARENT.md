# How It Works — Parent

The **Parent** role provides a read-only portal to monitor your children's academic progress, attendance, and payment history. Parent accounts are created by the school Admin and linked to one or more students.

---

## 1. Authentication

```
POST /auth/login
{ "email": "parent@example.com", "password": "yourPassword" }
```

Use the returned JWT token: `Authorization: Bearer <token>`

---

## 2. How Your Account Is Created

Parent accounts are created by the school Admin:

```
POST /parents   (Admin only)
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "phone": "+2348000000000",
  "password": "initialPassword",
  "studentIds": ["<child-1-uuid>", "<child-2-uuid>"]
}
```

This creates a User account with the `PARENT` role and links it to the specified students. You log in with the email and password provided by the school.

---

## 3. View Your Children

```
GET /parent/children
```

Returns a list of all students linked to your account, including their names, classes, and student IDs.

---

## 4. View Attendance

```
GET /parent/children/:studentId/attendance
```

Returns your child's attendance records — dates, statuses (PRESENT, ABSENT, LATE, EXCUSED), and any remarks from the teacher.

**Example response:**
```json
[
  { "date": "2025-03-14", "status": "PRESENT", "remarks": null },
  { "date": "2025-03-15", "status": "LATE", "remarks": "Arrived 10 minutes late" },
  { "date": "2025-03-16", "status": "ABSENT", "remarks": "Sick — parent notified" }
]
```

---

## 5. View Grades

```
GET /parent/children/:studentId/grades
```

Returns your child's grades across all subjects — scores, max scores, assignment names, and teacher remarks.

---

## 6. View Payments

```
GET /parent/children/:studentId/payments
```

Returns the payment history for your child — amounts paid, payment methods, dates, and outstanding fees.

---

## 7. Available Endpoints Summary

| Action | Endpoint | Method |
|---|---|---|
| List your children | `/parent/children` | GET |
| Child's attendance | `/parent/children/:studentId/attendance` | GET |
| Child's grades | `/parent/children/:studentId/grades` | GET |
| Child's payments | `/parent/children/:studentId/payments` | GET |

All endpoints are read-only. Parents cannot modify any data.

---

## 8. Multiple Children

If you have more than one child at the school, all are returned by `GET /parent/children`. Use each child's `studentId` to query their individual attendance, grades, and payments.

---

## 9. Notifications

The system sends automated notifications for key events affecting your children:

- **Attendance alerts** — When your child is marked absent
- **Grade updates** — When new grades or exam results are posted
- **Payment receipts** — When a payment is recorded
- **Event announcements** — When your child is added to a school event
- **Disciplinary notices** — When a disciplinary record is created
- **Health incidents** — When a medical incident is logged

---

## 10. Typical Usage

1. **Daily** — Check attendance to confirm your child arrived at school
2. **Weekly** — Review grades and assignment scores
3. **Monthly** — Check payment status and outstanding fees
4. **As needed** — Review notifications for any alerts from the school
