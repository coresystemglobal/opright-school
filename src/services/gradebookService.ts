import { PrismaClient } from '@prisma/client';

export class GradebookService {
  constructor(private prisma: PrismaClient) {}

  async createAssignment(tenantId: string, data: {
    academicYearId: string;
    termId: string;
    subjectId: string;
    title: string;
    description?: string;
    maxScore: number;
    weight?: number;
    dueDate?: Date;
  }) {
    return this.prisma.assignment.create({
      data: { ...data, tenantId },
      include: { subject: true, term: true }
    });
  }

  async listAssignments(tenantId: string, filters?: { subjectId?: string; termId?: string }) {
    return this.prisma.assignment.findMany({
      where: { tenantId, ...filters },
      include: { subject: true, term: true },
      orderBy: { assignedDate: 'desc' }
    });
  }

  async recordGrade(tenantId: string, data: {
    studentId: string;
    subjectId: string;
    assignmentId?: string;
    score: number;
    maxScore: number;
    remarks?: string;
    gradedBy?: string;
  }) {
    if (data.assignmentId) {
      return this.prisma.grade.upsert({
        where: { studentId_assignmentId: { studentId: data.studentId, assignmentId: data.assignmentId } },
        update: { score: data.score, maxScore: data.maxScore, remarks: data.remarks, gradedBy: data.gradedBy },
        create: { ...data, tenantId }
      });
    }
    return this.prisma.grade.create({
      data: { ...data, tenantId }
    });
  }

  async bulkRecordGrades(tenantId: string, grades: Array<{
    studentId: string;
    subjectId: string;
    assignmentId?: string;
    score: number;
    maxScore: number;
    remarks?: string;
    gradedBy?: string;
  }>) {
    return Promise.all(grades.map(grade => this.recordGrade(tenantId, grade)));
  }

  async getStudentGrades(tenantId: string, studentId: string, filters?: { subjectId?: string; assignmentId?: string }) {
    return this.prisma.grade.findMany({
      where: { tenantId, studentId, ...filters },
      include: { subject: true, assignment: true },
      orderBy: { gradedAt: 'desc' }
    });
  }

  async calculateSubjectAverage(tenantId: string, studentId: string, subjectId: string) {
    const grades = await this.prisma.grade.findMany({
      where: { tenantId, studentId, subjectId },
      include: { assignment: true }
    });

    if (grades.length === 0) return null;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    grades.forEach(grade => {
      const weight = grade.assignment?.weight || 1;
      const percentage = (grade.score / grade.maxScore) * 100;
      totalWeightedScore += percentage * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  }

  async getStudentReportCard(tenantId: string, studentId: string, termId: string) {
    const assignments = await this.prisma.assignment.findMany({
      where: { tenantId, termId },
      include: {
        subject: true,
        grades: {
          where: { studentId }
        }
      }
    });

    const subjectMap = new Map();

    assignments.forEach(assignment => {
      const subjectId = assignment.subjectId;
      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, {
          subjectId,
          subjectName: assignment.subject.name,
          grades: []
        });
      }
      if (assignment.grades.length > 0) {
        subjectMap.get(subjectId).grades.push({
          assignmentTitle: assignment.title,
          score: assignment.grades[0].score,
          maxScore: assignment.grades[0].maxScore,
          percentage: (assignment.grades[0].score / assignment.grades[0].maxScore) * 100
        });
      }
    });

    const subjects = Array.from(subjectMap.values()).map(subject => {
      const totalScore = subject.grades.reduce((sum: number, g: any) => sum + g.score, 0);
      const totalMax = subject.grades.reduce((sum: number, g: any) => sum + g.maxScore, 0);
      return {
        ...subject,
        average: totalMax > 0 ? (totalScore / totalMax) * 100 : 0
      };
    });

    const overallAverage = subjects.length > 0
      ? subjects.reduce((sum, s) => sum + s.average, 0) / subjects.length
      : 0;

    return { subjects, overallAverage };
  }

  async createExamination(tenantId: string, data: {
    academicYearId: string;
    termId: string;
    subjectId: string;
    name: string;
    examDate: Date;
    duration?: number;
    maxScore: number;
    passingScore?: number;
    room?: string;
  }) {
    return this.prisma.examination.create({
      data: { ...data, tenantId },
      include: { subject: true, term: true }
    });
  }

  async recordExamResult(tenantId: string, data: {
    examinationId: string;
    studentId: string;
    score: number;
    grade?: string;
    remarks?: string;
  }) {
    return this.prisma.examResult.upsert({
      where: { examinationId_studentId: { examinationId: data.examinationId, studentId: data.studentId } },
      update: { score: data.score, grade: data.grade, remarks: data.remarks },
      create: { ...data, tenantId }
    });
  }

  async getExamResults(tenantId: string, filters: { examinationId?: string; studentId?: string }) {
    return this.prisma.examResult.findMany({
      where: { tenantId, ...filters },
      include: { examination: { include: { subject: true } }, student: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}
