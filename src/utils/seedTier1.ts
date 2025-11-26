import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedTier1Data(tenantId: string) {
  console.log('Seeding Tier 1 data...');

  // Create Academic Year
  const academicYear = await prisma.academicYear.create({
    data: {
      tenantId,
      name: '2024/2025',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-06-30'),
      isCurrent: true
    }
  });
  console.log('✓ Academic Year created');

  // Create Terms
  const term1 = await prisma.term.create({
    data: {
      tenantId,
      academicYearId: academicYear.id,
      name: 'Term 1',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-12-15'),
      isCurrent: true
    }
  });

  const term2 = await prisma.term.create({
    data: {
      tenantId,
      academicYearId: academicYear.id,
      name: 'Term 2',
      startDate: new Date('2025-01-06'),
      endDate: new Date('2025-03-28'),
      isCurrent: false
    }
  });

  const term3 = await prisma.term.create({
    data: {
      tenantId,
      academicYearId: academicYear.id,
      name: 'Term 3',
      startDate: new Date('2025-04-07'),
      endDate: new Date('2025-06-30'),
      isCurrent: false
    }
  });
  console.log('✓ Terms created');

  // Get existing class and teacher
  const existingClass = await prisma.class.findFirst({ where: { tenantId } });
  const existingTeacher = await prisma.teacher.findFirst({ where: { tenantId } });

  if (!existingClass || !existingTeacher) {
    console.log('⚠ No existing class or teacher found. Create them first.');
    return;
  }

  // Create Subjects
  const subjects = await Promise.all([
    prisma.subject.create({
      data: {
        tenantId,
        academicYearId: academicYear.id,
        name: 'Mathematics',
        code: 'MATH101',
        classId: existingClass.id,
        teacherId: existingTeacher.id
      }
    }),
    prisma.subject.create({
      data: {
        tenantId,
        academicYearId: academicYear.id,
        name: 'English',
        code: 'ENG101',
        classId: existingClass.id,
        teacherId: existingTeacher.id
      }
    }),
    prisma.subject.create({
      data: {
        tenantId,
        academicYearId: academicYear.id,
        name: 'Science',
        code: 'SCI101',
        classId: existingClass.id,
        teacherId: existingTeacher.id
      }
    })
  ]);
  console.log('✓ Subjects created');

  // Create Timetable
  const timetableEntries = [
    { subjectId: subjects[0].id, dayOfWeek: 1, startTime: '09:00', endTime: '10:00', room: 'Room 101' },
    { subjectId: subjects[1].id, dayOfWeek: 1, startTime: '10:00', endTime: '11:00', room: 'Room 102' },
    { subjectId: subjects[2].id, dayOfWeek: 1, startTime: '11:00', endTime: '12:00', room: 'Room 103' },
    { subjectId: subjects[0].id, dayOfWeek: 2, startTime: '09:00', endTime: '10:00', room: 'Room 101' },
    { subjectId: subjects[1].id, dayOfWeek: 3, startTime: '09:00', endTime: '10:00', room: 'Room 102' }
  ];

  await Promise.all(
    timetableEntries.map(entry =>
      prisma.timetable.create({
        data: {
          tenantId,
          academicYearId: academicYear.id,
          classId: existingClass.id,
          teacherId: existingTeacher.id,
          ...entry
        }
      })
    )
  );
  console.log('✓ Timetable created');

  // Create Assignments
  const assignments = await Promise.all(
    subjects.map((subject, idx) =>
      prisma.assignment.create({
        data: {
          tenantId,
          academicYearId: academicYear.id,
          termId: term1.id,
          subjectId: subject.id,
          title: `${subject.name} Assignment ${idx + 1}`,
          description: `Complete exercises 1-10`,
          maxScore: 100,
          weight: 1.0,
          dueDate: new Date('2024-10-15')
        }
      })
    )
  );
  console.log('✓ Assignments created');

  // Create Examinations
  await Promise.all(
    subjects.map(subject =>
      prisma.examination.create({
        data: {
          tenantId,
          academicYearId: academicYear.id,
          termId: term1.id,
          subjectId: subject.id,
          name: `${subject.name} Mid-term Exam`,
          examDate: new Date('2024-11-15'),
          duration: 120,
          maxScore: 100,
          passingScore: 50,
          room: 'Exam Hall'
        }
      })
    )
  );
  console.log('✓ Examinations created');

  console.log('✅ Tier 1 data seeding completed!');
}

// Run if called directly
if (require.main === module) {
  const tenantId = process.argv[2];
  if (!tenantId) {
    console.error('Usage: tsx src/utils/seedTier1.ts <tenantId>');
    process.exit(1);
  }

  seedTier1Data(tenantId)
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}
