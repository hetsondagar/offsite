/**
 * Geolocation wrapper for Capacitor
 * Falls back to browser geolocation on web
 */

import { Geolocation } from '@capacitor/geolocation';
import { isNative } from './capacitor';
import { saveLastKnownLocation } from './indexeddb';

export interface LocationData {
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number | null;
    altitudeAccuracy?: number | null;
    heading?: number | null;
    speed?: number | null;
  };
  timestamp?: number;
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
      const error = new Error('Location permission denied. Please enable location permissions in app settings.') as any;
      error.code = 1; // PERMISSION_DENIED
      throw error;
    }

    try {
      // Use Capacitor Geolocation on native
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 30000,
        maximumAge: options?.maximumAge ?? 60000,
      });

      if (!position || !position.coords) {
        throw new Error('Invalid position data received');
      }

      const locationData = {
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude ?? null,
          altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
          heading: position.coords.heading ?? null,
          speed: position.coords.speed ?? null,
        },
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp ?? Date.now(),
      } as any;
      
      // Save last known location for offline use (don't await to avoid blocking)
      saveLastKnownLocation(
        locationData.latitude,
        locationData.longitude,
        undefined,
        locationData.accuracy
      ).catch(() => {
        // Silent fail - saving last known location is non-critical
      });
      
      return locationData as any;
    } catch (error: any) {
      // Re-throw with proper error code
      if (error.message?.includes('permission') || error.message?.includes('Permission')) {
        const permError = new Error(error.message || 'Location permission denied') as any;
        permError.code = 1; // PERMISSION_DENIED
        throw permError;
      } else if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
        const timeoutError = new Error(error.message || 'Location request timed out') as any;
        timeoutError.code = 3; // TIMEOUT
        throw timeoutError;
      } else if (error.message?.includes('unavailable') || error.message?.includes('Unavailable')) {
        const unavailError = new Error(error.message || 'Location unavailable') as any;
        unavailError.code = 2; // POSITION_UNAVAILABLE
        throw unavailError;
      }
      throw error;
    }
  } else {
    // Fallback to browser geolocation on web
    return new Promise<any>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude ?? null,
              altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
              heading: position.coords.heading ?? null,
              speed: position.coords.speed ?? null,
            },
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp ?? Date.now(),
          } as any;
          
          // Save last known location for offline use (don't await to avoid blocking)
          saveLastKnownLocation(
            locationData.coords.latitude,
            locationData.coords.longitude,
            undefined,
            locationData.coords.accuracy
          ).catch(() => {
            // Silent fail - saving last known location is non-critical
          });
          
          resolve(locationData);
        },
        reject,
        options
      );
    });
  }
}

/**
 * Reverse geocode latitude/longitude to a human readable address.
 * Uses Nominatim (OpenStreetMap) with a graceful fallback to "lat, lon".
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'offsite-app' } });
    if (!res.ok) throw new Error('Reverse geocode failed');
    const data = await res.json();
    if (data && data.display_name) return data.display_name as string;
  } catch (e) {
    // ignore and fallback
  }
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

/**
 * Watch position continuously
 * Returns a watch ID that can be used to clear the watch
 */
export async function watchPosition(
  callback: (location: any) => void,
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
          const locationData = {
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude ?? null,
              altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
              heading: position.coords.heading ?? null,
              speed: position.coords.speed ?? null,
            },
            timestamp: position.timestamp ?? Date.now(),
          } as any;
          
          // Save last known location for offline use (don't await to avoid blocking)
          saveLastKnownLocation(
            locationData.coords.latitude,
            locationData.coords.longitude,
            undefined,
            locationData.coords.accuracy
          ).catch(() => {
            // Silent fail - saving last known location is non-critical
          });
          callback(locationData);
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
        const locationData = {
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude ?? null,
            altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
            heading: position.coords.heading ?? null,
            speed: position.coords.speed ?? null,
          },
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp ?? Date.now(),
        } as any;
        
        // Save last known location for offline use (don't await to avoid blocking)
        saveLastKnownLocation(
          locationData.coords.latitude,
          locationData.coords.longitude,
          undefined,
          locationData.coords.accuracy
        ).catch(() => {
          // Silent fail - saving last known location is non-critical
        });
        
        callback(locationData);
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
