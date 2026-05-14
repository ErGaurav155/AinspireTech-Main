import nodemailer from "nodemailer";

const DEFAULT_FROM_EMAIL = "support@rocketreplai.com";

let transporter: nodemailer.Transporter | null = null;

const getBooleanEnv = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
};

const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || "smtp.hostinger.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = getBooleanEnv(process.env.SMTP_SECURE, port === 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("SMTP_USER and SMTP_PASS are required to send email");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
};

export const getSupportEmail = () =>
  process.env.FROM_EMAIL ||
  process.env.MAIL_FROM ||
  process.env.SMTP_USER ||
  DEFAULT_FROM_EMAIL;

export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  const fromEmail = getSupportEmail();
  const fromName = process.env.MAIL_FROM_NAME || "RocketReplai";

  await getTransporter().sendMail({
    from: `${fromName} <${fromEmail}>`,
    to,
    subject,
    html,
  });
};
