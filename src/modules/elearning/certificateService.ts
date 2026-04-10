import { PrismaClient } from "@prisma/client";
import { NotFoundError, ValidationError } from "../../utils/errors";

export class CertificateService {
  constructor(private prisma: PrismaClient) {}

  async generateCertificate(tenantId: string, courseId: string, studentId: string) {
    const enrollment = await this.prisma.courseEnrollment.findFirst({
      where: { tenantId, courseId, studentId, status: "COMPLETED" },
    });

    if (!enrollment) {
      throw new ValidationError("Course not completed");
    }

    const certificateNumber = `CERT-${Date.now()}-${studentId.slice(0, 8)}`;

    return this.prisma.certificate.create({
      data: {
        tenantId,
        courseId,
        studentId,
        certificateNumber,
      },
      include: { course: true },
    });
  }

  async getCertificates(tenantId: string, studentId: string) {
    return this.prisma.certificate.findMany({
      where: { tenantId, studentId },
      include: { course: true },
      orderBy: { issuedAt: "desc" },
    });
  }

  async verifyCertificate(certificateNumber: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { certificateNumber },
      include: { course: true },
    });

    if (!certificate) {
      throw new NotFoundError("Certificate not found");
    }

    return certificate;
  }
}
