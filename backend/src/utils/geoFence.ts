/**
 * Geo-fence validation utilities
 * Uses Haversine formula for distance calculation (works offline)
 */

import { calculateDistance } from './calculateDistance';

export interface GeoFence {
  enabled: boolean;
  center: {
    latitude: number;
    longitude: number;
  };
  radiusMeters: number;
  bufferMeters: number; // Default: 20m tolerance
}

export interface GeoFenceValidationResult {
  isInside: boolean;
  distanceFromCenter: number;
  status: 'INSIDE' | 'OUTSIDE';
  violation: boolean;
}

/**
 * Validate if a location is inside the geo-fence
 * @param latitude User's latitude
 * @param longitude User's longitude
 * @param geoFence Geo-fence configuration
 * @returns Validation result with distance and status
 */
export function validateGeoFence(
  latitude: number,
  longitude: number,
  geoFence: GeoFence
): GeoFenceValidationResult {
  if (!geoFence.enabled) {
    // If geo-fence is disabled, always allow (for backward compatibility)
    return {
      isInside: true,
      distanceFromCenter: 0,
      status: 'INSIDE',
      violation: false,
    };
  }

  const distance = calculateDistance(
    latitude,
    longitude,
    geoFence.center.latitude,
    geoFence.center.longitude
  );

  // Allow attendance if within radius + buffer
  const allowedDistance = geoFence.radiusMeters + geoFence.bufferMeters;
  const isInside = distance <= allowedDistance;

  return {
    isInside,
    distanceFromCenter: Math.round(distance),
    status: isInside ? 'INSIDE' : 'OUTSIDE',
    violation: !isInside,
  };
}

/**
 * Get geo-fence from project (supports legacy siteLatitude/siteLongitude)
 * @param project Project document
 * @returns Geo-fence configuration
 */
export function getProjectGeoFence(project: any): GeoFence | null {
  // Prefer new geoFence structure
  if (project.geoFence && project.geoFence.enabled && project.geoFence.center) {
    return {
      enabled: project.geoFence.enabled,
      center: {
        latitude: project.geoFence.center.latitude,
        longitude: project.geoFence.center.longitude,
      },
      radiusMeters: project.geoFence.radiusMeters || 200,
      bufferMeters: project.geoFence.bufferMeters || 20,
    };
  }

  // Fallback to legacy siteLatitude/siteLongitude for backward compatibility
  if (project.siteLatitude && project.siteLongitude && project.siteRadiusMeters) {
    return {
      enabled: true,
      center: {
        latitude: project.siteLatitude,
        longitude: project.siteLongitude,
      },
      radiusMeters: project.siteRadiusMeters,
      bufferMeters: 20, // Default buffer for legacy projects
    };
  }

  return null;
}
