import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type DbClient = Prisma.TransactionClient | PrismaClient;

const defaultPermissions = [
  { resource: 'students', action: 'create', description: 'Create new students' },
  { resource: 'students', action: 'read', description: 'View student information' },
  { resource: 'students', action: 'update', description: 'Update student information' },
  { resource: 'students', action: 'delete', description: 'Delete students' },
  { resource: 'teachers', action: 'create', description: 'Create new teachers' },
  { resource: 'teachers', action: 'read', description: 'View teacher information' },
  { resource: 'teachers', action: 'update', description: 'Update teacher information' },
  { resource: 'teachers', action: 'delete', description: 'Delete teachers' },
  { resource: 'classes', action: 'create', description: 'Create new classes' },
  { resource: 'classes', action: 'read', description: 'View class information' },
  { resource: 'classes', action: 'update', description: 'Update class information' },
  { resource: 'classes', action: 'delete', description: 'Delete classes' },
  { resource: 'attendance', action: 'create', description: 'Mark attendance' },
  { resource: 'attendance', action: 'read', description: 'View attendance records' },
  { resource: 'attendance', action: 'update', description: 'Update attendance records' },
  { resource: 'fees', action: 'create', description: 'Create fee structures' },
  { resource: 'fees', action: 'read', description: 'View fee information' },
  { resource: 'fees', action: 'update', description: 'Update fee structures' },
  { resource: 'payments', action: 'read', description: 'View payment records' },
  { resource: 'roles', action: 'create', description: 'Create new roles' },
  { resource: 'roles', action: 'read', description: 'View roles' },
  { resource: 'roles', action: 'update', description: 'Update roles' },
  { resource: 'roles', action: 'delete', description: 'Delete roles' },
  { resource: 'academicYears', action: 'create', description: 'Create academic years' },
  { resource: 'academicYears', action: 'read', description: 'View academic years' },
  { resource: 'academicYears', action: 'update', description: 'Update academic years' },
  { resource: 'academicYears', action: 'delete', description: 'Delete academic years' },
  { resource: 'terms', action: 'create', description: 'Create terms' },
  { resource: 'terms', action: 'read', description: 'View terms' },
  { resource: 'terms', action: 'update', description: 'Update terms' },
  { resource: 'terms', action: 'delete', description: 'Delete terms' },
  { resource: 'subjects', action: 'create', description: 'Create subjects' },
  { resource: 'subjects', action: 'read', description: 'View subjects' },
  { resource: 'subjects', action: 'update', description: 'Update subjects' },
  { resource: 'subjects', action: 'delete', description: 'Delete subjects' },
  { resource: 'timetables', action: 'create', description: 'Create timetable entries' },
  { resource: 'timetables', action: 'read', description: 'View timetables' },
  { resource: 'timetables', action: 'update', description: 'Update timetable entries' },
  { resource: 'timetables', action: 'delete', description: 'Delete timetable entries' },
  { resource: 'gradebook', action: 'create', description: 'Record grades' },
  { resource: 'gradebook', action: 'read', description: 'View grades' },
  { resource: 'gradebook', action: 'update', description: 'Update grades' },
  { resource: 'settings', action: 'read', description: 'View school settings' },
  { resource: 'settings', action: 'update', description: 'Update school settings' },
];

async function ensureDefaultPermissions(db: DbClient) {
  const existing = await db.permission.findMany();
  if (existing.length > 0) {
    return existing;
  }

  await db.permission.createMany({
    data: defaultPermissions,
  });

  return db.permission.findMany();
}

export async function seedDefaultRoles(tenantId: string, db: DbClient = prisma) {
  const permissions = await ensureDefaultPermissions(db);
  
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
        permissionMap['roles:read'],
        permissionMap['academicYears:read'],
        permissionMap['academicYears:create'],
        permissionMap['academicYears:update'],
        permissionMap['terms:read'],
        permissionMap['terms:create'],
        permissionMap['terms:update'],
        permissionMap['subjects:read'],
        permissionMap['subjects:create'],
        permissionMap['timetables:read'],
        permissionMap['timetables:create'],
        permissionMap['timetables:update'],
        permissionMap['gradebook:read'],
        permissionMap['settings:read'],
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
        permissionMap['attendance:update'],
        permissionMap['subjects:read'],
        permissionMap['timetables:read'],
        permissionMap['gradebook:create'],
        permissionMap['gradebook:read'],
        permissionMap['gradebook:update'],
        permissionMap['academicYears:read'],
        permissionMap['terms:read'],
      ].filter(Boolean)
    },
    {
      name: 'Staff',
      description: 'Operational support access',
      permissions: [
        permissionMap['students:read'],
        permissionMap['classes:read'],
        permissionMap['fees:read'],
        permissionMap['payments:read'],
        permissionMap['attendance:read']
      ].filter(Boolean)
    },
    {
      name: 'Parent',
      description: 'Parent portal access',
      permissions: []
    },
    {
      name: 'Student',
      description: 'Student portal access',
      permissions: []
    }
  ];

  const createdRoles = [];
  for (const roleData of roles) {
    const role = await db.role.create({
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
    createdRoles.push(role);
  }

  return createdRoles;
}
