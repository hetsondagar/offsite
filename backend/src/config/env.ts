import dotenv from 'dotenv';

dotenv.config();
// Never log secrets (MongoDB URIs often include credentials).

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  
  // MongoDB
  MONGODB_URI: (() => {
    const uri = process.env.MONGODB_URI;
    if (!uri || uri.trim().length === 0) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('MONGODB_URI must be set in production environment');
      }
      throw new Error(
        'MONGODB_URI is missing. Check backend/.env formatting (no spaces around =), then restart the backend.'
      );
    }
    return uri.trim();
  })(),
  
  // JWT
  JWT_ACCESS_SECRET: (() => {
    const secret = process.env.JWT_ACCESS_SECRET || 'change-me-in-production';
    if (secret === 'change-me-in-production' && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_ACCESS_SECRET must be set in production environment');
    }
    return secret;
  })(),
  JWT_REFRESH_SECRET: (() => {
    const secret = process.env.JWT_REFRESH_SECRET || 'change-me-in-production';
    if (secret === 'change-me-in-production' && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_REFRESH_SECRET must be set in production environment');
    }
    return secret;
  })(),
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
  CLOUDINARY_URL: process.env.CLOUDINARY_URL || '',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // CORS - Can be comma-separated list of origins
  // Example: "https://offsite-be-off-the-site.vercel.app,https://another-domain.com"
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
  GMAIL_USER: process.env.GMAIL_USER || '',
  GMAIL_PASS: process.env.GMAIL_PASS || '',
  
  // MapTiler
  MAPTILER_API_KEY: process.env.VITE_MAPTILER_KEY || process.env.MAPTILER_API_KEY || '',
};

