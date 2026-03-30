import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '../prisma/client';
import { seedDefaultRoles } from '../utils/seedRoles';

type DbClient = Prisma.TransactionClient | PrismaClient;
type SchoolType = 'PRIMARY' | 'SECONDARY' | 'PRIMARY_SECONDARY';

type CreateSchoolInput = {
  schoolName: string;
  schoolCode: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  schoolType: SchoolType;
  studentTier: 'STARTER' | 'GROWING' | 'STANDARD' | 'LARGE' | 'MEGA';
};

type ClassTemplate = {
  name: string;
  level: string;
};

const schoolClassTemplates: Record<SchoolType, ClassTemplate[]> = {
  PRIMARY: [
    { name: 'Primary 1', level: 'Primary' },
    { name: 'Primary 2', level: 'Primary' },
    { name: 'Primary 3', level: 'Primary' },
    { name: 'Primary 4', level: 'Primary' },
    { name: 'Primary 5', level: 'Primary' },
    { name: 'Primary 6', level: 'Primary' },
  ],
  SECONDARY: [
    { name: 'JSS 1', level: 'Junior Secondary' },
    { name: 'JSS 2', level: 'Junior Secondary' },
    { name: 'JSS 3', level: 'Junior Secondary' },
    { name: 'SS 1', level: 'Senior Secondary' },
    { name: 'SS 2', level: 'Senior Secondary' },
    { name: 'SS 3', level: 'Senior Secondary' },
  ],
  PRIMARY_SECONDARY: [
    { name: 'Primary 1', level: 'Primary' },
    { name: 'Primary 2', level: 'Primary' },
    { name: 'Primary 3', level: 'Primary' },
    { name: 'Primary 4', level: 'Primary' },
    { name: 'Primary 5', level: 'Primary' },
    { name: 'Primary 6', level: 'Primary' },
    { name: 'JSS 1', level: 'Junior Secondary' },
    { name: 'JSS 2', level: 'Junior Secondary' },
    { name: 'JSS 3', level: 'Junior Secondary' },
    { name: 'SS 1', level: 'Senior Secondary' },
    { name: 'SS 2', level: 'Senior Secondary' },
    { name: 'SS 3', level: 'Senior Secondary' },
  ],
};

const subjectTemplates: Record<string, string[]> = {
  Primary: [
    'English Studies',
    'Mathematics',
    'Basic Science',
    'Social Studies',
    'Civic Education',
  ],
  'Junior Secondary': [
    'English Language',
    'Mathematics',
    'Basic Science',
    'Basic Technology',
    'Social Studies',
    'Civic Education',
  ],
  'Senior Secondary': [
    'English Language',
    'Mathematics',
    'Biology',
    'Chemistry',
    'Physics',
    'Economics',
    'Government',
  ],
};

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? 'Admin',
    lastName: parts.slice(1).join(' ') || parts[0] || 'User',
  };
}

function buildAcademicCalendar(now = new Date()) {
  const month = now.getMonth();
  const currentYear = now.getFullYear();
  const startYear = month >= 7 ? currentYear : currentYear - 1;
  const academicYearName = `${startYear}/${startYear + 1}`;

  const terms = [
    {
      name: 'Term 1',
      startDate: new Date(startYear, 8, 1),
      endDate: new Date(startYear, 11, 13),
    },
    {
      name: 'Term 2',
      startDate: new Date(startYear + 1, 0, 5),
      endDate: new Date(startYear + 1, 2, 31),
    },
    {
      name: 'Term 3',
      startDate: new Date(startYear + 1, 3, 20),
      endDate: new Date(startYear + 1, 6, 31),
    },
  ];

  let currentTermName = 'Term 1';
  if (now >= terms[1].startDate && now <= terms[1].endDate) {
    currentTermName = 'Term 2';
  } else if (now >= terms[2].startDate) {
    currentTermName = 'Term 3';
  }

  return {
    academicYearName,
    startDate: terms[0].startDate,
    endDate: terms[2].endDate,
    currentTermName,
    terms,
  };
}

