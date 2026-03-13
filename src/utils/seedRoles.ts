import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedDefaultRoles(tenantId: string) {
  // Get all permissions
  const permissions = await prisma.permission.findMany();
  
  const permissionMap = permissions.reduce((acc, p) => {
    const key = `${p.resource}:${p.action}`;
    acc[key] = p.id;
    return acc;
  }, {} as Record<string, string>);

  // Create default roles
  const roles = [
    {
      name: 'Admin',
      description: 'Full system access',
      permissions: Object.values(permissionMap) // All permissions
    },
    {
      name: 'Principal',
      description: 'School management access',
      permissions: [
        permissionMap['students:read'],
        permissionMap['students:update'],
        permissionMap['teachers:read'],
        permissionMap['teachers:create'],
        permissionMap['teachers:update'],
        permissionMap['classes:read'],
        permissionMap['classes:create'],
        permissionMap['classes:update'],
        permissionMap['attendance:read'],
        permissionMap['fees:read'],
        permissionMap['fees:create'],
        permissionMap['fees:update'],
        permissionMap['payments:read'],
        permissionMap['roles:read']
      ].filter(Boolean)
    },
    {
      name: 'Teacher',
      description: 'Teaching and class management',
      permissions: [
        permissionMap['students:read'],
        permissionMap['classes:read'],
        permissionMap['attendance:create'],
        permissionMap['attendance:read'],
        permissionMap['attendance:update']
      ].filter(Boolean)
    }
  ];

  for (const roleData of roles) {
    await prisma.role.create({
      data: {
        tenantId,
        name: roleData.name,
        description: roleData.description,
        isSystem: true,
        permissions: {
          create: roleData.permissions.map(permissionId => ({ permissionId }))
        }
      }
    });
  }
}