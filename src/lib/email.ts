import 'server-only';

/**
 * Optional email notifications. Active only when SMTP_* env vars are configured:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 * Failures are logged and never break the main flow.
 */
export function emailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!emailConfigured() || !to) return false;
  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html });
    return true;
  } catch (e) {
    console.error('email send failed:', (e as Error).message);
    return false;
  }
}
