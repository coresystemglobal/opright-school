/**
 * Idempotent seed script — safe to run multiple times.
 * Each domain is checked independently; only missing data is created.
 * Run with: npm run seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_SUBDOMAIN = 'greenwood';

async function main() {
  console.log('🌱  Checking seed data for Greenwood Academy...\n');

  // ── 1. Tenant ──────────────────────────────────────────────────────────────
  let tenant = await prisma.tenant.findUnique({ where: { subdomain: DEMO_SUBDOMAIN } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Greenwood Academy',
        subdomain: DEMO_SUBDOMAIN,
        config: {
          country: 'NG',
          schoolType: 'PRIMARY_SECONDARY',
          studentTier: 'GROWING',
          gradingSystem: {
            mode: 'percentage',
            bands: [
              { grade: 'A', min: 70, max: 100 },
              { grade: 'B', min: 60, max: 69 },
              { grade: 'C', min: 50, max: 59 },
              { grade: 'D', min: 45, max: 49 },
              { grade: 'F', min: 0,  max: 44 },
            ],
          },
        },
      },
    });
    console.log(`  ✓ Tenant created: ${tenant.name} (${tenant.id})`);
  } else {
    console.log(`  · Tenant exists:  ${tenant.name} (${tenant.id})`);
  }

  const tid = tenant.id;

  // ── 2. Roles + Permissions ─────────────────────────────────────────────────
  const permDefs = [
    { resource: 'students',  action: 'create' }, { resource: 'students',  action: 'read' },
    { resource: 'students',  action: 'update' }, { resource: 'students',  action: 'delete' },
    { resource: 'teachers',  action: 'create' }, { resource: 'teachers',  action: 'read' },
    { resource: 'teachers',  action: 'update' }, { resource: 'teachers',  action: 'delete' },
    { resource: 'classes',   action: 'create' }, { resource: 'classes',   action: 'read' },
    { resource: 'classes',   action: 'update' }, { resource: 'classes',   action: 'delete' },
    { resource: 'attendance',action: 'create' }, { resource: 'attendance',action: 'read' },
    { resource: 'attendance',action: 'update' },
    { resource: 'fees',      action: 'create' }, { resource: 'fees',      action: 'read' },
    { resource: 'fees',      action: 'update' },
    { resource: 'payments',  action: 'read' },
    { resource: 'roles',     action: 'create' }, { resource: 'roles',     action: 'read' },
    { resource: 'roles',     action: 'update' }, { resource: 'roles',     action: 'delete' },
  ];
  await prisma.permission.createMany({ data: permDefs, skipDuplicates: true });
  const permissions = await prisma.permission.findMany();
  const permMap: Record<string, string> = {};
  permissions.forEach(p => { permMap[`${p.resource}:${p.action}`] = p.id; });

  const existingRoles = await prisma.role.findMany({ where: { tenantId: tid } });
  const roleMap: Record<string, string> = {};
  existingRoles.forEach(r => { roleMap[r.name] = r.id; });

  const roleDefs = [
    { name: 'Admin',     perms: Object.values(permMap) },
    { name: 'Principal', perms: ['students:read','teachers:read','classes:read','attendance:read','fees:read','payments:read','roles:read'].map(k => permMap[k]).filter(Boolean) },
    { name: 'Teacher',   perms: ['students:read','classes:read','attendance:create','attendance:read','attendance:update'].map(k => permMap[k]).filter(Boolean) },
    { name: 'Staff',     perms: ['students:read','classes:read','fees:read','payments:read','attendance:read'].map(k => permMap[k]).filter(Boolean) },
    { name: 'Parent',    perms: [] },
    { name: 'Student',   perms: [] },
  ];

  let rolesCreated = 0;
  for (const r of roleDefs) {
    if (!roleMap[r.name]) {
      const role = await prisma.role.create({
        data: {
          tenantId: tid,
          name: r.name,
          isSystem: true,
          permissions: { create: r.perms.map(pid => ({ permissionId: pid })) },
        },
      });
      roleMap[r.name] = role.id;
      rolesCreated++;
    }
  }
  console.log(`  ${rolesCreated > 0 ? '✓' : '·'} Roles: ${rolesCreated > 0 ? `${rolesCreated} created` : 'all exist'} (${Object.keys(roleMap).join(', ')})`);

  // ── 3. Users ───────────────────────────────────────────────────────────────
  const adminExists = await prisma.user.findFirst({ where: { tenantId: tid, email: 'admin@greenwood.edu' } });
  if (!adminExists) {
    await prisma.user.create({
      data: {
        tenantId: tid, email: 'admin@greenwood.edu',
        password: await bcrypt.hash('Admin@1234', 12),
        firstName: 'Grace', lastName: 'Adeyemi', roleId: roleMap['Admin'],
      },
    });
    console.log('  ✓ Admin user created');
  } else {
    console.log('  · Admin user exists');
  }

  const teacherUserExists = await prisma.user.findFirst({ where: { tenantId: tid, email: 'teacher@greenwood.edu' } });
  if (!teacherUserExists) {
    await prisma.user.create({
      data: {
        tenantId: tid, email: 'teacher@greenwood.edu',
        password: await bcrypt.hash('Teacher@1234', 12),
        firstName: 'Samuel', lastName: 'Okafor', roleId: roleMap['Teacher'],
      },
    });
    console.log('  ✓ Teacher user created');
  } else {
    console.log('  · Teacher user exists');
  }

  // ── 4. Academic year + terms ───────────────────────────────────────────────
  let academicYear = await prisma.academicYear.findFirst({ where: { tenantId: tid, name: '2025/2026' } });
  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: { tenantId: tid, name: '2025/2026', startDate: new Date('2025-09-01'), endDate: new Date('2026-07-31'), isCurrent: true },
    });
    console.log('  ✓ Academic year created: 2025/2026');
  } else {
    console.log('  · Academic year exists: 2025/2026');
  }

  const termDefs = [
    { name: 'Term 1', startDate: new Date('2025-09-01'), endDate: new Date('2025-12-13'), isCurrent: true },
    { name: 'Term 2', startDate: new Date('2026-01-05'), endDate: new Date('2026-03-31'), isCurrent: false },
    { name: 'Term 3', startDate: new Date('2026-04-20'), endDate: new Date('2026-07-31'), isCurrent: false },
  ];
  const existingTerms = await prisma.term.findMany({ where: { tenantId: tid, academicYearId: academicYear.id } });
  const existingTermNames = new Set(existingTerms.map(t => t.name));
  let term1 = existingTerms.find(t => t.name === 'Term 1');
  let termsCreated = 0;
  for (const td of termDefs) {
    if (!existingTermNames.has(td.name)) {
      const t = await prisma.term.create({ data: { tenantId: tid, academicYearId: academicYear.id, ...td } });
      if (td.name === 'Term 1') term1 = t;
      termsCreated++;
    }
  }
  console.log(`  ${termsCreated > 0 ? '✓' : '·'} Terms: ${termsCreated > 0 ? `${termsCreated} created` : 'all exist'}`);

  // ── 5. Classes ─────────────────────────────────────────────────────────────
  const classNames = [
    { name: 'Primary 1', level: 'Primary' },
    { name: 'Primary 3', level: 'Primary' },
    { name: 'JSS 1',     level: 'Junior Secondary' },
    { name: 'SS 1',      level: 'Senior Secondary' },
  ];
  const existingClasses = await prisma.class.findMany({ where: { tenantId: tid } });
  const existingClassNames = new Set(existingClasses.map(c => c.name));
  let classes = [...existingClasses];
  let classesCreated = 0;
  for (const c of classNames) {
    if (!existingClassNames.has(c.name)) {
      classes.push(await prisma.class.create({ data: { tenantId: tid, ...c } }));
      classesCreated++;
    }
  }
  console.log(`  ${classesCreated > 0 ? '✓' : '·'} Classes: ${classesCreated > 0 ? `${classesCreated} created` : 'all exist'}`);

  // ── 6. Teachers ────────────────────────────────────────────────────────────
  const teacherDefs = [
    { firstName: 'Samuel', lastName: 'Okafor', subject: 'Mathematics' },
    { firstName: 'Amaka',  lastName: 'Nwosu',  subject: 'English' },
    { firstName: 'Chidi',  lastName: 'Eze',    subject: 'Science' },
  ];
  const existingTeachers = await prisma.teacher.findMany({ where: { tenantId: tid } });
  const existingTeacherNames = new Set(existingTeachers.map(t => `${t.firstName} ${t.lastName}`));
  let teachers = [...existingTeachers];
  let teachersCreated = 0;
  for (const t of teacherDefs) {
    if (!existingTeacherNames.has(`${t.firstName} ${t.lastName}`)) {
      teachers.push(await prisma.teacher.create({ data: { tenantId: tid, ...t } }));
      teachersCreated++;
    }
  }
  // Ensure teachers array follows seed order for index-based referencing below
  teachers = teacherDefs.map(td => teachers.find(t => t.firstName === td.firstName && t.lastName === td.lastName)!).filter(Boolean);
  console.log(`  ${teachersCreated > 0 ? '✓' : '·'} Teachers: ${teachersCreated > 0 ? `${teachersCreated} created` : 'all exist'}`);

  // ── 7. Students ────────────────────────────────────────────────────────────
  const studentDefs = [
    { firstName: 'Emeka',   lastName: 'Obi',     dob: new Date('2015-03-12'), classIdx: 0 },
    { firstName: 'Fatima',  lastName: 'Bello',   dob: new Date('2015-07-22'), classIdx: 0 },
    { firstName: 'Taiwo',   lastName: 'Adebayo', dob: new Date('2014-11-05'), classIdx: 1 },
    { firstName: 'Ngozi',   lastName: 'Ike',     dob: new Date('2014-02-18'), classIdx: 1 },
    { firstName: 'Adebayo', lastName: 'Ojo',     dob: new Date('2012-08-30'), classIdx: 2 },
    { firstName: 'Zainab',  lastName: 'Musa',    dob: new Date('2012-05-14'), classIdx: 2 },
    { firstName: 'Chisom',  lastName: 'Nkem',    dob: new Date('2010-09-01'), classIdx: 3 },
    { firstName: 'Damilola',lastName: 'Afolabi', dob: new Date('2010-12-25'), classIdx: 3 },
  ];
  const existingStudents = await prisma.student.findMany({ where: { tenantId: tid } });
  const existingStudentNames = new Set(existingStudents.map(s => `${s.firstName} ${s.lastName}`));
  let students = [...existingStudents];
  let studentsCreated = 0;
  for (const s of studentDefs) {
    if (!existingStudentNames.has(`${s.firstName} ${s.lastName}`)) {
      const student = await prisma.student.create({
        data: {
          tenantId: tid,
          firstName: s.firstName, lastName: s.lastName, dob: s.dob,
          guardian: { name: `${s.lastName} Family`, phone: '0803000000' },
        },
      });
      const cls = classes.find(c => c.name === classNames[s.classIdx].name)!;
      await prisma.enrollment.create({ data: { tenantId: tid, studentId: student.id, classId: cls.id } });
      students.push(student);
      studentsCreated++;
    }
  }
  // Re-order to match seed definition order for index-based referencing
  students = studentDefs.map(sd => students.find(s => s.firstName === sd.firstName && s.lastName === sd.lastName)!).filter(Boolean);
  console.log(`  ${studentsCreated > 0 ? '✓' : '·'} Students: ${studentsCreated > 0 ? `${studentsCreated} created` : 'all exist'}`);

  // ── 8. Subjects ────────────────────────────────────────────────────────────
  const subjectTemplates = [
    { className: 'Primary 1', subjects: ['English Studies', 'Mathematics', 'Basic Science'] },
    { className: 'Primary 3', subjects: ['English Studies', 'Mathematics', 'Social Studies'] },
    { className: 'JSS 1',     subjects: ['English Language', 'Mathematics', 'Basic Technology'] },
    { className: 'SS 1',      subjects: ['English Language', 'Mathematics', 'Biology', 'Chemistry'] },
  ];
  let allSubjects = await prisma.subject.findMany({ where: { tenantId: tid, academicYearId: academicYear.id } });
  const existingSubjectCodes = new Set(allSubjects.map(s => s.code));
  let subjectsCreated = 0;
  for (const tmpl of subjectTemplates) {
    const cls = classes.find(c => c.name === tmpl.className)!;
    if (!cls) continue;
    for (let i = 0; i < tmpl.subjects.length; i++) {
      const name = tmpl.subjects[i];
      const code = `${cls.name.replace(/\s+/g, '')}-${name.split(' ').map(w => w[0]).join('')}`.toUpperCase();
      if (!existingSubjectCodes.has(code)) {
        const s = await prisma.subject.create({
          data: { tenantId: tid, academicYearId: academicYear.id, classId: cls.id, teacherId: teachers[i % teachers.length]?.id, name, code },
        });
        allSubjects.push(s);
        subjectsCreated++;
      }
    }
  }
  console.log(`  ${subjectsCreated > 0 ? '✓' : '·'} Subjects: ${subjectsCreated > 0 ? `${subjectsCreated} created` : 'all exist'}`);

  // ── 9. Timetable (JSS 1 sample) ────────────────────────────────────────────
  const jss1 = classes.find(c => c.name === 'JSS 1')!;
  const jss1Subjects = allSubjects.filter(s => s.classId === jss1?.id);
  const timetableCount = jss1 ? await prisma.timetable.count({ where: { tenantId: tid, classId: jss1.id } }) : 1;
  if (jss1 && jss1Subjects.length > 0 && timetableCount === 0) {
    const slots = [
      { subjectIdx: 0, dayOfWeek: 1, startTime: '08:00', endTime: '09:00', room: 'Room A1' },
      { subjectIdx: 1, dayOfWeek: 1, startTime: '09:00', endTime: '10:00', room: 'Room A1' },
      { subjectIdx: 2, dayOfWeek: 2, startTime: '08:00', endTime: '09:00', room: 'Lab 1' },
      { subjectIdx: 0, dayOfWeek: 3, startTime: '08:00', endTime: '09:00', room: 'Room A1' },
      { subjectIdx: 1, dayOfWeek: 4, startTime: '10:00', endTime: '11:00', room: 'Room A2' },
    ];
    await Promise.all(slots.map(slot =>
      prisma.timetable.create({
        data: {
          tenantId: tid, academicYearId: academicYear.id, classId: jss1.id,
          subjectId: jss1Subjects[slot.subjectIdx]?.id ?? jss1Subjects[0].id,
          teacherId: teachers[slot.subjectIdx % teachers.length]?.id ?? teachers[0].id,
          dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime, room: slot.room,
        },
      })
    ));
    console.log('  ✓ Timetable: 5 slots for JSS 1 created');
  } else {
    console.log('  · Timetable: already seeded');
  }

  // ── 10. Attendance (last 5 school days) ────────────────────────────────────
  const jss1Students = students.filter((_, i) => studentDefs[i]?.classIdx === 2);
  const attendanceCount = jss1Students.length > 0
    ? await prisma.attendance.count({ where: { tenantId: tid, studentId: jss1Students[0].id } })
    : 1;
  if (jss1Students.length > 0 && attendanceCount === 0) {
    const today = new Date();
    const days = [-4, -3, -2, -1, 0]
      .map(offset => { const d = new Date(today); d.setDate(d.getDate() + offset); return d; })
      .filter(d => d.getDay() !== 0 && d.getDay() !== 6);
    const statuses: ('PRESENT' | 'ABSENT' | 'LATE')[] = ['PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'ABSENT'];
    await Promise.all(jss1Students.flatMap((student, si) =>
      days.map((date, di) =>
        prisma.attendance.create({ data: { tenantId: tid, studentId: student.id, date, status: statuses[(si + di) % statuses.length] } })
      )
    ));
    console.log(`  ✓ Attendance: ${days.length} days × ${jss1Students.length} JSS 1 students created`);
  } else {
    console.log('  · Attendance: already seeded');
  }

  // ── 11. Assignments + Grades ───────────────────────────────────────────────
  const mathSubject = allSubjects.find(s => s.classId === jss1?.id && s.name === 'Mathematics');
  const assignmentCount = mathSubject ? await prisma.assignment.count({ where: { tenantId: tid, subjectId: mathSubject.id } }) : 1;
  if (mathSubject && term1 && assignmentCount === 0) {
    const assignment = await prisma.assignment.create({
      data: {
        tenantId: tid, academicYearId: academicYear.id, termId: term1.id,
        subjectId: mathSubject.id, title: 'Mid-Term Mathematics Test', maxScore: 100, weight: 1.0,
        dueDate: new Date('2025-10-20'),
      },
    });
    await Promise.all(jss1Students.map((student, i) =>
      prisma.grade.create({ data: { tenantId: tid, studentId: student.id, subjectId: mathSubject.id, assignmentId: assignment.id, score: 55 + i * 10, maxScore: 100 } })
    ));
    console.log('  ✓ Grades: mid-term test scores created');
  } else {
    console.log('  · Grades: already seeded');
  }

  // ── 12. Fee + Payment ──────────────────────────────────────────────────────
  const feeCount = await prisma.fee.count({ where: { tenantId: tid } });
  if (feeCount === 0 && jss1Students.length > 0) {
    const fee = await prisma.fee.create({
      data: { tenantId: tid, name: 'Term 1 School Fee', amount: 45000, dueDate: new Date('2025-10-01') },
    });
    await prisma.payment.create({
      data: { tenantId: tid, feeId: fee.id, studentId: jss1Students[0].id, amount: 45000, method: 'Bank Transfer', status: 'SUCCESS' },
    });
    console.log('  ✓ Fee + payment created');
  } else {
    console.log('  · Fees: already seeded');
  }

  // ── 13. Events ────────────────────────────────────────────────────────────
  const eventCount = await prisma.event.count({ where: { tenantId: tid } });
  if (eventCount === 0) {
    const eventData = [
      { title: 'Inter-house Sports Day 2026', type: 'Sports', startDate: new Date('2026-04-17T13:00:00'), endDate: new Date('2026-04-18T18:00:00'), venue: 'School Field', description: 'An outdoor activity day for fun and exercise across all houses.' },
      { title: 'Annual Cultural Festival', type: 'Cultural', startDate: new Date('2026-05-10T09:00:00'), endDate: new Date('2026-05-10T17:00:00'), venue: 'Assembly Hall', description: 'Showcasing the diverse cultures and traditions of our students.' },
      { title: 'Mathematics Olympiad', type: 'Academic', startDate: new Date('2026-05-22T08:00:00'), endDate: new Date('2026-05-22T12:00:00'), venue: 'Exam Hall', description: 'School-wide mathematics competition for all secondary classes.' },
      { title: 'PTA Meeting – Term 3', type: 'Meeting', startDate: new Date('2026-04-25T10:00:00'), venue: 'Conference Room', description: 'Parent-Teacher Association meeting to review Term 3 progress.' },
    ];
    await Promise.all(eventData.map(e => prisma.event.create({ data: { tenantId: tid, ...e } })));
    console.log(`  ✓ Events: ${eventData.length} created`);
  } else {
    console.log(`  · Events: ${eventCount} already exist`);
  }

  console.log(`
✅  Seed complete!

  School:   Greenwood Academy
  Code:     ${DEMO_SUBDOMAIN}
  Admin:    admin@greenwood.edu  /  Admin@1234
  Teacher:  teacher@greenwood.edu  /  Teacher@1234

  Login at: http://localhost:5173
  Use school code: ${DEMO_SUBDOMAIN}
`);
}

main()
  .catch(e => { console.error('❌  Seed failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
