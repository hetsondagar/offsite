import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * MapTiler service for geocoding and reverse geocoding
 * Uses MapTiler Geocoding API to convert coordinates to addresses
 */
export interface GeocodeResult {
  address: string;
  formattedAddress: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
}

/**
 * Reverse geocode: Convert latitude/longitude to human-readable address
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodeResult> {
  try {
    const apiKey = env.MAPTILER_API_KEY;
    if (!apiKey) {
      logger.warn('MapTiler API key not configured, using fallback address');
      return {
        address: 'Location not available',
        formattedAddress: `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        latitude,
        longitude,
      };
    }

    // MapTiler Geocoding API endpoint
    const url = `https://api.maptiler.com/geocoding/${longitude},${latitude}.json?key=${apiKey}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`MapTiler API error: ${response.statusText}`);
    }

    const data = await response.json() as {
      features?: Array<{
        properties?: {
          context?: Record<string, any>;
          [key: string]: any;
        };
        [key: string]: any;
      }>;
    };

    if (!data.features || data.features.length === 0) {
      logger.warn(`No address found for coordinates ${latitude}, ${longitude}`);
      return {
        address: 'Location not found',
        formattedAddress: `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        latitude,
        longitude,
      };
    }

    // Get the first (most relevant) result
    const feature = data.features[0];
    const properties = feature.properties || {};
    const context = properties.context || {};

    // Build formatted address
    const addressParts: string[] = [];
    
    if (properties.house_number) {
      addressParts.push(properties.house_number);
    }
    if (properties.street) {
      addressParts.push(properties.street);
    }
    if (properties.locality) {
      addressParts.push(properties.locality);
    }
    if (context.place?.name) {
      addressParts.push(context.place.name);
    }
    if (context.district?.name) {
      addressParts.push(context.district.name);
    }
    if (context.region?.name) {
      addressParts.push(context.region.name);
    }
    if (context.country?.name) {
      addressParts.push(context.country.name);
    }

    const formattedAddress = addressParts.length > 0 
      ? addressParts.join(', ')
      : properties.label || feature.place_name || 'Unknown location';

    return {
      address: properties.label || formattedAddress,
      formattedAddress,
      city: context.place?.name || properties.locality,
      state: context.region?.name,
      country: context.country?.name || properties.country,
      postalCode: properties.postcode,
      latitude,
      longitude,
    };
  } catch (error: any) {
    logger.error('Error in reverse geocoding:', error);
    // Return fallback with coordinates
    return {
      address: 'Location lookup failed',
      formattedAddress: `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      latitude,
      longitude,
    };
  }
}

/**
 * Forward geocode: Convert address to coordinates (optional, for future use)
 */
export async function geocode(address: string): Promise<GeocodeResult | null> {
  try {
    const apiKey = env.MAPTILER_API_KEY;
    if (!apiKey) {
      return null;
    }

    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.maptiler.com/geocoding/${encodedAddress}.json?key=${apiKey}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`MapTiler API error: ${response.statusText}`);
    }

    const data = await response.json() as {
      features?: Array<{
        geometry: { coordinates: [number, number] };
        properties?: Record<string, any>;
        [key: string]: any;
      }>;
    };

    if (!data.features || data.features.length === 0) {
      return null;
    }

    const feature = data.features[0];
    const [longitude, latitude] = feature.geometry.coordinates;
    const properties = feature.properties || {};

    return {
      address: properties.label || address,
      formattedAddress: properties.label || address,
      latitude,
      longitude,
    };
  } catch (error: any) {
    logger.error('Error in geocoding:', error);
    return null;
  }
}

