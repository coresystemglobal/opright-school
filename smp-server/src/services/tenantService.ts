import prisma from '../prisma/client';
import bcrypt from 'bcryptjs';

export class TenantService {
  static async createTenant(data: {
    name: string;
    subdomain: string;
    adminEmail: string;
    adminPassword: string;
    adminName: string;
  }) {
    const hashedPassword = await bcrypt.hash(data.adminPassword, 12);
    
    return prisma.tenant.create({
      data: {
        name: data.name,
        subdomain: data.subdomain,
        users: {
          create: {
            email: data.adminEmail,
            password: hashedPassword,
            firstName: data.adminName.split(' ')[0],
            lastName: data.adminName.split(' ').slice(1).join(' ') || data.adminName.split(' ')[0]
          }
        }
      },
      include: {
        users: {
          select: { id: true, email: true, firstName: true, lastName: true }
        }
      }
    });
  }

  static async getTenant(subdomain: string) {
    return prisma.tenant.findUnique({
      where: { subdomain },
      include: {
        users: {
          select: { id: true, email: true, firstName: true, lastName: true }
        }
      }
    });
  }
}