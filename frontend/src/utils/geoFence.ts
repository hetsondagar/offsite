/**
 * Frontend geo-fence validation utilities
 * Uses Haversine formula (works offline, no API calls)
 */

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export interface GeoFence {
  enabled: boolean;
  center: {
    latitude: number;
    longitude: number;
  };
  radiusMeters: number;
  bufferMeters: number;
}

export interface GeoFenceValidationResult {
  isInside: boolean;
  distanceFromCenter: number;
  status: 'INSIDE' | 'OUTSIDE';
  violation: boolean;
}

/**
 * Validate if a location is inside the geo-fence (client-side, offline-safe)
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
 * Get geo-fence from project (supports legacy and new structure)
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

  // Fallback to legacy siteLatitude/siteLongitude
  if (project.siteLatitude && project.siteLongitude && project.siteRadiusMeters) {
    return {
      enabled: true,
      center: {
        latitude: project.siteLatitude,
        longitude: project.siteLongitude,
      },
      radiusMeters: project.siteRadiusMeters,
      bufferMeters: 20,
    };
  }

  return null;
}
