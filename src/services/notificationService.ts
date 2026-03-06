const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function getBrevoConfig() {
  return {
    apiKey: process.env.BREVO_API_KEY,
    fromEmail: process.env.BREVO_FROM_EMAIL,
    fromName: process.env.BREVO_FROM_NAME || "School SaaS",
  };
}

export const NotificationService = {
  async sendEmail(to: string, subject: string, body: string) {
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
        htmlContent: `<p>${body.replace(/\n/g, "<br/>")}</p>`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brevo email failed (${response.status}): ${errorText}`);
    }
  },

  async notify(tenantId: string, userId: string, message: string, type: string) {
    console.log(`[NOTIFICATION] Tenant: ${tenantId}, User: ${userId}, Type: ${type}, Message: ${message}`);
    // Store in-app notification (extend schema if needed)
  }
};
