import { Prisma, PrismaClient } from "@prisma/client";
import { CacheService } from "../../utils/cache";
import { EncryptionService } from "../../utils/encryption";
import { NotificationService } from "../../services/notificationService";

type CreateHealthRecordData = {
  studentId: string;
  bloodGroup?: string;
  allergies?: string;
  conditions?: string;
  emergencyContact?: Record<string, unknown>;
};

type UpdateHealthRecordData = Partial<Omit<CreateHealthRecordData, "studentId">>;

type RecordIncidentData = {
  healthRecordId: string;
  date?: Date;
  description: string;
  treatment?: string;
  treatedBy?: string;
};

type RecordVaccinationData = {
  healthRecordId: string;
  vaccineName: string;
  date: Date;
  nextDue?: Date;
};

export class HealthService {
  constructor(private prisma: PrismaClient) {}

  async createHealthRecord(tenantId: string, data: CreateHealthRecordData) {
    const encrypted = {
      ...data,
      tenantId,
      allergies: data.allergies ? EncryptionService.encrypt(data.allergies) : null,
      conditions: data.conditions ? EncryptionService.encrypt(data.conditions) : null,
      emergencyContact: data.emergencyContact
        ? EncryptionService.encrypt(JSON.stringify(data.emergencyContact))
        : null,
    };
    const record = await this.prisma.healthRecord.create({
      data: encrypted as Prisma.HealthRecordUncheckedCreateInput,
    });

    await CacheService.del(tenantId, "health", data.studentId);
    return record;
  }

  async getHealthRecord(tenantId: string, studentId: string) {
    const cached = await CacheService.get(tenantId, "health", studentId);
    if (cached) return cached;
    
    const record = await this.prisma.healthRecord.findFirst({
      where: { tenantId, studentId },
      include: { incidents: true, vaccinations: true }
    });
    if (!record) return null;
    
    const decrypted = {
      ...record,
      allergies: record.allergies ? EncryptionService.decrypt(record.allergies) : null,
      conditions: record.conditions ? EncryptionService.decrypt(record.conditions) : null,
      emergencyContact: record.emergencyContact
        ? JSON.parse(EncryptionService.decrypt(record.emergencyContact as string))
        : null,
    };
    await CacheService.set(tenantId, "health", decrypted, 300, studentId);
    return decrypted;
  }

  async updateHealthRecord(
    tenantId: string,
    studentId: string,
    data: UpdateHealthRecordData
  ) {
    const record = await this.prisma.healthRecord.findFirst({
      where: { tenantId, studentId },
      select: { id: true },
    });

    if (!record) {
      throw new Error("Health record not found");
    }

    const encrypted: Prisma.HealthRecordUncheckedUpdateInput = {};
    if (data.allergies) encrypted.allergies = EncryptionService.encrypt(data.allergies);
    if (data.conditions) encrypted.conditions = EncryptionService.encrypt(data.conditions);
    if (data.emergencyContact) {
      encrypted.emergencyContact = EncryptionService.encrypt(
        JSON.stringify(data.emergencyContact)
      );
    }
    if (data.bloodGroup) encrypted.bloodGroup = data.bloodGroup;
    const updated = await this.prisma.healthRecord.update({
      where: { id: record.id },
      data: encrypted,
    });

    await CacheService.del(tenantId, "health", studentId);
    return updated;
  }

  async recordIncident(tenantId: string, data: RecordIncidentData) {
    const incident = await this.prisma.medicalIncident.create({
      data: { ...data, tenantId },
      include: { healthRecord: true },
    });

    await Promise.all([
      CacheService.del(tenantId, "health", incident.healthRecord.studentId),
      NotificationService.notify(
        tenantId,
        incident.healthRecord.studentId,
        `Medical incident recorded: ${data.description}`,
        "health"
      ),
    ]);

    return incident;
  }

  async getIncidents(tenantId: string, healthRecordId: string) {
    return this.prisma.medicalIncident.findMany({
      where: { tenantId, healthRecordId },
      orderBy: { date: 'desc' }
    });
  }

  async recordVaccination(tenantId: string, data: RecordVaccinationData) {
    const vaccination = await this.prisma.vaccination.create({
      data: { ...data, tenantId },
      include: { healthRecord: true },
    });

    await CacheService.del(tenantId, "health", vaccination.healthRecord.studentId);
    return vaccination;
  }

  async getVaccinations(tenantId: string, healthRecordId: string) {
    return this.prisma.vaccination.findMany({
      where: { tenantId, healthRecordId },
      orderBy: { date: 'desc' }
    });
  }
}
