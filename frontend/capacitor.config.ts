import type { CapacitorConfig } from '@capacitor/cli';

// Get hosted URL from environment variable
// IMPORTANT: Set your hosted URL here or via CAPACITOR_SERVER_URL environment variable
// Example: 'https://offsite.vercel.app' or 'https://your-domain.com'
const HOSTED_URL = 'https://offsite-be-off-the-site.vercel.app/';

// Development mode: Use local dev server for live reload
// Set CAPACITOR_DEV=true to enable, or use npm run dev:android
const isDev = process.env.CAPACITOR_DEV === 'true';
const DEV_SERVER_URL = process.env.CAPACITOR_SERVER_URL || 'http://10.244.103.185:8080'; // Your computer's local IP

const config: CapacitorConfig = {
  appId: 'com.offsite.app',
  appName: 'OffSite',
  // Use local dev server in dev mode, hosted URL in production
  server: isDev ? {
    url: DEV_SERVER_URL,
    androidScheme: 'http',
    cleartext: true, // Allow HTTP in development
    allowNavigation: [
      DEV_SERVER_URL,
      HOSTED_URL,
      // Allow navigation to all domains (for API calls)
      '*',
    ],
  } : {
    url: HOSTED_URL,
    androidScheme: 'https',
    allowNavigation: [
      HOSTED_URL,
      // Allow navigation to all domains (for API calls)
      '*',
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;
