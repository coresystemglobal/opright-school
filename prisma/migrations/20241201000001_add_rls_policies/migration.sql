-- Enable Row Level Security on all tenant-scoped tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Teacher" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Class" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Fee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant isolation
CREATE POLICY user_tenant_isolation ON "User"
  USING ("tenantId" = current_setting('app.current_tenant')::uuid);

CREATE POLICY student_tenant_isolation ON "Student"
  USING ("tenantId" = current_setting('app.current_tenant')::uuid);

CREATE POLICY teacher_tenant_isolation ON "Teacher"
  USING ("tenantId" = current_setting('app.current_tenant')::uuid);

CREATE POLICY class_tenant_isolation ON "Class"
  USING ("tenantId" = current_setting('app.current_tenant')::uuid);

CREATE POLICY enrollment_tenant_isolation ON "Enrollment"
  USING ("tenantId" = current_setting('app.current_tenant')::uuid);

CREATE POLICY attendance_tenant_isolation ON "Attendance"
  USING ("tenantId" = current_setting('app.current_tenant')::uuid);

CREATE POLICY fee_tenant_isolation ON "Fee"
  USING ("tenantId" = current_setting('app.current_tenant')::uuid);

CREATE POLICY payment_tenant_isolation ON "Payment"
  USING ("tenantId" = current_setting('app.current_tenant')::uuid);