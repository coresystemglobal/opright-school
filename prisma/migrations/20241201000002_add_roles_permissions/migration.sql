-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "Role_tenantId_name_key" ON "Role"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Role_tenantId_idx" ON "Role"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_resource_action_key" ON "Permission"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- Add roleId column to User table
ALTER TABLE "User" ADD COLUMN "roleId" UUID;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default permissions
INSERT INTO "Permission" ("id", "resource", "action", "description") VALUES
(gen_random_uuid(), 'students', 'create', 'Create new students'),
(gen_random_uuid(), 'students', 'read', 'View student information'),
(gen_random_uuid(), 'students', 'update', 'Update student information'),
(gen_random_uuid(), 'students', 'delete', 'Delete students'),
(gen_random_uuid(), 'teachers', 'create', 'Create new teachers'),
(gen_random_uuid(), 'teachers', 'read', 'View teacher information'),
(gen_random_uuid(), 'teachers', 'update', 'Update teacher information'),
(gen_random_uuid(), 'teachers', 'delete', 'Delete teachers'),
(gen_random_uuid(), 'classes', 'create', 'Create new classes'),
(gen_random_uuid(), 'classes', 'read', 'View class information'),
(gen_random_uuid(), 'classes', 'update', 'Update class information'),
(gen_random_uuid(), 'classes', 'delete', 'Delete classes'),
(gen_random_uuid(), 'attendance', 'create', 'Mark attendance'),
(gen_random_uuid(), 'attendance', 'read', 'View attendance records'),
(gen_random_uuid(), 'attendance', 'update', 'Update attendance records'),
(gen_random_uuid(), 'fees', 'create', 'Create fee structures'),
(gen_random_uuid(), 'fees', 'read', 'View fee information'),
(gen_random_uuid(), 'fees', 'update', 'Update fee structures'),
(gen_random_uuid(), 'payments', 'read', 'View payment records'),
(gen_random_uuid(), 'roles', 'create', 'Create new roles'),
(gen_random_uuid(), 'roles', 'read', 'View roles'),
(gen_random_uuid(), 'roles', 'update', 'Update roles'),
(gen_random_uuid(), 'roles', 'delete', 'Delete roles');