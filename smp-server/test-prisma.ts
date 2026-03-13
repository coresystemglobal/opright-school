import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test that all models are available
async function test() {
  // These should not cause TypeScript errors
  await prisma.role.findMany();
  await prisma.permission.findMany();
  await prisma.rolePermission.findMany();
  await prisma.user.findMany();
}

export { test };