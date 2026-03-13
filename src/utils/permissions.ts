import prisma from '../prisma/client';

export async function hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      }
    }
  });

  if (!user?.role) return false;

  return user.role.permissions.some(rp => 
    rp.permission.resource === resource && rp.permission.action === action
  );
}

export const RESOURCES = {
  STUDENTS: 'students',
  TEACHERS: 'teachers', 
  CLASSES: 'classes',
  ATTENDANCE: 'attendance',
  FEES: 'fees',
  PAYMENTS: 'payments',
  ROLES: 'roles'
} as const;

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete'
} as const;