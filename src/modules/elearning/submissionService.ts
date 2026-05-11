import { Prisma, PrismaClient } from "@prisma/client";
import { ForbiddenError, NotFoundError } from "../../utils/errors";

type SubmissionFilters = {
  assignmentId?: string;
  studentId?: string;
};

type SubmissionInput = {
  content?: string;
  files?: unknown;
};

export class SubmissionService {
  constructor(private prisma: PrismaClient) {}

  private async resolveStudentId(tenantId: string, userId: string) {
    const student = await this.prisma.student.findFirst({
      where: { tenantId, userId },
      select: { id: true },
    });
    if (!student) throw new ForbiddenError('Student access required');
    return student.id;
  }

  async submitAssignment(
    tenantId: string,
    assignmentId: string,
    userId: string,
    data: SubmissionInput
  ) {
    const studentId = await this.resolveStudentId(tenantId, userId);
    const assignment = await this.prisma.assignment.findFirst({
      where: { tenantId, id: assignmentId },
      select: { dueDate: true },
    });

    if (!assignment) {
      throw new NotFoundError("Assignment not found");
    }

    const isLate = assignment.dueDate ? new Date() > assignment.dueDate : false;

    return this.prisma.submission.create({
      data: {
        tenantId,
        assignmentId,
        studentId,
        content: data.content,
        files: data.files as Prisma.InputJsonValue | undefined,
        status: isLate ? "LATE" : "SUBMITTED",
      },
    });
  }

  async getSubmissions(tenantId: string, filters: SubmissionFilters) {
    return this.prisma.submission.findMany({
      where: { tenantId, ...filters },
      orderBy: { submittedAt: "desc" },
    });
  }

  async gradeSubmission(
    tenantId: string,
    id: string,
    grade: number,
    feedback: string,
    gradedBy: string
  ) {
    const submission = await this.prisma.submission.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!submission) {
      throw new NotFoundError("Submission not found");
    }

    return this.prisma.submission.update({
      where: { id },
      data: {
        grade,
        feedback,
        gradedBy,
        gradedAt: new Date(),
        status: "GRADED",
      },
    });
  }
}
