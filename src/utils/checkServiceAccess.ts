import { PrismaClient } from "@prisma/client";

type ServiceAccessResult =
  | { allowed: true }
  | { allowed: false; reason: string; revokedFees: string[] };

/**
 * Returns whether a student currently has service access for a given fee category.
 * Access is denied if any mandatory assignment in that category has serviceAccessRevoked=true.
 */
export async function checkServiceAccess(
  prisma: PrismaClient,
  tenantId: string,
  studentId: string,
  category: string
): Promise<ServiceAccessResult> {
  const blocked = await prisma.feeAssignment.findMany({
    where: {
      tenantId,
      studentId,
      serviceAccessRevoked: true,
      feeTemplate: { category: category as never, isMandatory: true },
    },
    include: { feeTemplate: { select: { name: true } } },
  });

  if (blocked.length === 0) return { allowed: true };

  return {
    allowed: false,
    reason: "Service access restricted due to overdue mandatory fees",
    revokedFees: blocked.map((a) => a.feeTemplate.name),
  };
}
