import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from './logger';

if (!env.GMAIL_USER || !env.GMAIL_PASS) {
  logger.warn('Gmail credentials not found in environment variables. Email sending may fail.');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.GMAIL_USER,
    pass: env.GMAIL_PASS,
  },
});

// Verify transporter at startup (non-blocking)
transporter.verify().then(() => {
  logger.info('Nodemailer transporter verified');
}).catch((err) => {
  logger.warn('Failed to verify nodemailer transporter', err.message || err);
});

export async function sendResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `http://localhost:${env.PORT}/reset-password/${token}`;

  const html = `
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>This link will expire in 15 minutes.</p>
    <p>If you did not request this, you can safely ignore this email.</p>
  `;

  await transporter.sendMail({
    from: env.EMAIL_FROM || env.GMAIL_USER,
    to,
    subject: 'Reset your password',
    html,
  });
}
