import prisma from '../prisma/client';

export const NotificationService = {
  async sendEmail(to: string, subject: string, body: string) {
    console.log(`[EMAIL] To: ${to}, Subject: ${subject}`);
    // TODO: Integrate with nodemailer/AWS SES
  },

  async notify(tenantId: string, userId: string, message: string, type: string) {
    console.log(`[NOTIFICATION] User: ${userId}, Type: ${type}, Message: ${message}`);
    // Store in-app notification (extend schema if needed)
  }
};
