import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CacheService } from "../../utils/cache";
import { StudentIdService } from "../../services/studentIdService";

type StudentCreateData = {
  firstName: string;
  lastName: string;
  dob?: Date;
  guardian?: Record<string, unknown>;
};

type StudentUpdateData = Partial<StudentCreateData>;

type ListOptions = {
  classId?: string;
  limit?: number;
};

export class StudentService {
  private studentIdService: StudentIdService;

  constructor(private prisma: PrismaClient) {
    this.studentIdService = new StudentIdService(prisma);
  }

  async list(tenantId: string, options?: ListOptions) {
    // Build Prisma where clause
    const where: Prisma.StudentWhereInput = { tenantId };

    if (options?.classId) {
      // Join through Enrollment table to filter by class
      where.enrollments = {
        some: { classId: options.classId }
      };
    }

    const students = await this.prisma.student.findMany({
      where,
      take: options?.limit || undefined,
      orderBy: { createdAt: "desc" },
      include: options?.classId ? { enrollments: true } : undefined,
    });

    return students;
  }

  async create(tenantId: string, data: StudentCreateData) {
    const student = await this.prisma.$transaction(async (tx) => {
      const [tenant, studentRole] = await Promise.all([
        tx.tenant.findUnique({
          where: { id: tenantId },
          select: { schoolCode: true },
        }),
        tx.role.findFirst({
          where: { tenantId, name: "Student" },
          select: { id: true },
        }),
      ]);

      const studentData: Prisma.StudentUncheckedCreateInput = {
        tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
      };

      if (data.dob) {
        studentData.dob = data.dob;
      }

      if (data.guardian !== undefined) {
        studentData.guardian = data.guardian as Prisma.InputJsonValue;
      }

      if (tenant?.schoolCode) {
        const studentCode = await this.studentIdService.generateStudentId(
          tenantId,
          tenant.schoolCode
        );
        const defaultPassword = data.dob
          ? formatDobPassword(data.dob)
          : "change123";
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);

        const user = await tx.user.create({
          data: {
            tenantId,
            studentCode,
            password: hashedPassword,
            firstName: data.firstName,
            lastName: data.lastName,
            roleId: studentRole?.id ?? undefined,
          },
        });

        studentData.studentCode = studentCode;
        studentData.studentId = studentCode;
        studentData.userId = user.id;
      }

      return tx.student.create({ data: studentData });
    });

    await CacheService.invalidate(tenantId, "students");
    return student;
  }

  async getById(tenantId: string, id: string) {
    return this.prisma.student.findFirst({
      where: { id, tenantId },
    });
  }

  async update(tenantId: string, id: string, data: StudentUpdateData) {
    const updateData: Prisma.StudentUncheckedUpdateInput = {};

    if (data.firstName !== undefined) {
      updateData.firstName = data.firstName;
    }

    if (data.lastName !== undefined) {
      updateData.lastName = data.lastName;
    }

    if (data.dob !== undefined) {
      updateData.dob = data.dob;
    }

    if (data.guardian !== undefined) {
      updateData.guardian = data.guardian as Prisma.InputJsonValue;
    }

    const student = await this.prisma.student.update({
      where: { id, tenantId },
      data: updateData,
    });

    await CacheService.invalidate(tenantId, "students");
    return student;
  }

  async delete(tenantId: string, id: string) {
    await this.prisma.student.delete({
      where: { id, tenantId },
    });

    await CacheService.invalidate(tenantId, "students");
  }
}

function formatDobPassword(dob: Date): string {
  const dd = String(dob.getDate()).padStart(2, "0");
  const mm = String(dob.getMonth() + 1).padStart(2, "0");
  const yyyy = String(dob.getFullYear());
  return `${dd}${mm}${yyyy}`;
}
