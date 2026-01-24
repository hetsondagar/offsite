/**
 * Application configuration
 * Centralized config for API keys and other settings
 */

/**
 * Get MapTiler API key
 * Falls back to default key if not set in environment
 */
export function getMapTilerKey(): string {
  // Try to get from environment variable (set at build time)
  const envKey = import.meta.env.VITE_MAPTILER_KEY;
  
  if (envKey && envKey.trim() && envKey !== 'undefined') {
    return envKey;
  }
  
  // Fallback to default key (public demo key)
  // In production, this should be set via VITE_MAPTILER_KEY environment variable
  return 'g51nNpCPKcQQstInYAW2';
}

/**
 * Get API base URL
 */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
}
