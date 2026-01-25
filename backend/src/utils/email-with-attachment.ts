import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from './logger';

if (!env.GMAIL_USER || !env.GMAIL_PASS) {
  logger.warn('Gmail credentials not found in environment variables. Email sending may fail.');
}

// Use explicit SMTP configuration with port 587 (STARTTLS) for better reliability
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: env.GMAIL_USER,
    pass: env.GMAIL_PASS,
  },
  tls: {
    // Do not fail on invalid certs
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

/**
 * Send email with PDF attachment
 */
export async function sendEmailWithAttachment(
  to: string | string[],
  subject: string,
  html: string,
  text: string,
  attachments: EmailAttachment[]
): Promise<void> {
  try {
    const info = await transporter.sendMail({
      from: `"OffSite" <${env.EMAIL_FROM || env.GMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text,
      attachments: attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType || 'application/pdf',
      })),
    });

    logger.info(`✅ Email with attachment sent successfully to ${Array.isArray(to) ? to.join(', ') : to}`, {
      messageId: info.messageId,
    });
  } catch (error: any) {
    logger.error(`❌ Failed to send email with attachment:`, {
      error: error.message,
      code: error.code,
      command: error.command,
    });
    throw new Error('Failed to send email. Please try again later.');
  }
}
