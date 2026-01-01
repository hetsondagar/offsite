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

// Verify transporter at startup (non-blocking)
transporter.verify().then(() => {
  logger.info('✅ Nodemailer transporter verified successfully');
}).catch((err) => {
  logger.warn('⚠️ Failed to verify nodemailer transporter:', err.message || err);
  logger.warn('📧 Email sending may fail. Please check:');
  logger.warn('   1. Gmail credentials are correct');
  logger.warn('   2. Gmail App Password is used (not regular password)');
  logger.warn('   3. "Less secure app access" is enabled (if not using App Password)');
  logger.warn('   4. Network/firewall allows connections to smtp.gmail.com:587');
});

export async function sendResetEmail(to: string, token: string): Promise<void> {
  // Use frontend URL from CORS_ORIGIN or default to localhost:8080
  const frontendUrl = env.CORS_ORIGIN || 'http://localhost:8080';
  const resetUrl = `${frontendUrl}/reset-password/${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>You requested a password reset for your OffSite account.</p>
      <p>Click the link below to reset your password:</p>
      <p style="margin: 20px 0;">
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        Or copy and paste this URL into your browser:<br>
        <a href="${resetUrl}" style="color: #007bff; word-break: break-all;">${resetUrl}</a>
      </p>
      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        This link will expire in 15 minutes.<br>
        If you did not request this, you can safely ignore this email.
      </p>
    </div>
  `;

  const text = `
    Password Reset Request
    
    You requested a password reset for your OffSite account.
    
    Click the following link to reset your password:
    ${resetUrl}
    
    This link will expire in 15 minutes.
    
    If you did not request this, you can safely ignore this email.
  `;

  try {
    const info = await transporter.sendMail({
      from: `"OffSite" <${env.EMAIL_FROM || env.GMAIL_USER}>`,
      to,
      subject: 'Reset your OffSite password',
      html,
      text, // Plain text version for email clients that don't support HTML
    });

    logger.info(`✅ Password reset email sent successfully to ${to}`, {
      messageId: info.messageId,
    });
  } catch (error: any) {
    logger.error(`❌ Failed to send password reset email to ${to}:`, {
      error: error.message,
      code: error.code,
      command: error.command,
    });
    
    // Re-throw the error so the caller knows it failed
    // But don't reveal the error to the user (security best practice)
    throw new Error('Failed to send password reset email. Please try again later.');
  }
}
