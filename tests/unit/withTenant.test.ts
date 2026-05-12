import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { withTenant } from '../../src/utils/withTenant';
import prisma from '../../src/prisma/client';

jest.mock('../../src/prisma/client', () => ({
  $extends: jest.fn(),
}));

describe('withTenant', () => {
  const extendedClient = { tag: 'scoped-client' } as any;
  let allModelQueries: Record<string, Function>;

  beforeEach(() => {
    jest.clearAllMocks();
    allModelQueries = {};

    const extendsMock = prisma.$extends as unknown as jest.Mock;
    extendsMock.mockImplementation((config: any) => {
      allModelQueries = config.query.$allModels;
      return extendedClient;
    });
  });

  test('passes the scoped client to the callback', async () => {
    const fn: any = jest.fn().mockImplementation(async () => 'result');

    const result = await withTenant('tenant-1', fn);

    expect(prisma.$extends).toHaveBeenCalled();
    expect(fn).toHaveBeenCalledWith(extendedClient);
    expect(result).toBe('result');
  });

  test('injects tenantId into tenant-scoped findMany queries', async () => {
    await withTenant('tenant-1', async () => null);
    const args = { where: { id: 'student-1' } };
    const query: any = jest.fn().mockImplementation(async () => []);

    await allModelQueries.findMany({ model: 'student', args, query });

    expect(query).toHaveBeenCalledWith({
      where: {
        id: 'student-1',
        tenantId: 'tenant-1',
      },
    });
  });

  test('injects tenantId into create data', async () => {
    await withTenant('tenant-1', async () => null);
    const args = { data: { firstName: 'Ada' } };
    const query: any = jest.fn().mockImplementation(async () => ({}));

    await allModelQueries.create({ model: 'student', args, query });

    expect(query).toHaveBeenCalledWith({
      data: {
        firstName: 'Ada',
        tenantId: 'tenant-1',
      },
    });
  });

  test('post-filters findUnique results by tenant', async () => {
    await withTenant('tenant-1', async () => null);
    const query: any = jest.fn().mockImplementation(async () => ({
      id: 'student-1',
      tenantId: 'tenant-2',
    }));

    const result = await allModelQueries.findUnique({
      model: 'student',
      args: { where: { id: 'student-1' } },
      query,
    });

    expect(result).toBeNull();
  });

  test('does not modify global model queries', async () => {
    await withTenant('tenant-1', async () => null);
    const args = { where: { resource: 'students' } };
    const query: any = jest.fn().mockImplementation(async () => []);

    await allModelQueries.findMany({ model: 'permission', args, query });

    expect(query).toHaveBeenCalledWith({
      where: {
        resource: 'students',
      },
    });
  });
});
