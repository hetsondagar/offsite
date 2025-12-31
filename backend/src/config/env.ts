import dotenv from 'dotenv';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  
  // MongoDB
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/offsite',
  
  // JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'change-me-in-production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'change-me-in-production',
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  
  // OTP
  OTP_SECRET: process.env.OTP_SECRET || 'mock-otp-secret',
  OTP_EXPIRY: process.env.OTP_EXPIRY || '5m',
  
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:8080',
  
  // AI
  HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY || '',

  // Email (Gmail SMTP App Password recommended)
  EMAIL_FROM: process.env.EMAIL_FROM || process.env.GMAIL_USER || '',
  GMAIL_USER: process.env.GMAIL_USER || 'vraj9112005@gmail.com',
  GMAIL_PASS: process.env.GMAIL_PASS || 'zwtunsognrsoirty',
};

