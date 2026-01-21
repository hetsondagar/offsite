/**
 * Geolocation wrapper for Capacitor
 * Falls back to browser geolocation on web
 */

import { Geolocation } from '@capacitor/geolocation';
import { isNative } from './capacitor';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

/**
 * Get current position
 * Uses Capacitor Geolocation on native, falls back to browser API on web
 */
export async function getCurrentPosition(
  options?: PositionOptions
): Promise<LocationData> {
  if (isNative()) {
    // Use Capacitor Geolocation on native
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: options?.enableHighAccuracy ?? true,
      timeout: options?.timeout ?? 30000,
      maximumAge: options?.maximumAge ?? 60000,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude ?? null,
      altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
      heading: position.coords.heading ?? null,
      speed: position.coords.speed ?? null,
    };
  } else {
    // Fallback to browser geolocation on web
    return new Promise<LocationData>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude ?? null,
            altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
            heading: position.coords.heading ?? null,
            speed: position.coords.speed ?? null,
          });
        },
        reject,
        options
      );
    });
  }
}
