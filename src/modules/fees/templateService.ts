import { Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError } from "../../utils/errors";

type TemplateCreateInput = {
  name: string;
  description?: string;
  category: "TUITION" | "TRANSPORT" | "EXAM" | "LIBRARY" | "SPORTS" | "HOSTEL" | "MEAL" | "OTHER";
  amount: number;
  currency?: string;
  targetType: "ALL" | "CLASS" | "TERM" | "ACADEMIC_YEAR" | "OPT_IN";
  targetIds?: string[];
  isOptIn?: boolean;
  isMandatory?: boolean;
  allowInstallments?: boolean;
  minimumInstallmentPercent?: number;
  dueDate?: Date;
  gracePeriodDays?: number;
  academicYearId?: string;
  termId?: string;
};

type TemplateUpdateInput = Partial<Omit<TemplateCreateInput, "category" | "targetType">>;

type TemplateFilters = {
  category?: string;
  isActive?: boolean;
  academicYearId?: string;
  termId?: string;
};

export class FeeTemplateService {
  constructor(private prisma: PrismaClient) {}

  async create(tenantId: string, data: TemplateCreateInput) {
    return this.prisma.feeTemplate.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        category: data.category,
        amount: data.amount,
        currency: data.currency ?? "NGN",
        targetType: data.targetType,
        targetIds: data.targetIds
          ? (data.targetIds as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        isOptIn: data.isOptIn ?? false,
        isMandatory: data.isMandatory ?? true,
        allowInstallments: data.allowInstallments ?? false,
        minimumInstallmentPercent: data.minimumInstallmentPercent,
        dueDate: data.dueDate,
        gracePeriodDays: data.gracePeriodDays ?? 0,
        academicYearId: data.academicYearId,
        termId: data.termId,
        isActive: true,
      },
    });
  }

  async list(tenantId: string, filters: TemplateFilters = {}) {
    const where: Prisma.FeeTemplateWhereInput = { tenantId };
    if (filters.category) where.category = filters.category as any;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.academicYearId) where.academicYearId = filters.academicYearId;
    if (filters.termId) where.termId = filters.termId;

    return this.prisma.feeTemplate.findMany({
      where,
      include: {
        _count: { select: { assignments: true, optIns: true } },
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
  }

  async getById(tenantId: string, id: string) {
    const template = await this.prisma.feeTemplate.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { assignments: true, optIns: true } },
      },
    });
    if (!template) throw new NotFoundError("Fee template not found");
    return template;
  }

  async update(tenantId: string, id: string, data: TemplateUpdateInput) {
    await this.getById(tenantId, id);
    return this.prisma.feeTemplate.update({
      where: { id },
      data: {
        ...data,
        targetIds: data.targetIds
          ? (data.targetIds as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  async deactivate(tenantId: string, id: string) {
    await this.getById(tenantId, id);
    return this.prisma.feeTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
