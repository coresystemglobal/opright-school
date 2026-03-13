# Tier 2 Features - Implementation Plan

## Overview
This document outlines the implementation plan for Tier 2 features. These features build on the existing Tier 1 foundation.

## Features to Implement

### 1. Fee Management ✅ (Partially Implemented)
**Status:** Basic models exist, needs enhancement

**Current State:**
- ✅ Fee model exists
- ✅ Payment model exists
- ❌ FeeStructure (per class/term)
- ❌ Invoice generation
- ❌ Receipt generation (PDF)
- ❌ Balance tracking

**Implementation Steps:**
1. Enhance Fee model with class/term relationships
2. Create FeeStructure model
3. Create Invoice model
4. Create Receipt model
5. Implement fee calculation service
6. Implement invoice generation
7. Implement PDF receipt generation
8. Create fee management API endpoints

**Estimated Time:** 2-3 days

### 2. Parent Portal
**Status:** Not implemented

**Required Models:**
- Parent
- ParentStudent (M:N relationship)
- Notification
- Message

**Implementation Steps:**
1. Create Parent model
2. Create ParentStudent link table
3. Create Notification model
4. Create Message model
5. Implement parent registration
6. Implement student linking
7. Create parent dashboard API
8. Implement messaging system
9. Create notification service

**Estimated Time:** 3-4 days

### 3. Report Cards / Transcripts
**Status:** Basic report card exists, needs enhancement

**Current State:**
- ✅ Grade model exists
- ✅ Basic report card generation
- ❌ ReportCard model (for storage)
- ❌ Transcript model
- ❌ PDF generation
- ❌ Teacher remarks
- ❌ GPA calculation

**Implementation Steps:**
1. Create ReportCard model
2. Create Transcript model
3. Enhance report card generation
4. Implement GPA calculation
5. Add teacher remarks
6. Implement PDF generation
7. Create report card API endpoints

**Estimated Time:** 2-3 days

### 4. Communication System
**Status:** Placeholder exists

**Required Models:**
- Announcement
- Message (enhance existing)
- Conversation
- MessageRecipient

**Implementation Steps:**
1. Create Announcement model
2. Enhance Message model
3. Create Conversation model
4. Create MessageRecipient model
5. Implement announcement broadcast
6. Implement private messaging
7. Implement threaded conversations
8. Add email/push notifications
9. Create communication API endpoints

**Estimated Time:** 3-4 days

### 5. Homework / Assignment Management
**Status:** Partially implemented

**Current State:**
- ✅ Assignment model exists
- ❌ Submission model
- ❌ File upload support
- ❌ Deadline notifications

**Implementation Steps:**
1. Create Submission model
2. Implement file upload (Backblaze B2)
3. Create submission API endpoints
4. Implement grading workflow
5. Add deadline notifications
6. Create student submission portal

**Estimated Time:** 2-3 days

### 6. Exam Management
**Status:** Partially implemented

**Current State:**
- ✅ Examination model exists
- ✅ ExamResult model exists
- ❌ ExamSchedule model
- ❌ ExamHall model
- ❌ Exam timetable
- ❌ Hall assignment

**Implementation Steps:**
1. Create ExamSchedule model
2. Create ExamHall model
3. Implement exam timetable generation
4. Implement hall assignment
5. Add conflict detection
6. Create exam management API endpoints

**Estimated Time:** 2-3 days

## Total Estimated Time: 14-20 days

## Implementation Priority

### Phase 1 (High Priority - Week 1-2)
1. **Fee Management** - Critical for school operations
2. **Parent Portal** - High demand feature
3. **Report Cards Enhancement** - End of term requirement

### Phase 2 (Medium Priority - Week 3)
4. **Communication System** - Improves engagement
5. **Homework Management** - Teacher workflow

### Phase 3 (Lower Priority - Week 4)
6. **Exam Management Enhancement** - Builds on existing

## Database Schema Changes Required

