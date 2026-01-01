import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';
import { logger } from '../utils/logger';

/**
 * Parse Cloudinary URL or use individual credentials
 * URL format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
 */
function parseCloudinaryConfig() {
  if (env.CLOUDINARY_URL) {
    try {
      // Parse cloudinary://API_KEY:API_SECRET@CLOUD_NAME
      // Example: cloudinary://325231953691433:4Z0bNThOPM0iMZuo9PtiwmwnfVc@dkemsv6ho
      const match = env.CLOUDINARY_URL.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
      
      if (match && match.length === 4) {
        const apiKey = match[1];
        const apiSecret = match[2];
        const cloudName = match[3];

        if (cloudName && apiKey && apiSecret) {
          logger.info('Cloudinary configured from CLOUDINARY_URL');
          return {
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
          };
        }
      } else {
        logger.warn('CLOUDINARY_URL format invalid. Expected: cloudinary://API_KEY:API_SECRET@CLOUD_NAME');
      }
    } catch (error: any) {
      logger.warn('Failed to parse CLOUDINARY_URL, using individual credentials:', error.message);
    }
  }

  // Fallback to individual credentials
  if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
    logger.info('Cloudinary configured from individual credentials');
    return {
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    };
  }

  logger.warn('Cloudinary not configured. Image uploads will fail.');
  return {
    cloud_name: '',
    api_key: '',
    api_secret: '',
  };
}

const config = parseCloudinaryConfig();

cloudinary.config(config);

export { cloudinary };

