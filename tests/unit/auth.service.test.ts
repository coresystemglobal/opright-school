import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import bcrypt from 'bcryptjs';
import { AuthService } from '../../src/modules/auth/service';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;

  const tokenService = {
    issueTokens: jest.fn(),
    refreshTokens: jest.fn(),
    revokeRefreshToken: jest.fn(),
  } as any;

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma, tokenService);
  });

  test('studentLogin rejects IDs that do not belong to the request tenant', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      id: 'tenant-1',
      schoolCode: 'ABC',
      subdomain: 'alpha',
    });

    await expect(
      service.studentLogin('tenant-1', {
        studentId: 'GWD250042',
        password: 'Student@123',
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid credentials',
    });

    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  test('studentLogin issues tokens when tenant and credentials match', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      id: 'tenant-1',
      schoolCode: 'GWD',
      subdomain: 'greenwood',
    });
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      tenantId: 'tenant-1',
      studentCode: 'GWD250042',
      password: 'hashed-password',
      roleId: 'role-1',
      role: { id: 'role-1', name: 'Student' },
      firstName: 'Ada',
      lastName: 'Okafor',
    });
    const compareMock = bcrypt.compare as unknown as jest.Mock;
    compareMock.mockImplementation(async () => true);
    tokenService.issueTokens.mockResolvedValue({
      token: 'access-token',
      refreshToken: 'refresh-token',
    });

    const result = await service.studentLogin('tenant-1', {
      studentId: 'gwd250042',
      password: 'Student@123',
    });

    expect(tokenService.issueTokens).toHaveBeenCalledWith({
      userId: 'user-1',
      tenantId: 'tenant-1',
      roleId: 'role-1',
      role: 'STUDENT',
    });
    expect(result).toMatchObject({
      token: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-1',
        studentCode: 'GWD250042',
        tenantId: 'tenant-1',
        tenantSubdomain: 'greenwood',
      },
    });
  });
});
