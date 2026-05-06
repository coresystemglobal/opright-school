import { buildEmail, type EmailTemplateVars } from '../templates/emailTemplates';
import prisma from '../prisma/client';
import { NotificationModuleService } from '../modules/notifications/service';

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function getBrevoConfig() {
  return {
    apiKey: process.env.BREVO_API_KEY,
    fromEmail: process.env.BREVO_FROM_EMAIL,
    fromName: process.env.BREVO_FROM_NAME || "School SaaS",
  };
}

export const NotificationService = {
  async sendEmail(to: string, subject: string, body: string, htmlContent?: string) {
    const { apiKey, fromEmail, fromName } = getBrevoConfig();

    if (!apiKey || !fromEmail) {
      console.warn("Brevo email skipped: BREVO_API_KEY or BREVO_FROM_EMAIL is not configured.");
      return;
    }

    const fetchFn = (globalThis as any).fetch;
    if (!fetchFn) {
      throw new Error("Fetch API is unavailable in this runtime.");
    }

    const response = await fetchFn(BREVO_API_URL, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName },
        to: [{ email: to }],
        subject,
        textContent: body,
        htmlContent: htmlContent ?? `<p>${body.replace(/\n/g, "<br/>")}</p>`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brevo email failed (${response.status}): ${errorText}`);
    }
  },

  /**
   * Send a typed, themed email using one of the HTML templates in src/templates/emails/.
   * The subject line is derived automatically from the template vars.
   *
   * @example
   * await NotificationService.sendTemplatedEmail('parent@example.com', {
   *   type: 'attendance-alert',
   *   parentName: 'Mrs Obi',
   *   studentName: 'Emeka Obi',
   *   // … other vars
   * });
   */
  async sendTemplatedEmail(to: string, vars: EmailTemplateVars) {
    const { subject, html } = buildEmail(vars);
    await NotificationService.sendEmail(to, subject, subject, html);
  },

  async notify(tenantId: string, userId: string, message: string, type: string, link?: string) {
    const svc = new NotificationModuleService(prisma);
    await svc.send(tenantId, userId, { title: type, body: message, type, link });
  }
};
