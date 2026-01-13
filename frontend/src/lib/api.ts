/**
 * API utility functions for making authenticated requests
 */

import { getApiCache, setApiCache } from "@/lib/indexeddb";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
}

/**
 * Get access token from localStorage
 */
const getAccessToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

const getCacheKey = (endpoint: string): string => {
  const token = getAccessToken();
  const tokenSuffix = token ? token.slice(-12) : 'anon';
  return `${tokenSuffix}:${API_BASE_URL}${endpoint}`;
};

/**
 * Make an authenticated API request
 */
export const apiRequest = async <T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const token = getAccessToken();
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const cacheKey = isGet ? getCacheKey(endpoint) : null;
  
  // Build headers object
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Merge any existing headers from options (but don't override Authorization if we have a token)
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        // Don't override Authorization if we have a token
        if (key.toLowerCase() !== 'authorization' || !token) {
          headers[key] = value;
        }
      });
    } else if (Array.isArray(options.headers)) {
      // Handle array of [key, value] pairs
      options.headers.forEach(([key, value]) => {
        if (key.toLowerCase() !== 'authorization' || !token) {
          headers[key] = value;
        }
      });
    } else {
      // Plain object
      Object.entries(options.headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'authorization' || !token) {
          headers[key] = String(value);
        }
      });
    }
  }

  // Always set Authorization header last if token exists (ensures it's never overridden)
  if (token && token.trim()) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  } else {
    // Log warning if token is missing for debugging
    console.warn('API request made without authentication token:', endpoint);
  }

  // Offline-first: for GETs, return cached response when offline
  if (isGet && cacheKey && !navigator.onLine) {
    const cached = await getApiCache<ApiResponse<T>>(cacheKey);
    if (cached) return cached.response;
    throw new Error('Offline and no cached data available');
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = (await response.json()) as ApiResponse<T>;

    if (!response.ok) {
      throw new Error(data?.message || 'Request failed');
    }

    if (isGet && cacheKey) {
      // Best-effort cache update
      await setApiCache(cacheKey, data);
    }

    return data;
  } catch (error) {
    // If request fails, fall back to cached GET response (if present)
    if (isGet && cacheKey) {
      const cached = await getApiCache<ApiResponse<T>>(cacheKey);
      if (cached) return cached.response;
    }
    throw error;
  }
};

/**
 * Make an authenticated POST request
 */
export const apiPost = async <T = unknown>(
  endpoint: string,
  body: unknown
): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

/**
 * Make an authenticated GET request
 */
export const apiGet = async <T = unknown>(
  endpoint: string,
  params?: Record<string, string | number>
): Promise<ApiResponse<T>> => {
  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    url += `?${searchParams.toString()}`;
  }
  
  return apiRequest<T>(url, {
    method: 'GET',
  });
};

/**
 * Make an authenticated PATCH request
 */
export const apiPatch = async <T = unknown>(
  endpoint: string,
  body: unknown
): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
};

/**
 * Make an authenticated PUT request
 */
export const apiPut = async <T = unknown>(
  endpoint: string,
  body: unknown
): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
};

/**
 * Make an authenticated DELETE request
 */
export const apiDelete = async <T = unknown>(
  endpoint: string
): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, {
    method: 'DELETE',
  });
};

