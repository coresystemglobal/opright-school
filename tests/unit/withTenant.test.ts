import { withTenant } from '../../src/utils/withTenant';
import prisma from '../../src/prisma/client';

jest.mock('../../src/prisma/client', () => ({
  $transaction: jest.fn(),
}));

describe('withTenant', () => {
  const mockTx = {
    $executeRawUnsafe: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation((fn) => fn(mockTx));
  });

  test('should set tenant context', async () => {
    const tenantId = 'test-tenant-id';
    const mockFn = jest.fn().mockResolvedValue('result');

    const result = await withTenant(tenantId, mockFn);

    expect(mockTx.$executeRawUnsafe).toHaveBeenCalledWith(
      `SET LOCAL app.current_tenant = '${tenantId}'`
    );
    expect(mockFn).toHaveBeenCalledWith(mockTx);
    expect(result).toBe('result');
  });
});