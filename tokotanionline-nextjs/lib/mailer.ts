import nodemailer from 'nodemailer';

type SendMailArgs = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const from = process.env.EMAIL_FROM || user;

  return { host, port, user, pass, secure, from };
}

export async function sendMail({ to, subject, text, html }: SendMailArgs) {
  const { host, port, user, pass, secure, from } = getSmtpConfig();

  // Production-grade: Throw error if SMTP not configured
  if (!host || !user || !pass || !from) {
    throw new Error(
      'SMTP not configured. Required: SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM'
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  // Verify connection before sending
  await transporter.verify();

  const result = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });

  return result;
}


