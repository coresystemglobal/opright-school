import prisma from '../prisma/client';

export class SubmissionService {
  static async submitAssignment(tenantId: string, assignmentId: string, studentId: string, data: any) {
    const assignment = await prisma.assignment.findFirst({
      where: { tenantId, id: assignmentId }
    });

    const isLate = assignment?.dueDate && new Date() > assignment.dueDate;

    return prisma.submission.create({
      data: {
        tenantId,
        assignmentId,
        studentId,
        content: data.content,
        files: data.files,
        status: isLate ? 'LATE' : 'SUBMITTED'
      }
    });
  }

  static async getSubmissions(tenantId: string, filters: any) {
    return prisma.submission.findMany({
      where: { tenantId, ...filters },
      orderBy: { submittedAt: 'desc' }
    });
  }

  static async gradeSubmission(id: string, grade: number, feedback: string, gradedBy: string) {
    return prisma.submission.update({
      where: { id },
      data: {
        grade,
        feedback,
        gradedBy,
        gradedAt: new Date(),
        status: 'GRADED'
      }
    });
  }
}
