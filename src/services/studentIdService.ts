import { PrismaClient, IdSequenceType } from "@prisma/client";

export class StudentIdService {
  constructor(private prisma: PrismaClient) {}

  async generateStudentId(tenantId: string, schoolCode: string): Promise<string> {
    const seq = await this.nextSequence(tenantId, IdSequenceType.STUDENT);
    return this.format(schoolCode, seq);
  }

  async generateCandidateId(tenantId: string, schoolCode: string): Promise<string> {
    const seq = await this.nextSequence(tenantId, IdSequenceType.CANDIDATE);
    const year = new Date().getFullYear() % 100;
    const yy = String(year).padStart(2, "0");
    const nn = String(seq).padStart(4, "0");
    return `${schoolCode.toUpperCase()}C${yy}${nn}`;
  }

  private async nextSequence(tenantId: string, type: IdSequenceType): Promise<number> {
    const year = new Date().getFullYear() % 100;
    const row = await this.prisma.idSequence.upsert({
      where: { tenantId_type_year: { tenantId, type, year } },
      create: { tenantId, type, year, lastSeq: 1 },
      update: { lastSeq: { increment: 1 } },
    });
    return row.lastSeq;
  }

  private format(schoolCode: string, seq: number): string {
    const year = new Date().getFullYear() % 100;
    const yy = String(year).padStart(2, "0");
    const nn = String(seq).padStart(4, "0");
    return `${schoolCode.toUpperCase()}${yy}${nn}`;
  }

  /**
   * Extracts the school code prefix from a student ID (e.g. "GWD250042" → "GWD").
   * Format: {LETTERS}{2-digit-year}{4-digit-seq}
   */
  static extractSchoolCode(studentId: string): string | null {
    const match = studentId.toUpperCase().match(/^([A-Z]+)\d{6}$/);
    return match ? match[1] : null;
  }
}
