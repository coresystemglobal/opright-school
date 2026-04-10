import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { StudentIdService } from "./studentIdService";

export class CandidateService {
  private studentIdService: StudentIdService;

  constructor(private prisma: PrismaClient) {
    this.studentIdService = new StudentIdService(prisma);
  }

  async create(tenantId: string, data: {
    firstName: string;
    lastName: string;
    dob?: Date;
    applicationData?: Record<string, unknown>;
  }) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { schoolCode: true },
    });

    if (!tenant?.schoolCode) {
      throw new Error("Tenant has no schoolCode configured — cannot generate candidate ID");
    }

    const candidateCode = await this.studentIdService.generateCandidateId(tenantId, tenant.schoolCode);

    return this.prisma.candidate.create({
      data: { tenantId, candidateCode, ...data } as any,
    });
  }

  async list(tenantId: string) {
    return this.prisma.candidate.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(tenantId: string, id: string) {
    return this.prisma.candidate.findFirst({ where: { id, tenantId } });
  }

  async update(tenantId: string, id: string, data: Partial<{
    firstName: string;
    lastName: string;
    dob: Date;
    applicationData: object;
    status: "PENDING" | "ADMITTED" | "REJECTED";
  }>) {
    return this.prisma.candidate.update({
      where: { id, tenantId },
      data: data as any,
    });
  }

  async admit(tenantId: string, id: string) {
    const candidate = await this.prisma.candidate.findFirst({ where: { id, tenantId } });
    if (!candidate) throw new Error("Candidate not found");
    if (candidate.status === "ADMITTED") throw new Error("Candidate already admitted");

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { schoolCode: true },
    });
    if (!tenant?.schoolCode) throw new Error("Tenant has no schoolCode configured");

    const studentRole = await this.prisma.role.findFirst({
      where: { tenantId, name: "Student" },
      select: { id: true },
    });

    const studentCode = await this.studentIdService.generateStudentId(tenantId, tenant.schoolCode);

    // Default password = DOB as DDMMYYYY if available, otherwise "change123"
    const defaultPassword = candidate.dob ? formatDobPassword(candidate.dob) : "change123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    const [student] = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          studentCode,
          password: hashedPassword,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          roleId: studentRole?.id ?? undefined,
        },
      });

      const newStudent = await tx.student.create({
        data: {
          tenantId,
          studentCode,
          userId: user.id,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          dob: candidate.dob ?? undefined,
        },
      });

      await tx.candidate.update({
        where: { id },
        data: { status: "ADMITTED", admittedAt: new Date(), studentId: newStudent.id },
      });

      return [newStudent];
    });

    return student;
  }
}

function formatDobPassword(dob: Date): string {
  const dd = String(dob.getDate()).padStart(2, "0");
  const mm = String(dob.getMonth() + 1).padStart(2, "0");
  const yyyy = String(dob.getFullYear());
  return `${dd}${mm}${yyyy}`;
}
