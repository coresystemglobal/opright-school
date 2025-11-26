import prisma from '../prisma/client';
import { EncryptionService } from '../utils/encryption';
import { NotificationService } from './notificationService';
import { CacheService } from '../utils/cache';

export const HealthService = {
  async createHealthRecord(tenantId: string, data: any) {
    const encrypted = {
      ...data,
      tenantId,
      allergies: data.allergies ? EncryptionService.encrypt(data.allergies) : null,
      conditions: data.conditions ? EncryptionService.encrypt(data.conditions) : null,
      emergencyContact: data.emergencyContact ? EncryptionService.encrypt(JSON.stringify(data.emergencyContact)) : null
    };
    return prisma.healthRecord.create({ data: encrypted });
  },

  async getHealthRecord(tenantId: string, studentId: string) {
    const cacheKey = `health:${tenantId}:${studentId}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;
    
    const record = await prisma.healthRecord.findUnique({
      where: { studentId },
      include: { incidents: true, vaccinations: true }
    });
    if (!record) return null;
    
    const decrypted = {
      ...record,
      allergies: record.allergies ? EncryptionService.decrypt(record.allergies) : null,
      conditions: record.conditions ? EncryptionService.decrypt(record.conditions) : null,
      emergencyContact: record.emergencyContact ? JSON.parse(EncryptionService.decrypt(record.emergencyContact as string)) : null
    };
    await CacheService.set(cacheKey, decrypted, 300);
    return decrypted;
  },

  async updateHealthRecord(tenantId: string, studentId: string, data: any) {
    const encrypted: any = {};
    if (data.allergies) encrypted.allergies = EncryptionService.encrypt(data.allergies);
    if (data.conditions) encrypted.conditions = EncryptionService.encrypt(data.conditions);
    if (data.emergencyContact) encrypted.emergencyContact = EncryptionService.encrypt(JSON.stringify(data.emergencyContact));
    if (data.bloodGroup) encrypted.bloodGroup = data.bloodGroup;
    return prisma.healthRecord.update({ where: { studentId }, data: encrypted });
  },

  async recordIncident(tenantId: string, data: any) {
    const incident = await prisma.medicalIncident.create({ data: { ...data, tenantId }, include: { healthRecord: true } });
    await NotificationService.notify(tenantId, incident.healthRecord.studentId, `Medical incident recorded: ${data.description}`, 'health');
    return incident;
  },

  async getIncidents(tenantId: string, healthRecordId: string) {
    return prisma.medicalIncident.findMany({
      where: { tenantId, healthRecordId },
      orderBy: { date: 'desc' }
    });
  },

  async recordVaccination(tenantId: string, data: any) {
    return prisma.vaccination.create({ data: { ...data, tenantId } });
  },

  async getVaccinations(tenantId: string, healthRecordId: string) {
    return prisma.vaccination.findMany({
      where: { tenantId, healthRecordId },
      orderBy: { date: 'desc' }
    });
  }
};
