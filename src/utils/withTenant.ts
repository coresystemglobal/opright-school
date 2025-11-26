import prisma from "../prisma/client";
import { PrismaClient } from '@prisma/client';

export async function withTenant<T>(tenantId: string, fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    // Prefer parameterized to avoid SQL injection concerns
    await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant = '${tenantId}'`);
    return fn(tx);
  });
}