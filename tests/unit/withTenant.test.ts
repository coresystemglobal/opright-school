import { withTenant } from '../../src/utils/withTenant';
import prisma from '../../src/prisma/client';

jest.mock('../../src/prisma/client', () => ({
  $transaction: jest.fn(),
}));

describe('withTenant', () => {
  const mockTx = {
    $executeRaw: jest.fn().mockResolvedValue(1),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation((fn) => fn(mockTx));
  });

  test('should set tenant context and call fn', async () => {
    const tenantId = 'test-tenant-id';
    const mockFn = jest.fn().mockResolvedValue('result');

    const result = await withTenant(tenantId, mockFn);

    // $executeRaw is called as a tagged template; verify it was called
    expect(mockTx.$executeRaw).toHaveBeenCalled();
    expect(mockFn).toHaveBeenCalledWith(mockTx);
    expect(result).toBe('result');
  });

  test('should propagate errors from fn', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('db error'));
    await expect(withTenant('tenant-id', mockFn)).rejects.toThrow('db error');
  });
});