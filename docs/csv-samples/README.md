# CSV Upload Templates

Sample CSV files for bulk data import. Download the template from the app (which pre-fills your actual student list), or use these samples as a reference.

## Attendance (`attendance-sample.csv`)

| Column | Required | Description |
|---|---|---|
| `student_id` | One of three | Student UUID from the database |
| `student_name` | One of three | Full name (e.g. "Fatima Bello") — matched case-insensitively |
| `student_code` | One of three | Student code (e.g. "GWD250001") |
| `date` | Yes | ISO date (YYYY-MM-DD) |
| `status` | Yes | One of: `PRESENT`, `ABSENT`, `LATE`, `EXCUSED` |
| `remarks` | No | Optional note |

Student resolution priority: `student_id` → `student_code` → `student_name`

## Grades (`grades-sample.csv`)

| Column | Required | Description |
|---|---|---|
| `student_id` | One of three | Student UUID |
| `student_name` | One of three | Full name |
| `student_code` | One of three | Student code |
| `subject_id` | One of two | Subject UUID |
| `subject_name` | One of two | Subject name (matched case-insensitively) |
| `assignment_id` | No | Assignment UUID (links grade to a specific assignment) |
| `score` | Yes | Numeric score |
| `max_score` | No | Maximum score (defaults to 100) |
| `remarks` | No | Optional note |
| `graded_by` | No | Teacher/grader identifier |

## Exam Results (`exam-results-sample.csv`)

| Column | Required | Description |
|---|---|---|
| `examination_id` | Yes | Examination UUID |
| `exam_name` | No | For reference only (not used for matching) |
| `student_id` | One of three | Student UUID |
| `student_name` | One of three | Full name |
| `student_code` | One of three | Student code |
| `score` | Yes | Numeric score |
| `grade` | No | Letter grade (A, B, C, D, F) |
| `remarks` | No | Optional note |

## How to use

1. Go to the relevant page (Attendance or Grades)
2. Click "CSV Upload"
3. Click "Download Template" — this gives you a CSV pre-filled with your school's students
4. Fill in the data in Excel/Google Sheets
5. Save as CSV and upload

The system resolves students by ID, code, or name (in that priority order). You only need to fill one of the three student identifier columns.
