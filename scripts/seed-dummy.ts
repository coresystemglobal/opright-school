import { PrismaClient, AttendanceStatus, PaymentStatus, AssetTransactionType, CandidateStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const T = "84177414-4c57-41cc-a21f-17a6dd2020b8";

// Existing IDs
const ADMIN_USER = "7d258035-c96e-4824-a932-bdaf8d52fdd4";
const TEACHER_USER = "f2b9ba0c-c479-43c9-8b96-7fdc4517630a";
const PARENT_ROLE = "2816a714-c7ad-4c63-b10f-6907dc44c068";
const STUDENT_ROLE = "9e84d2f9-89fe-4248-b0e0-677e9aaee2c0";
const AY = "8d6e5881-ae10-4e4b-a2dd-433ec3745d9e";
const TERM1 = "e33cfa3c-2875-4123-857a-e497eb58534f";
const TERM2 = "ea740db8-d99b-4b91-9061-73844d98cb81";

const STUDENTS = [
  "2c9f8590-1510-41b6-a5e3-ae6985724915",
  "4517de38-61c9-4e00-a2fd-d0e662ff778e",
  "62741184-1d1b-4e60-b9be-2e8611254cf0",
  "6c02226a-f6f5-49c4-a5d9-c3bdcc5328cb",
  "704186fa-6818-4c44-94a8-d3fd405d561b",
  "7ec86646-7949-4a37-a29c-7f127615ebe2",
  "aaf4a8be-bd77-4ae0-b24d-894061c9d910",
  "cc2679ae-7f69-4dd7-9a29-b9d95520fff9",
];

const SUBJECTS = [
  "223e843e-5a77-41d2-b75d-4b5561b56d47", // Mathematics
  "0fe0d6f0-b779-4a3d-9ee0-dbbe4fbbbce6", // English Studies
  "2bf31134-b595-4016-82ce-e531ce6cb359", // Basic Science
  "2006fa51-2460-4404-9f06-55e1ad9cf35b", // Basic Technology
];

const BOOKS = [
  "7510cf8f-9faf-4993-bbc3-e2b258d7fed2",
  "65df5fcf-30d4-4547-ad36-10bd29a2a915",
  "a224b1bc-6abb-443a-95f4-c453785d6348",
];

const ACTIVITIES = [
  "a5ca1999-b15b-4378-9def-8a30842cbc67", // Football
  "b022439f-0d80-4481-9f55-b73f7d4bfaaf", // Basketball
  "0bfd4d09-bcca-46f7-a28e-70c0c52fe39a", // Drama
  "e1eb7228-3e3c-4815-a1b1-a5f4ea274c97", // Music
];

const ROOMS = [
  "f718ef7c-c615-4141-9123-6b7068369550",
  "0d770e51-649f-4d56-86e4-64b7090c05b3",
  "741e1f36-385a-41bb-b321-3798f86882ee",
  "56c2fcdb-8d15-4c4c-88e8-95f1a2225b77",
];

const HEALTH_RECS = [
  "7d31d4ab-4df5-482d-9afa-49632890bc05",
  "d5294cff-081e-44c3-9268-f3bdef87d2a0",
  "d2284709-6919-4703-944c-3e540b71354c",
  "4844e6a9-2437-41ba-bb37-bbd2c3a213a9",
];

function d(offset: number) {
  const dt = new Date();
  dt.setDate(dt.getDate() + offset);
  return dt;
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("Seeding comprehensive dummy data...\n");

  // ── 1. More attendance (last 30 school days) ──────────────────────────
  console.log("  Attendance...");
  const statuses: AttendanceStatus[] = ["PRESENT", "PRESENT", "PRESENT", "PRESENT", "LATE", "ABSENT", "EXCUSED"];
  for (let day = -30; day <= 0; day++) {
    const date = d(day);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    for (const sid of STUDENTS) {
      await prisma.attendance.upsert({
        where: { studentId_date: { studentId: sid, date } },
        create: { tenantId: T, studentId: sid, date, status: rand(statuses) },
        update: {},
      });
    }
  }

  // ── 2. More grades + assignments ──────────────────────────────────────
  console.log("  Assignments & grades...");
  const assignmentTitles = [
    "Midterm Test", "Weekly Quiz 1", "Weekly Quiz 2", "Homework Set 3",
    "Group Project", "Lab Report", "Essay Writing", "Oral Presentation",
  ];
  for (const subId of SUBJECTS) {
    for (const title of assignmentTitles.slice(0, 4)) {
      const a = await prisma.assignment.create({
        data: {
          tenantId: T, academicYearId: AY, termId: TERM1, subjectId: subId,
          title: `${title}`, maxScore: 100, weight: 10, dueDate: d(-Math.floor(Math.random() * 20)),
        },
      });
      for (const sid of STUDENTS) {
        await prisma.grade.create({
          data: {
            tenantId: T, studentId: sid, subjectId: subId, assignmentId: a.id,
            score: 40 + Math.floor(Math.random() * 60), maxScore: 100,
            remarks: rand(["Good work", "Needs improvement", "Excellent", "Fair", "Outstanding"]),
            gradedBy: TEACHER_USER,
          },
        });
      }
    }
  }

  // ── 3. Examinations + results ─────────────────────────────────────────
  console.log("  Examinations...");
  for (const subId of SUBJECTS) {
    const exam = await prisma.examination.create({
      data: {
        tenantId: T, academicYearId: AY, termId: TERM1, subjectId: subId,
        name: "Term 1 Final Exam", examDate: d(-5), duration: 120, maxScore: 100, passingScore: 40,
      },
    });
    for (const sid of STUDENTS) {
      const score = 35 + Math.floor(Math.random() * 65);
      await prisma.examResult.create({
        data: {
          tenantId: T, examinationId: exam.id, studentId: sid,
          score, grade: score >= 70 ? "A" : score >= 60 ? "B" : score >= 50 ? "C" : score >= 40 ? "D" : "F",
          remarks: score >= 70 ? "Excellent" : score >= 50 ? "Good" : "Needs improvement",
        },
      });
    }
  }

  // ── 4. More fees + payments ───────────────────────────────────────────
  console.log("  Fees & payments...");
  const fees = await Promise.all([
    prisma.fee.create({ data: { tenantId: T, name: "Term 2 Tuition", amount: 75000, dueDate: d(30) } }),
    prisma.fee.create({ data: { tenantId: T, name: "Sports Levy", amount: 5000, dueDate: d(15) } }),
    prisma.fee.create({ data: { tenantId: T, name: "Lab Fee", amount: 10000, dueDate: d(20) } }),
    prisma.fee.create({ data: { tenantId: T, name: "Library Fee", amount: 3000, dueDate: d(10) } }),
  ]);
  const methods = ["CARD", "BANK_TRANSFER", "CASH"];
  const payStatuses: PaymentStatus[] = ["SUCCESS", "SUCCESS", "SUCCESS", "PENDING", "FAILED"];
  for (const sid of STUDENTS) {
    for (const fee of fees) {
      await prisma.payment.create({
        data: {
          tenantId: T, feeId: fee.id, studentId: sid,
          amount: fee.amount, method: rand(methods), status: rand(payStatuses),
        },
      });
    }
  }

  // ── 5. More events ────────────────────────────────────────────────────
  console.log("  Events...");
  const eventData = [
    { title: "Parent-Teacher Conference", type: "ACADEMIC", venue: "Main Hall", startDate: d(7), endDate: d(7) },
    { title: "Science Fair", type: "ACADEMIC", venue: "Science Block", startDate: d(14), endDate: d(14) },
    { title: "Cultural Day", type: "CULTURAL", venue: "School Grounds", startDate: d(21), endDate: d(21) },
    { title: "Inter-House Sports", type: "SPORTS", venue: "Sports Complex", startDate: d(28), endDate: d(28) },
    { title: "End of Term Assembly", type: "ACADEMIC", venue: "Assembly Hall", startDate: d(35), endDate: d(35) },
    { title: "Art Exhibition", type: "CULTURAL", venue: "Art Room", startDate: d(10), endDate: d(10) },
    { title: "Debate Competition", type: "ACADEMIC", venue: "Auditorium", startDate: d(18), endDate: d(18) },
  ];
  for (const ev of eventData) {
    const event = await prisma.event.create({ data: { tenantId: T, ...ev } });
    for (const sid of STUDENTS.slice(0, 4)) {
      await prisma.eventParticipant.create({
        data: { tenantId: T, eventId: event.id, participantId: sid, participantType: "STUDENT" },
      });
    }
  }

  // ── 6. Book transactions ──────────────────────────────────────────────
  console.log("  Library transactions...");
  for (const bookId of BOOKS) {
    for (const sid of STUDENTS.slice(0, 3)) {
      await prisma.bookTransaction.create({
        data: {
          tenantId: T, bookId, borrowerId: sid, borrowerType: "STUDENT",
          dueDate: d(14), status: rand(["BORROWED", "RETURNED", "BORROWED"]),
          returnDate: Math.random() > 0.5 ? d(-2) : undefined,
        },
      });
    }
  }

  // ── 7. More transport data ────────────────────────────────────────────
  console.log("  Transport...");
  const routes = await prisma.busRoute.findMany({ where: { tenantId: T }, select: { id: true } });
  if (routes.length > 0) {
    for (const sid of STUDENTS.slice(0, 6)) {
      await prisma.busAssignment.create({
        data: {
          tenantId: T, studentId: sid, routeId: routes[0].id,
          pickupStop: rand(["Ikeja", "Ojodu", "Berger", "Maryland"]),
          dropStop: rand(["School Gate", "Main Entrance"]),
        },
      }).catch(() => {}); // skip duplicates
    }
  }

  // ── 8. More inventory transactions ────────────────────────────────────
  console.log("  Inventory...");
  const assets = await prisma.asset.findMany({ where: { tenantId: T }, select: { id: true } });
  const txTypes: AssetTransactionType[] = ["PURCHASE", "ALLOCATION", "MAINTENANCE", "DISPOSAL"];
  for (const asset of assets) {
    for (let i = 0; i < 3; i++) {
      await prisma.assetTransaction.create({
        data: {
          tenantId: T, assetId: asset.id, type: rand(txTypes),
          quantity: 1 + Math.floor(Math.random() * 5),
          remarks: rand(["Routine check", "New purchase", "Allocated to ICT lab", "Sent for repair"]),
        },
      });
    }
  }

  // ── 9. Sports enrollments + competitions ──────────────────────────────
  console.log("  Sports...");
  for (const actId of ACTIVITIES) {
    for (const sid of STUDENTS.slice(0, 4)) {
      await prisma.activityEnrollment.create({
        data: { tenantId: T, activityId: actId, studentId: sid },
      }).catch(() => {});
    }
    await prisma.competition.create({
      data: {
        tenantId: T, activityId: actId,
        name: `${rand(["Regional", "Inter-House", "State", "Zonal"])} ${rand(["Finals", "Qualifiers", "Championship"])}`,
        date: d(Math.floor(Math.random() * 30)),
        venue: rand(["City Stadium", "School Field", "Sports Complex", "National Arena"]),
      },
    });
  }

  // ── 10. Disciplinary records ──────────────────────────────────────────
  console.log("  Disciplinary...");
  const incidents = [
    { studentId: STUDENTS[0], type: "TARDINESS", desc: "Late to morning assembly 3 times this week", action: "Verbal warning", status: "RESOLVED" },
    { studentId: STUDENTS[1], type: "MISCONDUCT", desc: "Disrupting class during Mathematics lesson", action: "Detention assigned", status: "OPEN" },
    { studentId: STUDENTS[2], type: "DRESS_CODE", desc: "Incomplete uniform on two occasions", action: "Parent notified", status: "RESOLVED" },
    { studentId: STUDENTS[3], type: "FIGHTING", desc: "Physical altercation during break time", action: "Suspended for 2 days", status: "RESOLVED" },
    { studentId: STUDENTS[4], type: "CHEATING", desc: "Caught with notes during weekly quiz", action: "Zero score, parent meeting scheduled", status: "OPEN" },
    { studentId: STUDENTS[5], type: "VANDALISM", desc: "Damaged classroom window", action: "Parent to pay for repairs", status: "OPEN" },
  ];
  for (const inc of incidents) {
    await prisma.disciplinaryRecord.create({
      data: {
        tenantId: T, studentId: inc.studentId, incidentDate: d(-Math.floor(Math.random() * 30)),
        description: `[${inc.type}] ${inc.desc}`, severity: rand(["Minor", "Major", "Severe"]),
        actionTaken: inc.action, status: inc.status,
      },
    });
  }

  // ── 11. Health incidents + vaccinations ───────────────────────────────
  console.log("  Health...");
  for (const hrId of HEALTH_RECS) {
    await prisma.medicalIncident.create({
      data: {
        tenantId: T, healthRecordId: hrId,
        description: rand(["Reported feeling unwell during PE", "Minor scrape on playground", "Allergic reaction to dust"]),
        treatment: rand(["Paracetamol administered", "First aid applied", "Sent to school nurse", "Parent called"]),
        date: d(-Math.floor(Math.random() * 30)),
      },
    });
    await prisma.vaccination.create({
      data: {
        tenantId: T, healthRecordId: hrId,
        vaccineName: rand(["Tetanus", "Hepatitis B", "Yellow Fever", "Meningitis", "COVID-19"]),
        date: d(-Math.floor(Math.random() * 365)),
      },
    });
  }

  // ── 12. Hostel assignments + meal plans + visitors ────────────────────
  console.log("  Hostel...");
  for (let i = 0; i < 4; i++) {
    await prisma.hostelAssignment.create({
      data: {
        tenantId: T, roomId: ROOMS[i], studentId: STUDENTS[i],
        bedNumber: `B${i + 1}`, startDate: d(-60),
      },
    }).catch(() => {});
  }
  for (const sid of STUDENTS.slice(0, 4)) {
    await prisma.mealPlan.create({
      data: {
        tenantId: T, studentId: sid,
        planType: rand(["Full Board", "Half Board", "Breakfast Only"]),
        startDate: d(-30), endDate: d(60),
        specialDiet: rand([null, "Vegetarian", "No Peanuts", "Halal"]),
      },
    });
  }
  for (let i = 0; i < 6; i++) {
    await prisma.visitorLog.create({
      data: {
        tenantId: T, studentId: rand(STUDENTS),
        visitorName: rand(["Mrs. Adeyemi", "Mr. Okafor", "Mrs. Bello", "Mr. Eze", "Mrs. Nwosu"]),
        relation: rand(["Mother", "Father", "Guardian", "Uncle", "Aunt"]),
        phone: `+23480${Math.floor(10000000 + Math.random() * 90000000)}`,
        purpose: rand(["Routine visit", "Brought supplies", "Parent meeting", "Medical follow-up"]),
        checkIn: d(-i),
        checkOut: i > 2 ? d(-i) : undefined,
      },
    });
  }

  // ── 13. Notices ───────────────────────────────────────────────────────
  console.log("  Notices...");
  const noticeData = [
    { title: "Term 2 Resumption Date", content: "All students are expected to resume on Monday, January 13th. Late resumption attracts a fine of ₦5,000.", targetRoles: ["STUDENT", "PARENT"] },
    { title: "Mid-Term Break", content: "Mid-term break begins Friday, February 14th. Students will be dismissed at 12:00 PM.", targetRoles: ["STUDENT", "PARENT", "TEACHER"] },
    { title: "Staff Meeting", content: "All teaching staff are required to attend the quarterly review meeting on Wednesday at 3:00 PM in the conference room.", targetRoles: ["TEACHER"] },
    { title: "New Library Books", content: "The library has received 50 new titles across Science, Literature, and History. Students are encouraged to visit.", targetRoles: ["STUDENT", "TEACHER"] },
    { title: "Uniform Inspection", content: "Random uniform inspections will be conducted next week. Ensure complete and proper uniform at all times.", targetRoles: ["STUDENT", "PARENT"] },
    { title: "PTA Meeting", content: "The next PTA meeting is scheduled for Saturday, March 1st at 10:00 AM. All parents are encouraged to attend.", targetRoles: ["PARENT"] },
    { title: "Exam Timetable Released", content: "The Term 1 examination timetable has been published. Please check the notice board or student portal.", targetRoles: ["STUDENT", "TEACHER", "PARENT"] },
    { title: "Water Supply Maintenance", content: "Water supply will be interrupted on Thursday for maintenance. Please plan accordingly.", targetRoles: ["STUDENT", "TEACHER", "STAFF"] },
  ];
  for (const n of noticeData) {
    await prisma.notice.create({
      data: { tenantId: T, authorId: ADMIN_USER, ...n },
    });
  }

  // ── 14. Candidates ────────────────────────────────────────────────────
  console.log("  Candidates...");
  const candidateNames = [
    { first: "Oluwaseun", last: "Adeyinka" }, { first: "Blessing", last: "Okonkwo" },
    { first: "Ibrahim", last: "Suleiman" }, { first: "Precious", last: "Eze" },
    { first: "Yusuf", last: "Abdullahi" }, { first: "Amina", last: "Garba" },
    { first: "David", last: "Ogundimu" }, { first: "Esther", last: "Akpan" },
    { first: "Chukwuemeka", last: "Nwachukwu" }, { first: "Halima", last: "Baba" },
  ];
  const candidateStatuses: CandidateStatus[] = ["PENDING", "PENDING", "PENDING", "ADMITTED", "REJECTED"];
  for (let i = 0; i < candidateNames.length; i++) {
    const cn = candidateNames[i];
    await prisma.candidate.create({
      data: {
        tenantId: T,
        candidateCode: `GWDC26${String(i + 1).padStart(4, "0")}`,
        firstName: cn.first, lastName: cn.last,
        dob: new Date(2012 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28)),
        status: rand(candidateStatuses),
        applicationData: {
          previousSchool: rand(["Lagos Model School", "Federal Government College", "St. Mary's Academy", "Community Primary School"]),
          classAppliedFor: rand(["JSS 1", "Primary 1", "SS 1"]),
          parentPhone: `+23480${Math.floor(10000000 + Math.random() * 90000000)}`,
        },
      },
    });
  }

  // ── 15. Parents ───────────────────────────────────────────────────────
  console.log("  Parents...");
  const pw = await bcrypt.hash("Parent123", 12);
  const parentData = [
    { first: "Adebola", last: "Bello", email: "adebola.bello@email.com", phone: "+2348012345001", studentIdx: [0, 1] },
    { first: "Chidinma", last: "Obi", email: "chidinma.obi@email.com", phone: "+2348012345002", studentIdx: [3] },
    { first: "Hauwa", last: "Musa", email: "hauwa.musa@email.com", phone: "+2348012345003", studentIdx: [6] },
    { first: "Olumide", last: "Ojo", email: "olumide.ojo@email.com", phone: "+2348012345004", studentIdx: [2, 4] },
  ];
  for (const p of parentData) {
    const user = await prisma.user.create({
      data: {
        tenantId: T, email: p.email, password: pw,
        firstName: p.first, lastName: p.last, roleId: PARENT_ROLE,
      },
    });
    const parent = await prisma.parent.create({
      data: {
        tenantId: T, userId: user.id,
        firstName: p.first, lastName: p.last, phone: p.phone, email: p.email,
      },
    });
    for (const idx of p.studentIdx) {
      await prisma.studentParent.create({
        data: { parentId: parent.id, studentId: STUDENTS[idx] },
      }).catch(() => {});
    }
  }

  // ── 16. More timetable entries ────────────────────────────────────────
  console.log("  Timetables...");
  const classes = await prisma.class.findMany({ where: { tenantId: T }, select: { id: true } });
  const teachers = await prisma.teacher.findMany({ where: { tenantId: T }, select: { id: true } });
  const timeSlots = [
    { start: "08:00", end: "08:45" }, { start: "08:50", end: "09:35" },
    { start: "09:40", end: "10:25" }, { start: "10:45", end: "11:30" },
    { start: "11:35", end: "12:20" }, { start: "13:00", end: "13:45" },
  ];
  const rooms = ["Room 101", "Room 102", "Room 201", "Lab 1", "Art Room", "Music Room"];
  for (const cls of classes) {
    for (let day = 1; day <= 5; day++) {
      for (let slot = 0; slot < 4; slot++) {
        const ts = timeSlots[slot];
        await prisma.timetable.create({
          data: {
            tenantId: T, academicYearId: AY, classId: cls.id,
            subjectId: rand(SUBJECTS), teacherId: rand(teachers).id,
            dayOfWeek: day, startTime: ts.start, endTime: ts.end, room: rand(rooms),
          },
        }).catch(() => {}); // skip conflicts
      }
    }
  }

  console.log("\n✅ Seed complete!\n");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
