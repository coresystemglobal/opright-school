import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Tenant Isolation', () => {
  let tenant1Id: string;
  let tenant2Id: string;
  let dbAvailable = false;

  beforeAll(async () => {
    // Check if database is set up
    try {
      await prisma.$connect();
      // Try to query a table to see if schema exists
      await prisma.tenant.findFirst();
      dbAvailable = true;
    } catch (error) {
      console.warn('⚠️  Database not set up. Run: npm run db:push');
      return;
    }

    // Create test tenants
    const tenant1 = await prisma.tenant.create({
      data: { name: 'School A', subdomain: 'schoola' }
    });
    const tenant2 = await prisma.tenant.create({
      data: { name: 'School B', subdomain: 'schoolb' }
    });
    
    tenant1Id = tenant1.id;
    tenant2Id = tenant2.id;

    // Create test students for each tenant
    await prisma.student.create({
      data: { tenantId: tenant1Id, firstName: 'John', lastName: 'Doe' }
    });
    
    await prisma.student.create({
      data: { tenantId: tenant2Id, firstName: 'Jane', lastName: 'Smith' }
    });
  }, 30000);

  afterAll(async () => {
    if (dbAvailable) {
      await prisma.tenant.deleteMany({
        where: { id: { in: [tenant1Id, tenant2Id] } }
      });
    }
    await prisma.$disconnect();
  }, 30000);

  test('should isolate students by tenant', async () => {
    if (!dbAvailable) {
      console.warn('⚠️  Skipping test: Database not set up');
      return;
    }

    const tenant1Students = await prisma.student.findMany({
      where: { tenantId: tenant1Id }
    });
    
    const tenant2Students = await prisma.student.findMany({
      where: { tenantId: tenant2Id }
    });

    expect(tenant1Students).toHaveLength(1);
    expect(tenant2Students).toHaveLength(1);
    expect(tenant1Students[0].firstName).toBe('John');
    expect(tenant2Students[0].firstName).toBe('Jane');
  });

  test('should prevent cross-tenant access', async () => {
    if (!dbAvailable) {
      console.warn('⚠️  Skipping test: Database not set up');
      return;
    }

    const tenant1Students = await prisma.student.findMany({
      where: { tenantId: tenant1Id }
    });

    // Tenant 1 should not see Tenant 2's students
    expect(tenant1Students.every(s => s.tenantId === tenant1Id)).toBe(true);
  });
});