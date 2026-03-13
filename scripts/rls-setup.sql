-- scripts/rls-setup.sql
-- Enable RLS for each tenant-protected table

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_tenant_isolation ON "User"
  USING ("tenantId" = current_setting('app.current_tenant')::uuid);

ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_tenant_isolation ON "Student"
  USING ("tenantId" = current_setting('app.current_tenant')::uuid);

ALTER TABLE "Teacher" ENABLE ROW LEVEL SECURITY;
CREATE POLICY teacher_tenant_isolation ON "Teacher"
  USING ("tenantId" = current_setting('app.current_tenant')::uuid);

ALTER TABLE "Class" ENABLE ROW LEVEL SECURITY;
CREATE POLICY class_tenant_isolation ON "Class"
  USING ("tenantId" = current_setting('app.current_tenant')::uuid);

ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY enrollment_tenant_isolation ON "Enrollment"
  USING ("tenantId" = current_setting('app.current_tenant')::uuid);

ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;
CREATE POLICY attendance_tenant_isolation ON "Attendance"
  USING ("tenantId" = current_setting('app.current_tenant')::uuid);

ALTER TABLE "Fee" ENABLE ROW LEVEL SECURITY;
CREATE POLICY fee_tenant_isolation ON "Fee"
  USING ("tenantId" = current_setting('app.current_tenant')::uuid);

ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_tenant_isolation ON "Payment"
  USING ("tenantId" = current_setting('app.current_tenant')::uuid);