import prisma from "../../prisma/client";
import { CreateSchoolInput, TenantService } from "../../services/tenantService";
import { AuthTokenService } from "../auth/tokenService";

const tenantService = new TenantService(prisma);
const tokenService = new AuthTokenService(prisma);

export class OnboardingService {
  async createSchool(data: CreateSchoolInput) {
    const { tenant, adminUser, setup } = await tenantService.createSchool(data);
    const role = adminUser.role?.name?.toUpperCase() ?? "ADMIN";
    const { token, refreshToken } = await tokenService.issueTokens({
      userId: adminUser.id,
      tenantId: tenant.id,
      roleId: adminUser.roleId,
      role,
    });

    return {
      token,
      refreshToken,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        roleId: adminUser.roleId,
        role: adminUser.role,
        tenantId: tenant.id,
        tenantSubdomain: tenant.subdomain ?? undefined,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
      },
      setup: {
        academicYear: setup.academicYear.name,
        currentTerm: setup.currentTerm.name,
        classesCreated: setup.classesCreated,
        subjectsCreated: setup.subjectsCreated,
      },
    };
  }
}
