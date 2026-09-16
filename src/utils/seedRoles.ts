import { Prisma, PrismaClient } from '@prisma/client';
import { RESOURCES, ACTIONS } from './permissions';

const prisma = new PrismaClient();

type DbClient = Prisma.TransactionClient | PrismaClient;

// Full permission catalogue: every resource × every action. Admin is granted
// all of these; other roles cherry-pick from the same map. Generating it from
// RESOURCES keeps new domains (gradebook, subjects, timetables, …) covered
// automatically instead of silently 403-ing.
const ALL_ACTIONS = Object.values(ACTIONS);
const defaultPermissions = Object.values(RESOURCES).flatMap((resource) =>
  ALL_ACTIONS.map((action) => ({
    resource,
    action,
    description: `${action[0].toUpperCase() + action.slice(1)} ${resource}`,
  })),
);

// Additive: create any permissions that don't exist yet, so installs seeded
// before a resource was added still gain it (Permission is global, un-scoped).
export async function ensureDefaultPermissions(db: DbClient) {
  const existing = await db.permission.findMany();
  const have = new Set(existing.map((p) => `${p.resource}:${p.action}`));
  const missing = defaultPermissions.filter((p) => !have.has(`${p.resource}:${p.action}`));
  if (missing.length > 0) {
    await db.permission.createMany({ data: missing, skipDuplicates: true });
  }
  return db.permission.findMany();
}

export async function seedDefaultRoles(tenantId: string, db: DbClient = prisma) {
  const permissions = await ensureDefaultPermissions(db);

  const permissionMap = permissions.reduce((acc, p) => {
    acc[`${p.resource}:${p.action}`] = p.id;
    return acc;
  }, {} as Record<string, string>);
  const pick = (...keys: string[]) => keys.map((k) => permissionMap[k]).filter(Boolean);

  // Academic domains a teacher operates in day to day.
  const teacherAcademic = pick(
    'gradebook:create', 'gradebook:read', 'gradebook:update',
    'subjects:read', 'timetables:read', 'academicYears:read', 'terms:read',
    'courses:read', 'courses:create', 'courses:update', 'elearning:read',
    'events:read',
  );

  const roles = [
    {
      name: 'Admin',
      description: 'Full system access',
      permissions: Object.values(permissionMap), // every permission
    },
    {
      name: 'Principal',
      description: 'School management access',
      permissions: pick(
        'students:read', 'students:update',
        'teachers:read', 'teachers:create', 'teachers:update',
        'classes:read', 'classes:create', 'classes:update',
        'attendance:read',
        'fees:read', 'fees:create', 'fees:update', 'payments:read',
        'gradebook:read', 'subjects:read', 'timetables:read',
        'academicYears:read', 'academicYears:create', 'academicYears:update',
        'terms:read', 'disciplinary:read',
        'roles:read',
      ),
    },
    {
      name: 'Teacher',
      description: 'Teaching and class management',
      permissions: [
        ...pick('students:read', 'classes:read', 'attendance:create', 'attendance:read', 'attendance:update'),
        ...teacherAcademic,
      ],
    },
    {
      name: 'Staff',
      description: 'Operational support access',
      permissions: pick(
        'students:read', 'classes:read', 'fees:read', 'payments:read', 'attendance:read',
        'library:read', 'transport:read', 'hostel:read', 'inventory:read', 'health:read',
      ),
    },
    { name: 'Parent', description: 'Parent portal access', permissions: [] },
    { name: 'Student', description: 'Student portal access', permissions: [] },
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
          create: roleData.permissions.map((permissionId) => ({ permissionId })),
        },
      },
    });
    createdRoles.push(role);
  }

  return createdRoles;
}
