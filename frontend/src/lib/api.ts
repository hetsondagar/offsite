/**
 * API utility functions for making authenticated requests
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface ApiResponse<T = any> {
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

/**
 * Make an authenticated API request
 */
export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const token = getAccessToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Check if response is JSON before parsing
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(
      response.status === 404
        ? 'Resource not found'
        : response.status === 401
        ? 'Unauthorized. Please login again.'
        : response.status === 403
        ? 'Access denied'
        : `Server error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status} ${response.statusText}`);
  }

  return data;
};

/**
 * Make an authenticated POST request
 */
export const apiPost = async <T = any>(
  endpoint: string,
  body: any
): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

/**
 * Make an authenticated GET request
 */
export const apiGet = async <T = any>(
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
export const apiPatch = async <T = any>(
  endpoint: string,
  body: any
): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
};

/**
 * Make an authenticated DELETE request
 */
export const apiDelete = async <T = any>(
  endpoint: string
): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, {
    method: 'DELETE',
  });
};

