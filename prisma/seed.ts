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
        schoolCode: 'GWD',
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
    // Patch schoolCode on existing tenant if missing (cast needed until prisma generate runs)
    if (!(tenant as any).schoolCode) {
      tenant = await prisma.tenant.update({ where: { id: tenant.id }, data: { schoolCode: 'GWD' } as any });
      console.log('  ✓ Patched schoolCode → GWD on existing tenant');
    }
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
    { resource: 'roles',        action: 'create' }, { resource: 'roles',        action: 'read' },
    { resource: 'roles',        action: 'update' }, { resource: 'roles',        action: 'delete' },
    { resource: 'academicYears',action: 'create' }, { resource: 'academicYears',action: 'read' },
    { resource: 'academicYears',action: 'update' }, { resource: 'academicYears',action: 'delete' },
    { resource: 'terms',        action: 'create' }, { resource: 'terms',        action: 'read' },
    { resource: 'terms',        action: 'update' }, { resource: 'terms',        action: 'delete' },
    { resource: 'subjects',     action: 'create' }, { resource: 'subjects',     action: 'read' },
    { resource: 'subjects',     action: 'update' }, { resource: 'subjects',     action: 'delete' },
    { resource: 'timetables',   action: 'create' }, { resource: 'timetables',   action: 'read' },
    { resource: 'timetables',   action: 'update' }, { resource: 'timetables',   action: 'delete' },
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
    { name: 'Principal', perms: ['students:read','teachers:read','classes:read','attendance:read','fees:read','payments:read','roles:read','academicYears:read','terms:read','subjects:read','timetables:read'].map(k => permMap[k]).filter(Boolean) },
    { name: 'Teacher',   perms: ['students:read','classes:read','attendance:create','attendance:read','attendance:update','subjects:read','timetables:read'].map(k => permMap[k]).filter(Boolean) },
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

  // Parent user — email matches guardian.email on Emeka Obi's student record
  const parentUserExists = await prisma.user.findFirst({ where: { tenantId: tid, email: 'parent@greenwood.edu' } });
  if (!parentUserExists) {
    await prisma.user.create({
      data: {
        tenantId: tid, email: 'parent@greenwood.edu',
        password: await bcrypt.hash('Parent@1234', 12),
        firstName: 'Funke', lastName: 'Obi', roleId: roleMap['Parent'],
      },
    });
    console.log('  ✓ Parent user created  (parent@greenwood.edu / Parent@1234)');
  } else {
    console.log('  · Parent user exists');
  }

  // Student portal user — Chisom Nkem (SS 1) with login access
  const studentUserExists = await prisma.user.findFirst({ where: { tenantId: tid, email: 'student@greenwood.edu' } });
  if (!studentUserExists) {
    await prisma.user.create({
      data: {
        tenantId: tid, email: 'student@greenwood.edu',
        password: await bcrypt.hash('Student@1234', 12),
        firstName: 'Chisom', lastName: 'Nkem', roleId: roleMap['Student'],
      },
    });
    console.log('  ✓ Student user created (student@greenwood.edu / Student@1234)');
  } else {
    console.log('  · Student user exists');
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
  // Emeka Obi's guardian email matches the parent user account for portal linking
  const studentDefs = [
    { firstName: 'Emeka',   lastName: 'Obi',     dob: new Date('2015-03-12'), classIdx: 0, guardianEmail: 'parent@greenwood.edu' },
    { firstName: 'Fatima',  lastName: 'Bello',   dob: new Date('2015-07-22'), classIdx: 0, guardianEmail: null },
    { firstName: 'Taiwo',   lastName: 'Adebayo', dob: new Date('2014-11-05'), classIdx: 1, guardianEmail: null },
    { firstName: 'Ngozi',   lastName: 'Ike',     dob: new Date('2014-02-18'), classIdx: 1, guardianEmail: null },
    { firstName: 'Adebayo', lastName: 'Ojo',     dob: new Date('2012-08-30'), classIdx: 2, guardianEmail: null },
    { firstName: 'Zainab',  lastName: 'Musa',    dob: new Date('2012-05-14'), classIdx: 2, guardianEmail: null },
    { firstName: 'Chisom',  lastName: 'Nkem',    dob: new Date('2010-09-01'), classIdx: 3, guardianEmail: null },
    { firstName: 'Damilola',lastName: 'Afolabi', dob: new Date('2010-12-25'), classIdx: 3, guardianEmail: null },
  ];
  const existingStudents = await prisma.student.findMany({ where: { tenantId: tid } });
  const existingStudentNames = new Set(existingStudents.map(s => `${s.firstName} ${s.lastName}`));
  let students = [...existingStudents];
  let studentsCreated = 0;
  for (const s of studentDefs) {
    if (!existingStudentNames.has(`${s.firstName} ${s.lastName}`)) {
      const guardianData: Record<string, string> = { name: `${s.lastName} Family`, phone: '0803000000' };
      if (s.guardianEmail) guardianData.email = s.guardianEmail;
      const student = await prisma.student.create({
        data: {
          tenantId: tid,
          firstName: s.firstName, lastName: s.lastName, dob: s.dob,
          guardian: guardianData,
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

  // Ensure Emeka Obi has guardian.email set (handles existing records that predate this field)
  const emekaObi = students.find(s => s.firstName === 'Emeka' && s.lastName === 'Obi');
  if (emekaObi) {
    const guardian = (emekaObi.guardian as Record<string, string> | null) ?? {};
    if (!guardian.email) {
      await prisma.student.update({
        where: { id: emekaObi.id },
        data: { guardian: { ...guardian, email: 'parent@greenwood.edu' } },
      });
      console.log('  ✓ Patched guardian.email on Emeka Obi → parent@greenwood.edu');
    }
  }

  // ── 7b. Parent model record for Funke Obi ─────────────────────────────────
  const parentUser = await prisma.user.findFirst({ where: { tenantId: tid, email: 'parent@greenwood.edu' } });
  const emekaObiStudent = students.find(s => s.firstName === 'Emeka' && s.lastName === 'Obi');
  if (parentUser && emekaObiStudent) {
    const parentRecordExists = await (prisma as any).parent.findFirst({ where: { userId: parentUser.id } });
    if (!parentRecordExists) {
      await (prisma as any).parent.create({
        data: {
          tenantId: tid,
          userId: parentUser.id,
          firstName: 'Funke',
          lastName: 'Obi',
          email: 'parent@greenwood.edu',
          phone: '0803000001',
          students: { create: [{ studentId: emekaObiStudent.id }] },
        },
      });
      console.log('  ✓ Parent record created for Funke Obi → linked to Emeka Obi');
    } else {
      console.log('  · Parent record exists for Funke Obi');
    }
  }

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

  // ── 12b. Emeka Obi (Primary 1) — data for the parent portal demo ──────────
  const emekaForPortal = students.find(s => s.firstName === 'Emeka' && s.lastName === 'Obi');
  const primary1 = classes.find(c => c.name === 'Primary 1')!;
  const primary1MathSubject = allSubjects.find(s => s.classId === primary1?.id && s.name === 'Mathematics');

  if (emekaForPortal) {
    // Attendance — last 10 school days
    const emekaAttendanceCount = await prisma.attendance.count({ where: { tenantId: tid, studentId: emekaForPortal.id } });
    if (emekaAttendanceCount === 0) {
      const emekaStatuses: ('PRESENT' | 'ABSENT' | 'LATE')[] = ['PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'PRESENT', 'PRESENT', 'ABSENT', 'PRESENT', 'PRESENT', 'PRESENT'];
      const today = new Date();
      const schoolDays: Date[] = [];
      for (let offset = -14; schoolDays.length < 10; offset++) {
        const d = new Date(today);
        d.setDate(d.getDate() + offset);
        if (d.getDay() !== 0 && d.getDay() !== 6) schoolDays.push(d);
      }
      await Promise.all(schoolDays.map((date, i) =>
        prisma.attendance.create({ data: { tenantId: tid, studentId: emekaForPortal.id, date, status: emekaStatuses[i % emekaStatuses.length] } })
      ));
      console.log('  ✓ Emeka Obi: 10 attendance records created');
    } else {
      console.log('  · Emeka Obi: attendance already seeded');
    }

    // Grades — English and Mathematics for Primary 1
    const emekaGradeCount = await prisma.grade.count({ where: { tenantId: tid, studentId: emekaForPortal.id } });
    if (emekaGradeCount === 0 && primary1MathSubject && term1) {
      const mathAssignment = await prisma.assignment.create({
        data: {
          tenantId: tid, academicYearId: academicYear.id, termId: term1.id,
          subjectId: primary1MathSubject.id, title: 'Term 1 Mathematics Test', maxScore: 100, weight: 1.0,
          dueDate: new Date('2025-10-15'),
        },
      });
      await prisma.grade.create({
        data: { tenantId: tid, studentId: emekaForPortal.id, subjectId: primary1MathSubject.id, assignmentId: mathAssignment.id, score: 78, maxScore: 100 },
      });
      const englishSubject = allSubjects.find(s => s.classId === primary1?.id && s.name.includes('English'));
      if (englishSubject) {
        const engAssignment = await prisma.assignment.create({
          data: {
            tenantId: tid, academicYearId: academicYear.id, termId: term1.id,
            subjectId: englishSubject.id, title: 'Term 1 English Test', maxScore: 100, weight: 1.0,
            dueDate: new Date('2025-10-18'),
          },
        });
        await prisma.grade.create({
          data: { tenantId: tid, studentId: emekaForPortal.id, subjectId: englishSubject.id, assignmentId: engAssignment.id, score: 85, maxScore: 100 },
        });
      }
      console.log('  ✓ Emeka Obi: grade records created (Maths 78/100, English 85/100)');
    } else {
      console.log('  · Emeka Obi: grades already seeded');
    }

    // Payment — primary school fee
    const emekaPaymentCount = await prisma.payment.count({ where: { tenantId: tid, studentId: emekaForPortal.id } });
    if (emekaPaymentCount === 0) {
      let primaryFee = await prisma.fee.findFirst({ where: { tenantId: tid, name: 'Primary Term 1 School Fee' } });
      if (!primaryFee) {
        primaryFee = await prisma.fee.create({
          data: { tenantId: tid, name: 'Primary Term 1 School Fee', amount: 25000, dueDate: new Date('2025-10-01') },
        });
      }
      await prisma.payment.create({
        data: { tenantId: tid, feeId: primaryFee.id, studentId: emekaForPortal.id, amount: 25000, method: 'Bank Transfer', status: 'SUCCESS' },
      });
      console.log('  ✓ Emeka Obi: fee payment created (₦25,000)');
    } else {
      console.log('  · Emeka Obi: payment already seeded');
    }
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

  // ── 14. Library (books + a borrow transaction) ────────────────────────────
  const bookCount = await prisma.book.count({ where: { tenantId: tid } });
  if (bookCount === 0) {
    const bookDefs = [
      { title: 'Mathematics for JSS', author: 'A. Okafor', isbn: '978-000-001', genre: 'Textbook', totalCopies: 5, available: 4 },
      { title: 'English Grammar in Use', author: 'R. Murphy', isbn: '978-000-002', genre: 'Textbook', totalCopies: 8, available: 7 },
      { title: 'Basic Science & Technology', author: 'C. Eze', isbn: '978-000-003', genre: 'Textbook', totalCopies: 6, available: 6 },
      { title: 'Things Fall Apart', author: 'Chinua Achebe', isbn: '978-000-004', genre: 'Fiction', totalCopies: 4, available: 3 },
      { title: 'The Lion and the Jewel', author: 'Wole Soyinka', isbn: '978-000-005', genre: 'Drama', totalCopies: 3, available: 3 },
      { title: 'Chemistry for SS1', author: 'P. Nwosu', isbn: '978-000-006', genre: 'Textbook', totalCopies: 5, available: 5 },
    ];
    const books = await Promise.all(bookDefs.map(b => prisma.book.create({ data: { tenantId: tid, ...b } })));
    // One borrowed book for the first JSS 1 student
    if (students[4]) {
      const due = new Date(); due.setDate(due.getDate() + 14);
      await prisma.bookTransaction.create({
        data: { tenantId: tid, bookId: books[0].id, borrowerId: students[4].id, borrowerType: 'STUDENT', dueDate: due, status: 'BORROWED' },
      });
      await prisma.book.update({ where: { id: books[0].id }, data: { available: 3 } });
    }
    console.log(`  ✓ Library: ${books.length} books, 1 borrow transaction`);
  } else {
    console.log(`  · Library: ${bookCount} books already exist`);
  }

  // ── 15. Hostel rooms + student assignments ─────────────────────────────────
  const hostelCount = await prisma.hostelRoom.count({ where: { tenantId: tid } });
  if (hostelCount === 0) {
    const roomDefs = [
      { roomNumber: 'A101', building: 'Block A', floor: 1, capacity: 4, type: 'Dormitory' },
      { roomNumber: 'A102', building: 'Block A', floor: 1, capacity: 4, type: 'Dormitory' },
      { roomNumber: 'B201', building: 'Block B', floor: 2, capacity: 2, type: 'Double' },
      { roomNumber: 'B202', building: 'Block B', floor: 2, capacity: 1, type: 'Single' },
    ];
    const rooms = await Promise.all(roomDefs.map(r => prisma.hostelRoom.create({ data: { tenantId: tid, ...r } })));

    // Assign 4 students (JSS1 + SS1) to rooms
    const boarders = [...students.slice(4, 6), ...students.slice(6, 8)].filter(Boolean);
    for (let i = 0; i < Math.min(boarders.length, 2); i++) {
      await prisma.hostelAssignment.create({
        data: { tenantId: tid, roomId: rooms[0].id, studentId: boarders[i].id, startDate: new Date('2025-09-01'), bedNumber: `Bed ${i + 1}`, status: 'Active' },
      });
    }
    for (let i = 2; i < Math.min(boarders.length, 4); i++) {
      await prisma.hostelAssignment.create({
        data: { tenantId: tid, roomId: rooms[1].id, studentId: boarders[i].id, startDate: new Date('2025-09-01'), bedNumber: `Bed ${i - 1}`, status: 'Active' },
      });
    }
    await prisma.hostelRoom.update({ where: { id: rooms[0].id }, data: { occupied: Math.min(2, boarders.length) } });
    await prisma.hostelRoom.update({ where: { id: rooms[1].id }, data: { occupied: Math.max(0, Math.min(2, boarders.length - 2)) } });
    console.log(`  ✓ Hostel: ${rooms.length} rooms, ${Math.min(boarders.length, 4)} students assigned`);
  } else {
    console.log(`  · Hostel: ${hostelCount} rooms already exist`);
  }

  // ── 16. Transport (buses + routes) ────────────────────────────────────────
  const busCount = await prisma.bus.count({ where: { tenantId: tid } });
  if (busCount === 0) {
    const busDefs = [
      { busNumber: 'GW-001', capacity: 40, driverName: 'Emeka Duru', driverPhone: '08031000001' },
      { busNumber: 'GW-002', capacity: 35, driverName: 'Tunde Salami', driverPhone: '08031000002' },
    ];
    const buses = await Promise.all(busDefs.map(b => prisma.bus.create({ data: { tenantId: tid, ...b } })));
    await prisma.busRoute.create({
      data: { tenantId: tid, busId: buses[0].id, routeName: 'Route A – Ikeja', stops: [{ name: 'School Gate', time: '14:30' }, { name: 'Alausa', time: '14:50' }, { name: 'Ikeja Bus Stop', time: '15:10' }] },
    });
    await prisma.busRoute.create({
      data: { tenantId: tid, busId: buses[1].id, routeName: 'Route B – Lekki', stops: [{ name: 'School Gate', time: '14:30' }, { name: 'Victoria Island', time: '15:00' }, { name: 'Lekki Phase 1', time: '15:30' }] },
    });
    console.log(`  ✓ Transport: ${buses.length} buses, 2 routes`);
  } else {
    console.log(`  · Transport: ${busCount} buses already exist`);
  }

  // ── 17. Inventory (school assets) ─────────────────────────────────────────
  const assetCount = await prisma.asset.count({ where: { tenantId: tid } });
  if (assetCount === 0) {
    const assetDefs = [
      { name: 'Classroom Desks',    category: 'Furniture',  quantity: 120, location: 'All Classrooms', cost: 15000 },
      { name: 'Whiteboard',         category: 'Furniture',  quantity: 12,  location: 'Classrooms',     cost: 8000  },
      { name: 'Science Lab Kits',   category: 'Lab Items',  quantity: 30,  location: 'Lab 1',          cost: 25000 },
      { name: 'Desktop Computers',  category: 'Equipment',  quantity: 20,  location: 'ICT Lab',        cost: 120000 },
      { name: 'Projectors',         category: 'Equipment',  quantity: 6,   location: 'Classrooms',     cost: 45000 },
      { name: 'First Aid Kits',     category: 'Medical',    quantity: 8,   location: 'Admin Block',    cost: 5000  },
    ];
    await Promise.all(assetDefs.map(a => prisma.asset.create({ data: { tenantId: tid, ...a, purchaseDate: new Date('2025-08-15') } })));
    console.log(`  ✓ Inventory: ${assetDefs.length} assets`);
  } else {
    console.log(`  · Inventory: ${assetCount} assets already exist`);
  }

  // ── 18. Sports & Activities ────────────────────────────────────────────────
  const activityCount = await prisma.activity.count({ where: { tenantId: tid } });
  if (activityCount === 0) {
    const activityDefs = [
      { name: 'Football Club', type: 'Sports', description: 'School football team for JSS and SS students', instructor: 'Mr. Samuel Okafor', schedule: { day: 'Tuesday', time: '15:00-17:00' }, maxCapacity: 22 },
      { name: 'Basketball Team', type: 'Sports', description: 'Inter-house basketball competition team', instructor: 'Mr. Chidi Eze', schedule: { day: 'Thursday', time: '15:00-17:00' }, maxCapacity: 15 },
      { name: 'Drama Club', type: 'Arts', description: 'Theatrical arts and public speaking', instructor: 'Ms. Amaka Nwosu', schedule: { day: 'Wednesday', time: '14:00-16:00' }, maxCapacity: 30 },
      { name: 'Music Ensemble', type: 'Music', description: 'School choir and instrumental group', instructor: 'Ms. Amaka Nwosu', schedule: { day: 'Friday', time: '13:00-14:30' }, maxCapacity: 40 },
    ];
    const activities = await Promise.all(activityDefs.map(a => prisma.activity.create({ data: { tenantId: tid, ...a } })));
    // Enroll JSS1 and SS1 students in football
    const footballPlayers = students.slice(4, 8).filter(Boolean);
    await Promise.all(footballPlayers.map(s =>
      prisma.activityEnrollment.create({ data: { tenantId: tid, activityId: activities[0].id, studentId: s.id, status: 'Active' } })
    ));
    console.log(`  ✓ Sports: ${activities.length} activities, ${footballPlayers.length} students in football`);
  } else {
    console.log(`  · Sports: ${activityCount} activities already exist`);
  }

  // ── 19. Health records ─────────────────────────────────────────────────────
  const healthCount = await prisma.healthRecord.count({ where: { tenantId: tid } });
  if (healthCount === 0) {
    const healthDefs = [
      { idx: 4, bloodGroup: 'O+', allergies: 'None', conditions: null },
      { idx: 5, bloodGroup: 'A+', allergies: 'Penicillin', conditions: 'Mild asthma' },
      { idx: 6, bloodGroup: 'B+', allergies: 'None', conditions: null },
      { idx: 7, bloodGroup: 'AB+', allergies: 'Peanuts', conditions: null },
    ];
    await Promise.all(healthDefs.map(h =>
      students[h.idx] ? prisma.healthRecord.create({
        data: {
          tenantId: tid, studentId: students[h.idx].id,
          bloodGroup: h.bloodGroup, allergies: h.allergies, conditions: h.conditions,
          emergencyContact: { name: `${students[h.idx].lastName} Family`, phone: '08030000000', relation: 'Parent' },
        },
      }) : Promise.resolve(null)
    ));
    console.log(`  ✓ Health: ${healthDefs.length} student health records`);
  } else {
    console.log(`  · Health: ${healthCount} records already exist`);
  }

  // ── 20. Courses (e-learning) ──────────────────────────────────────────────
  const courseCount = await prisma.course.count({ where: { tenantId: tid } });
  if (courseCount === 0 && teachers.length > 0) {
    const mathSubjectForCourse = allSubjects.find(s => s.name === 'Mathematics' && s.classId === jss1?.id);
    const engSubject = allSubjects.find(s => s.name === 'English Language' && s.classId === jss1?.id);
    const sciSubject = allSubjects.find(s => s.name === 'Basic Technology' && s.classId === jss1?.id);

    const courseDefs = [
      {
        title: 'Introduction to Algebra', description: 'Foundation algebra concepts for JSS 1 students.', level: 'Beginner',
        teacherId: teachers[0].id, subjectId: mathSubjectForCourse?.id, duration: 20, isPublished: true,
        modules: ['Numbers & Arithmetic', 'Introduction to Variables', 'Simple Equations', 'Word Problems'],
      },
      {
        title: 'English Comprehension & Essay Writing', description: 'Reading comprehension and structured essay skills.', level: 'Intermediate',
        teacherId: teachers[1].id, subjectId: engSubject?.id, duration: 15, isPublished: true,
        modules: ['Reading Strategies', 'Paragraph Writing', 'Essay Structure', 'Vocabulary Expansion'],
      },
      {
        title: 'Basic Technology Fundamentals', description: 'Practical introduction to technology and design.', level: 'Beginner',
        teacherId: teachers[2].id, subjectId: sciSubject?.id, duration: 18, isPublished: false,
        modules: ['Tools & Safety', 'Technical Drawing', 'Simple Machines', 'Electronics Basics'],
      },
    ];

    for (const { modules, ...courseData } of courseDefs) {
      const course = await prisma.course.create({ data: { tenantId: tid, ...courseData } });
      await Promise.all(modules.map((title, order) =>
        prisma.courseModule.create({ data: { courseId: course.id, title, order } })
      ));
    }
    console.log(`  ✓ Courses: ${courseDefs.length} created (2 published, 1 draft)`);
  } else {
    console.log(`  · Courses: ${courseCount} already exist`);
  }

  // ── 21. Assign homeroom teachers to classes ────────────────────────────────
  const unassignedClasses = classes.filter(c => !c.teacherId);
  if (unassignedClasses.length > 0 && teachers.length > 0) {
    await Promise.all(unassignedClasses.map((cls, i) =>
      prisma.class.update({ where: { id: cls.id }, data: { teacherId: teachers[i % teachers.length].id } })
    ));
    console.log(`  ✓ Classes: homeroom teachers assigned to ${unassignedClasses.length} classes`);
  } else {
    console.log('  · Classes: homeroom teachers already assigned');
  }

  // ── 22. Disciplinary records ───────────────────────────────────────────────
  const discCount = await prisma.disciplinaryRecord.count({ where: { tenantId: tid } });
  if (discCount === 0 && students[4]) {
    await prisma.disciplinaryRecord.create({
      data: {
        tenantId: tid, studentId: students[4].id,
        incidentDate: new Date('2026-03-10'),
        description: 'Late arrival to class on three consecutive days without valid reason.',
        severity: 'Minor', actionTaken: 'Verbal warning issued by class teacher.', status: 'Resolved',
      },
    });
    await prisma.disciplinaryRecord.create({
      data: {
        tenantId: tid, studentId: students[5].id,
        incidentDate: new Date('2026-04-02'),
        description: 'Found with mobile phone during examination.',
        severity: 'Major', actionTaken: 'Phone confiscated; parents notified.', status: 'Under Review',
      },
    });
    console.log('  ✓ Disciplinary: 2 records');
  } else {
    console.log(`  · Disciplinary: ${discCount} records already exist`);
  }

  console.log(`
✅  Seed complete!

  School:   Greenwood Academy
  Code:     ${DEMO_SUBDOMAIN}
  Admin:    admin@greenwood.edu   /  Admin@1234
  Teacher:  teacher@greenwood.edu /  Teacher@1234
  Parent:   parent@greenwood.edu  /  Parent@1234
  Student:  student@greenwood.edu /  Student@1234

  Parent portal: logs in as Funke Obi; sees child Emeka Obi (Primary 1)
  Student view:  logs in as Chisom Nkem; sees E-Learning + Certificates

  Login at: http://localhost:5173
  Use school code: ${DEMO_SUBDOMAIN}
`);
}

main()
  .catch(e => { console.error('❌  Seed failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
