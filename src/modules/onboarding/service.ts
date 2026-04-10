import jwt from "jsonwebtoken";
import prisma from "../../prisma/client";
import { ValidationError } from "../../utils/errors";
import { CreateSchoolInput, TenantService } from "../../services/tenantService";

const tenantService = new TenantService(prisma);

export class OnboardingService {
  async createSchool(data: CreateSchoolInput) {
    const { tenant, adminUser, setup } = await tenantService.createSchool(data);
    const role = adminUser.role?.name?.toUpperCase() ?? "ADMIN";
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new ValidationError("JWT secret is not configured");
    }

    const token = jwt.sign(
      { userId: adminUser.id, tenantId: tenant.id, roleId: adminUser.roleId, role },
      secret,
      { expiresIn: "7d" }
    );

    return {
      token,
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
