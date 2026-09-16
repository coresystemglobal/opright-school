/**
 * Backfill script — grants every existing Admin role the full permission
 * catalogue (adds newer domains like gradebook/subjects/timetables that were
 * missing when the tenant was first seeded). Safe to run repeatedly.
 *
 * Run with: npx tsx scripts/backfill-permissions.ts
 */
import prisma from '../src/prisma/client';
import { ensureDefaultPermissions } from '../src/utils/seedRoles';

async function main() {
  const perms = await ensureDefaultPermissions(prisma);
  console.log(`Permission catalogue: ${perms.length} permissions.`);

  const adminRoles = await prisma.role.findMany({
    where: { name: 'Admin' },
    include: { permissions: true },
  });
  console.log(`Found ${adminRoles.length} Admin role(s).`);

  let totalLinked = 0;
  for (const role of adminRoles) {
    const have = new Set(role.permissions.map((rp) => rp.permissionId));
    const missing = perms.filter((p) => !have.has(p.id));
    if (missing.length > 0) {
      await prisma.rolePermission.createMany({
        data: missing.map((p) => ({ roleId: role.id, permissionId: p.id })),
        skipDuplicates: true,
      });
      totalLinked += missing.length;
      console.log(`  · tenant ${role.tenantId}: +${missing.length} permissions`);
    } else {
      console.log(`  · tenant ${role.tenantId}: already complete`);
    }
  }

  console.log(`\nDone. Linked ${totalLinked} permission(s) across ${adminRoles.length} Admin role(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
