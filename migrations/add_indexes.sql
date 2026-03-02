-- Add indexes for User model
CREATE INDEX "User_tenantId_email_idx" ON "User"("tenantId", "email");
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- Add indexes for Student model
CREATE INDEX "Student_createdAt_idx" ON "Student"("createdAt");

-- Add indexes for Teacher model
CREATE INDEX "Teacher_tenantId_lastName_idx" ON "Teacher"("tenantId", "lastName");

-- Add indexes for Class model
CREATE INDEX "Class_teacherId_idx" ON "Class"("teacherId");

-- Add indexes for Enrollment model
CREATE INDEX "Enrollment_studentId_idx" ON "Enrollment"("studentId");
CREATE INDEX "Enrollment_classId_idx" ON "Enrollment"("classId");

-- Add indexes for Attendance model
CREATE INDEX "Attendance_studentId_idx" ON "Attendance"("studentId");
CREATE INDEX "Attendance_status_idx" ON "Attendance"("status");

-- Add indexes for Fee model
CREATE INDEX "Fee_tenantId_createdAt_idx" ON "Fee"("tenantId", "createdAt");

-- Add indexes for Payment model
CREATE INDEX "Payment_studentId_idx" ON "Payment"("studentId");
CREATE INDEX "Payment_feeId_idx" ON "Payment"("feeId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_tenantId_createdAt_idx" ON "Payment"("tenantId", "createdAt");

-- Add indexes for Term model
CREATE INDEX "Term_academicYearId_idx" ON "Term"("academicYearId");

-- Add indexes for Subject model
CREATE INDEX "Subject_teacherId_idx" ON "Subject"("teacherId");
CREATE INDEX "Subject_academicYearId_idx" ON "Subject"("academicYearId");

-- Add indexes for Assignment model
CREATE INDEX "Assignment_termId_idx" ON "Assignment"("termId");
CREATE INDEX "Assignment_tenantId_dueDate_idx" ON "Assignment"("tenantId", "dueDate");

-- Add indexes for Grade model
CREATE INDEX "Grade_assignmentId_idx" ON "Grade"("assignmentId");
CREATE INDEX "Grade_subjectId_idx" ON "Grade"("subjectId");

-- Add indexes for Examination model
CREATE INDEX "Examination_termId_idx" ON "Examination"("termId");

-- Add indexes for Book model
CREATE INDEX "Book_tenantId_title_idx" ON "Book"("tenantId", "title");

-- Add indexes for BookTransaction model
CREATE INDEX "BookTransaction_bookId_idx" ON "BookTransaction"("bookId");
CREATE INDEX "BookTransaction_tenantId_dueDate_idx" ON "BookTransaction"("tenantId", "dueDate");

-- Add indexes for BusRoute model
CREATE INDEX "BusRoute_busId_idx" ON "BusRoute"("busId");

-- Add indexes for Asset model
CREATE INDEX "Asset_tenantId_location_idx" ON "Asset"("tenantId", "location");

-- Add indexes for AssetTransaction model
CREATE INDEX "AssetTransaction_assetId_idx" ON "AssetTransaction"("assetId");
CREATE INDEX "AssetTransaction_tenantId_date_idx" ON "AssetTransaction"("tenantId", "date");

-- Add indexes for Event model
CREATE INDEX "Event_tenantId_type_idx" ON "Event"("tenantId", "type");

-- Add indexes for DisciplinaryRecord model
CREATE INDEX "DisciplinaryRecord_tenantId_incidentDate_idx" ON "DisciplinaryRecord"("tenantId", "incidentDate");
CREATE INDEX "DisciplinaryRecord_status_idx" ON "DisciplinaryRecord"("status");

-- Add indexes for HealthRecord model
CREATE INDEX "HealthRecord_studentId_idx" ON "HealthRecord"("studentId");

-- Add indexes for MedicalIncident model
CREATE INDEX "MedicalIncident_healthRecordId_idx" ON "MedicalIncident"("healthRecordId");
CREATE INDEX "MedicalIncident_tenantId_date_idx" ON "MedicalIncident"("tenantId", "date");

-- Add indexes for Vaccination model
CREATE INDEX "Vaccination_healthRecordId_idx" ON "Vaccination"("healthRecordId");
CREATE INDEX "Vaccination_tenantId_date_idx" ON "Vaccination"("tenantId", "date");
CREATE INDEX "Vaccination_tenantId_nextDue_idx" ON "Vaccination"("tenantId", "nextDue");