```prisma
// Add to schema.prisma

/// FEE MANAGEMENT
model FeeStructure {
  id             String       @id @default(uuid()) @db.Uuid
  tenantId       String       @db.Uuid
  tenant         Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  name           String       // "Tuition Fee", "Lab Fee"
  amount         Float
  classId        String?      @db.Uuid
  class          Class?       @relation(fields: [classId], references: [id])
  termId         String?      @db.Uuid
  term           Term?        @relation(fields: [termId], references: [id])
  academicYearId String       @db.Uuid
  academicYear   AcademicYear @relation(fields: [academicYearId], references: [id])
  
  isRecurring    Boolean      @default(false)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  
  invoices       Invoice[]
  
  @@index([tenantId, classId, termId])
}

model Invoice {
  id              String        @id @default(uuid()) @db.Uuid
  tenantId        String        @db.Uuid
  tenant          Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  invoiceNumber   String        @unique
  studentId       String        @db.Uuid
  student         Student       @relation(fields: [studentId], references: [id])
  feeStructureId  String        @db.Uuid
  feeStructure    FeeStructure  @relation(fields: [feeStructureId], references: [id])
  
  amount          Float
  dueDate         DateTime
  status          InvoiceStatus @default(PENDING)
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  payments        Payment[]
  receipts        Receipt[]
  
  @@index([tenantId, studentId, status])
}

model Receipt {
  id            String   @id @default(uuid()) @db.Uuid
  tenantId      String   @db.Uuid
  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  receiptNumber String   @unique
  invoiceId     String   @db.Uuid
  invoice       Invoice  @relation(fields: [invoiceId], references: [id])
  paymentId     String   @db.Uuid
  payment       Payment  @relation(fields: [paymentId], references: [id])
  
  pdfUrl        String?
  
  createdAt     DateTime @default(now())
  
  @@index([tenantId, invoiceId])
}

enum InvoiceStatus {
  PENDING
  PARTIAL
  PAID
  OVERDUE
  CANCELLED
}

/// PARENT PORTAL
model Parent {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  email     String   @unique
  password  String
  firstName String
  lastName  String
  phone     String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  students       ParentStudent[]
  sentMessages   Message[]       @relation("SentMessages")
  receivedMessages Message[]     @relation("ReceivedMessages")
  notifications  Notification[]
  
  @@index([tenantId, email])
}

model ParentStudent {
  id        String   @id @default(uuid()) @db.Uuid
  parentId  String   @db.Uuid
  parent    Parent   @relation(fields: [parentId], references: [id], onDelete: Cascade)
  studentId String   @db.Uuid
  student   Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  
  relationship String // "Father", "Mother", "Guardian"
  isPrimary    Boolean @default(false)
  
  createdAt DateTime @default(now())
  
  @@unique([parentId, studentId])
  @@index([parentId])
  @@index([studentId])
}

model Notification {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  recipientId   String   @db.Uuid
  recipientType String   // "Parent", "Student", "Teacher"
  parent        Parent?  @relation(fields: [recipientId], references: [id])
  
  title     String
  message   String
  type      NotificationType
  isRead    Boolean  @default(false)
  
  createdAt DateTime @default(now())
  
  @@index([tenantId, recipientId, isRead])
}

enum NotificationType {
  ANNOUNCEMENT
  GRADE_POSTED
  ATTENDANCE_ALERT
  FEE_DUE
  MESSAGE
  ASSIGNMENT_DUE
}

/// COMMUNICATION
model Announcement {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  title     String
  content   String
  authorId  String   // User ID
  targetRole String? // null = all, or specific role
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([tenantId, createdAt])
}

model Message {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String   @db.Uuid
  tenant       Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  senderId     String   @db.Uuid
  senderType   String   // "Parent", "Teacher", "Admin"
  sender       Parent?  @relation("SentMessages", fields: [senderId], references: [id])
  
  recipientId  String   @db.Uuid
  recipientType String
  recipient    Parent?  @relation("ReceivedMessages", fields: [recipientId], references: [id])
  
  subject      String
  content      String
  isRead       Boolean  @default(false)
  
  conversationId String? @db.Uuid
  conversation   Conversation? @relation(fields: [conversationId], references: [id])
  
  createdAt    DateTime @default(now())
  
  @@index([tenantId, recipientId, isRead])
  @@index([conversationId])
}

model Conversation {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String    @db.Uuid
  tenant      Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  subject     String
  participants Json     // Array of participant IDs and types
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  messages    Message[]
  
  @@index([tenantId])
}

/// HOMEWORK/ASSIGNMENT SUBMISSIONS
model Submission {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String   @db.Uuid
  tenant       Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  assignmentId String   @db.Uuid
  assignment   Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  studentId    String   @db.Uuid
  student      Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  
  content      String?  // Text submission
  fileUrl      String?  // File upload URL
  submittedAt  DateTime @default(now())
  
  gradeId      String?  @db.Uuid
  grade        Grade?   @relation(fields: [gradeId], references: [id])
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@unique([assignmentId, studentId])
  @@index([tenantId, studentId])
}

/// REPORT CARDS
model ReportCard {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  studentId String   @db.Uuid
  student   Student  @relation(fields: [studentId], references: [id])
  termId    String   @db.Uuid
  term      Term     @relation(fields: [termId], references: [id])
  
  overallGrade String?
  gpa          Float?
  remarks      String?
  pdfUrl       String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([studentId, termId])
  @@index([tenantId, studentId])
}

/// EXAM MANAGEMENT
model ExamSchedule {
  id            String      @id @default(uuid()) @db.Uuid
  tenantId      String      @db.Uuid
  tenant        Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  examinationId String      @db.Uuid
  examination   Examination @relation(fields: [examinationId], references: [id])
  examHallId    String?     @db.Uuid
  examHall      ExamHall?   @relation(fields: [examHallId], references: [id])
  
  startTime     DateTime
  endTime       DateTime
  
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  @@index([tenantId, examinationId])
}

model ExamHall {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  name      String
  capacity  Int
  location  String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  schedules ExamSchedule[]
  
  @@index([tenantId])
}
```