function buildSubjectCode(className: string, subjectName: string) {
  const classCode = className.replace(/\s+/g, '').toUpperCase();
  const subjectCode = subjectName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return `${classCode}-${subjectCode}`;
}

async function seedSchoolDefaults(db: DbClient, tenantId: string, schoolType: SchoolType) {
  const calendar = buildAcademicCalendar();

  const academicYear = await db.academicYear.create({
    data: {
      tenantId,
      name: calendar.academicYearName,
      startDate: calendar.startDate,
      endDate: calendar.endDate,
      isCurrent: true,
    },
  });

  const terms = await Promise.all(
    calendar.terms.map((term) =>
      db.term.create({
        data: {
          tenantId,
          academicYearId: academicYear.id,
          name: term.name,
          startDate: term.startDate,
          endDate: term.endDate,
          isCurrent: term.name === calendar.currentTermName,
        },
      })
    )
  );

  const classes = await Promise.all(
    schoolClassTemplates[schoolType].map((classTemplate) =>
      db.class.create({
        data: {
          tenantId,
          name: classTemplate.name,
          level: classTemplate.level,
        },
      })
    )
  );

  let subjectCount = 0;
  for (const classItem of classes) {
    const templates = subjectTemplates[classItem.level ?? 'Primary'] ?? subjectTemplates.Primary;
    await Promise.all(
      templates.map((subjectName) =>
        db.subject.create({
          data: {
            tenantId,
            academicYearId: academicYear.id,
            classId: classItem.id,
            name: subjectName,
            code: buildSubjectCode(classItem.name, subjectName),
          },
        })
      )
    );
    subjectCount += templates.length;
  }

  return {
    academicYear,
    currentTerm: terms.find((term) => term.isCurrent) ?? terms[0],
    classesCreated: classes.length,
    subjectsCreated: subjectCount,
  };
}

export class TenantService {
  static async createTenant(data: {
    name: string;
    subdomain: string;
    adminEmail: string;
    adminPassword: string;
    adminName: string;
  }) {
    const hashedPassword = await bcrypt.hash(data.adminPassword, 12);
    
    return prisma.tenant.create({
      data: {
        name: data.name,
        subdomain: data.subdomain,
        users: {
          create: {
            email: data.adminEmail,
            password: hashedPassword,
            firstName: data.adminName.split(' ')[0],
            lastName: data.adminName.split(' ').slice(1).join(' ') || data.adminName.split(' ')[0]
          }
        }
      },
      include: {
        users: {
          select: { id: true, email: true, firstName: true, lastName: true }
        }
      }
    });
  }

  static async createSchool(data: CreateSchoolInput) {
    const hashedPassword = await bcrypt.hash(data.adminPassword, 12);
    const { firstName, lastName } = splitName(data.adminName);

    return prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.schoolName,
          subdomain: data.schoolCode,
          config: {
            country: 'NG',
            schoolType: data.schoolType,
            studentTier: data.studentTier,
            mobileFirst: true,
            trialDays: 30,
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            gradingSystem: {
              mode: 'percentage',
              bands: [
                { grade: 'A', min: 70, max: 100 },
                { grade: 'B', min: 60, max: 69 },
                { grade: 'C', min: 50, max: 59 },
                { grade: 'D', min: 45, max: 49 },
                { grade: 'E', min: 40, max: 44 },
                { grade: 'F', min: 0, max: 39 },
              ],
            },
          },
        },
      });

      const roles = await seedDefaultRoles(tenant.id, tx);
      const adminRole = roles.find((role) => role.name === 'Admin');

      if (!adminRole) {
        throw new Error('Admin role could not be created');
      }

      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: data.adminEmail,
          password: hashedPassword,
          firstName,
          lastName,
          roleId: adminRole.id,
        },
        include: {
          role: true,
        },
      });

      const setup = await seedSchoolDefaults(tx, tenant.id, data.schoolType);

      return {
        tenant,
        adminUser,
        setup,
      };
    });
  }

  static async getTenant(subdomain: string) {
    return prisma.tenant.findUnique({
      where: { subdomain },
      include: {
        users: {
          select: { id: true, email: true, firstName: true, lastName: true }
        }
      }
    });
  }
}
