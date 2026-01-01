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
  OTP_SECRET: (() => {
    const secret = process.env.OTP_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('OTP_SECRET must be set in production environment');
      }
      return 'mock-otp-secret-dev-only';
    }
    return secret;
  })(),
  OTP_EXPIRY: process.env.OTP_EXPIRY || '5m',
  
  // Cloudinary
  CLOUDINARY_URL: process.env.CLOUDINARY_URL || 'cloudinary://325231953691433:4Z0bNThOPM0iMZuo9PtiwmwnfVc@dkemsv6ho',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || 'dkemsv6ho',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '325231953691433',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '4Z0bNThOPM0iMZuo9PtiwmwnfVc',
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:8080',
  
  // AI / LLM
  HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT || '',
  AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY || '',
  LLM_PROVIDER: (process.env.LLM_PROVIDER || 'openai') as 'openai' | 'gemini' | 'azure',

  // Email (Gmail SMTP App Password recommended)
  EMAIL_FROM: process.env.EMAIL_FROM || process.env.GMAIL_USER || '',
  GMAIL_USER: process.env.GMAIL_USER || 'vraj9112005@gmail.com',
  GMAIL_PASS: process.env.GMAIL_PASS || 'zwtunsognrsoirty',
  
  // MapTiler
  MAPTILER_API_KEY: process.env.VITE_MAPTILER_KEY || process.env.MAPTILER_API_KEY || 'g51nNpCPKcQQstInYAW2',
};

