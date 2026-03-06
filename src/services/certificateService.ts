import prisma from '../prisma/client';

export class CertificateService {
  static async generateCertificate(tenantId: string, courseId: string, studentId: string) {
    const enrollment = await prisma.courseEnrollment.findFirst({
      where: { tenantId, courseId, studentId, status: 'COMPLETED' }
    });

    if (!enrollment) throw new Error('Course not completed');

    const certificateNumber = `CERT-${Date.now()}-${studentId.slice(0, 8)}`;

    return prisma.certificate.create({
      data: {
        tenantId,
        courseId,
        studentId,
        certificateNumber
      },
      include: { course: true }
    });
  }

  static async getCertificates(tenantId: string, studentId: string) {
    return prisma.certificate.findMany({
      where: { tenantId, studentId },
      include: { course: true },
      orderBy: { issuedAt: 'desc' }
    });
  }

  static async verifyCertificate(certificateNumber: string) {
    return prisma.certificate.findUnique({
      where: { certificateNumber },
      include: { course: true }
    });
  }
}
