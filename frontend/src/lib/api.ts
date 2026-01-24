/**
 * API utility functions for making authenticated requests
 * Includes network request debouncing to prevent excessive API calls on Android
 */

import { getApiCache, setApiCache } from "@/lib/indexeddb";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Network request debouncing: prevent rapid-fire requests
const REQUEST_DEBOUNCE_MS = 300; // 300ms debounce for same endpoint
const pendingRequests = new Map<string, Promise<any>>();
const requestTimestamps = new Map<string, number>();

/**
 * Generate a request key for debouncing (endpoint + method + body hash)
 */
function getRequestKey(endpoint: string, method: string, body?: string): string {
  const bodyHash = body ? btoa(body).slice(0, 20) : '';
  return `${method}:${endpoint}:${bodyHash}`;
}

/**
 * Debounce network requests to prevent excessive API calls
 * Returns existing promise if same request is made within debounce window
 */
async function debouncedRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const lastRequest = requestTimestamps.get(key);
  
  // If same request was made recently, return the pending promise
  if (lastRequest && (now - lastRequest) < REQUEST_DEBOUNCE_MS) {
    const pending = pendingRequests.get(key);
    if (pending) {
      return pending as Promise<T>;
    }
  }

  // Create new request
  const promise = requestFn().finally(() => {
    // Clean up after request completes
    pendingRequests.delete(key);
    requestTimestamps.delete(key);
  });

  pendingRequests.set(key, promise);
  requestTimestamps.set(key, now);

  return promise;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
}

/** Thrown on 401; api.ts redirects to login before throwing. Do not substitute cache. */
export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/** Keys to clear on 401; keep in sync with authSlice logout. */
const AUTH_STORAGE_KEYS = [
  'offsiteAuth',
  'userRole',
  'userName',
  'userEmail',
  'userPhone',
  'userId',
  'accessToken',
  'loginTimestamp',
] as const;

/** Clear all auth-related localStorage so initializeAuth sees logged-out state. */
export function clearAuthStorage(): void {
  AUTH_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
}

let _redirectingToLogin = false;

/** Redirect to login once, avoid infinite loop from multiple 401s. Exported for raw-fetch 401 handlers (e.g. invoice PDF). */
export function redirectToLogin(): void {
  if (_redirectingToLogin) return;
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  if (path === '/login' || path === '/signup' || path === '/forgot-password') return;
  _redirectingToLogin = true;
  clearAuthStorage();
  window.location.replace('/login');
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
 * Make an authenticated API request with debouncing
 */
export const apiRequest = async <T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const token = getAccessToken();
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const cacheKey = isGet ? getCacheKey(endpoint) : null;
  const requestKey = getRequestKey(endpoint, method, options.body as string);
  
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

  // Debounce the request (except for POST/PUT/PATCH which should not be debounced)
  const makeRequest = async (): Promise<ApiResponse<T>> => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      let data: ApiResponse<T>;
      try {
        data = (await response.json()) as ApiResponse<T>;
      } catch {
        data = { success: false, message: 'Invalid response' };
      }

      if (response.status === 401) {
        redirectToLogin();
        throw new UnauthorizedError(data?.message || 'Session expired. Please log in again.');
      }

      if (!response.ok) {
        throw new Error(data?.message || 'Request failed');
      }

      if (isGet && cacheKey) {
        // Best-effort cache update
        await setApiCache(cacheKey, data);
      }

      return data;
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      // If request fails, fall back to cached GET response (if present)
      if (isGet && cacheKey) {
        const cached = await getApiCache<ApiResponse<T>>(cacheKey);
        if (cached) return cached.response;
      }
      throw error;
    }
  };

  // Only debounce GET requests to prevent duplicate fetches
  if (isGet) {
    return debouncedRequest(requestKey, makeRequest);
  }

  return makeRequest();
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

