import nodemailer from 'nodemailer';

export type EmailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
};

export async function sendEmail(
  config: EmailConfig,
  to: string[],
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
  });
  await transport.sendMail({
    from: config.from,
    to: to.join(', '),
    subject,
    text: text || html.replace(/<[^>]*>/g, ''),
    html,
  });
}

export function buildJobSuccessEmail(jobName: string, rowsInserted: number, runAt: string): string {
  return `
    <h2>Job executat cu succes</h2>
    <p><strong>Job:</strong> ${jobName}</p>
    <p><strong>Rânduri inserate:</strong> ${rowsInserted}</p>
    <p><strong>Data/Ora:</strong> ${runAt}</p>
  `;
}

export function buildJobErrorEmail(jobName: string, errorMessage: string, runAt: string): string {
  return `
    <h2>Eroare la executarea job-ului</h2>
    <p><strong>Job:</strong> ${jobName}</p>
    <p><strong>Eroare:</strong></p>
    <pre>${errorMessage}</pre>
    <p><strong>Data/Ora:</strong> ${runAt}</p>
  `;
}
