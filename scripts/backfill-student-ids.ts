/**
 * Backfill script — assigns a human-readable studentId (and matching
 * studentCode) to any student that was created without one (e.g. via the
 * demo seed, which bypasses the API's id generator). Safe to run repeatedly.
 *
 * Run with: npx tsx scripts/backfill-student-ids.ts
 */
import prisma from '../src/prisma/client';
import { StudentIdService } from '../src/services/studentIdService';

const idService = new StudentIdService(prisma);

function schoolCodeFor(tenant: { schoolCode: string | null; subdomain: string | null; name: string }) {
  if (tenant.schoolCode) return tenant.schoolCode;
  const source = (tenant.subdomain || tenant.name || 'SCH').replace(/[^a-zA-Z]/g, '');
  return (source.slice(0, 3) || 'SCH').toUpperCase();
}

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true, subdomain: true, schoolCode: true } });
  let total = 0;

  for (const tenant of tenants) {
    const students = await prisma.student.findMany({
      where: { tenantId: tenant.id, studentId: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (students.length === 0) continue;

    const code = schoolCodeFor(tenant);
    for (const student of students) {
      const id = await idService.generateStudentId(tenant.id, code);
      await prisma.student.update({ where: { id: student.id }, data: { studentId: id, studentCode: id } });
      total++;
    }
    console.log(`  · ${tenant.name} (${code}): assigned ${students.length} student id(s)`);
  }

  console.log(`\nDone. Assigned ${total} student id(s) across ${tenants.length} tenant(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
