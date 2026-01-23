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
 * Request location permissions (Android/iOS)
 * Returns true if permission is granted, false otherwise
 */
async function requestLocationPermissions(): Promise<boolean> {
  if (!isNative()) {
    return true; // Browser handles permissions automatically
  }

  try {
    // Check current permission status
    const permissionStatus = await Geolocation.checkPermissions();
    
    if (permissionStatus.location === 'granted') {
      return true;
    }

    // Request permission if not granted
    const requestResult = await Geolocation.requestPermissions();
    return requestResult.location === 'granted';
  } catch (error) {
    console.error('Error requesting location permissions:', error);
    return false;
  }
}

/**
 * Get current position
 * Uses Capacitor Geolocation on native, falls back to browser API on web
 */
export async function getCurrentPosition(
  options?: PositionOptions
): Promise<LocationData> {
  if (isNative()) {
    // Request permissions first on native platforms
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) {
      throw new Error('Location permission denied. Please enable location permissions in app settings.');
    }

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

/**
 * Watch position continuously
 * Returns a watch ID that can be used to clear the watch
 */
export async function watchPosition(
  callback: (location: LocationData) => void,
  errorCallback?: (error: GeolocationPositionError) => void,
  options?: PositionOptions
): Promise<number | string> {
  if (isNative()) {
    // Request permissions first on native platforms
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) {
      const error = new Error('Location permission denied. Please enable location permissions in app settings.') as any;
      error.code = 1; // PERMISSION_DENIED
      errorCallback?.(error as GeolocationPositionError);
      return '';
    }

    // Use Capacitor Geolocation on native
    // Capacitor's watchPosition returns a Promise<CallbackID>
    try {
      const watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: options?.enableHighAccuracy ?? true,
          timeout: options?.timeout ?? 30000,
          maximumAge: options?.maximumAge ?? 10000, // More frequent updates for watch
        },
        (position, err) => {
          if (err) {
            errorCallback?.(err);
            return;
          }
          callback({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude ?? null,
            altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
            heading: position.coords.heading ?? null,
            speed: position.coords.speed ?? null,
          });
        }
      );
      return watchId;
    } catch (error: any) {
      errorCallback?.(error as GeolocationPositionError);
      return '';
    }
  } else {
    // Fallback to browser geolocation on web
    if (!navigator.geolocation) {
      const error = new Error('Geolocation not supported') as any;
      error.code = 0;
      errorCallback?.(error as GeolocationPositionError);
      return -1;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude ?? null,
          altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
          heading: position.coords.heading ?? null,
          speed: position.coords.speed ?? null,
        });
      },
      errorCallback,
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 30000,
        maximumAge: options?.maximumAge ?? 10000, // More frequent updates for watch
      }
    );
    return watchId;
  }
}

/**
 * Clear position watch
 */
export function clearWatch(watchId: number | string): void {
  if (isNative()) {
    Geolocation.clearWatch({ id: watchId as string });
  } else {
    if (typeof watchId === 'number') {
      navigator.geolocation.clearWatch(watchId);
    }
  }
}
