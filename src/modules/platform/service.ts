import { PrismaClient } from "@prisma/client";

export class PlatformService {
  constructor(private prisma: PrismaClient) {}

  async listTenants(opts?: { page?: number; limit?: number; search?: string }) {
    const page = opts?.page ?? 1;
    const limit = Math.min(opts?.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (opts?.search) {
      where.OR = [
        { name: { contains: opts.search, mode: "insensitive" } },
        { subdomain: { contains: opts.search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        select: {
          id: true,
          name: true,
          subdomain: true,
          domain: true,
          schoolCode: true,
          createdAt: true,
          _count: { select: { users: true, students: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getTenant(tenantId: string) {
    return this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      include: {
        subscription: true,
        _count: { select: { users: true, students: true, teachers: true, classes: true } },
      },
    });
  }

  async platformStats() {
    const [tenants, users, students] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.user.count(),
      this.prisma.student.count(),
    ]);
    return { tenants, users, students };
  }
}