## API Endpoints to Create

### Fee Management
- `POST /fee-structures` - Create fee structure
- `GET /fee-structures` - List fee structures
- `POST /invoices` - Generate invoice
- `GET /invoices/student/:studentId` - Get student invoices
- `POST /invoices/:id/pay` - Record payment
- `GET /receipts/:id/pdf` - Download receipt PDF

### Parent Portal
- `POST /parents/register` - Parent registration
- `POST /parents/link-student` - Link student to parent
- `GET /parents/dashboard` - Parent dashboard data
- `GET /parents/students/:studentId/grades` - View student grades
- `GET /parents/students/:studentId/attendance` - View attendance

### Communication
- `POST /announcements` - Create announcement
- `GET /announcements` - List announcements
- `POST /messages` - Send message
- `GET /messages` - List messages
- `GET /conversations/:id` - Get conversation thread

### Homework
- `POST /submissions` - Submit assignment
- `GET /submissions/assignment/:assignmentId` - List submissions
- `PUT /submissions/:id/grade` - Grade submission

### Report Cards
- `POST /report-cards/generate` - Generate report card
- `GET /report-cards/student/:studentId/term/:termId` - Get report card
- `GET /report-cards/:id/pdf` - Download PDF

### Exam Management
- `POST /exam-schedules` - Create exam schedule
- `POST /exam-halls` - Create exam hall
- `GET /exam-schedules/term/:termId` - Get exam timetable

## Next Steps

1. Review and approve this plan
2. Prioritize features based on business needs
3. Begin Phase 1 implementation
4. Test each feature thoroughly
5. Deploy incrementally

## Notes

- All features maintain multi-tenant isolation
- PDF generation will use a library like `pdfkit` or `puppeteer`
- File uploads will use Backblaze B2
- Notifications can be enhanced with email/SMS later
- Consider adding caching for frequently accessed data
