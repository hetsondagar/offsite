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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Read response body once (can only be read once)
  const responseText = await response.text();
  
  // Try to parse as JSON - be lenient with content-type checking
  let data: any;
  const contentType = response.headers.get('content-type') || '';
  
  // For successful responses (200-299), always try to parse as JSON
  // For error responses, also try JSON first, then fall back to text
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      // If it's a successful response but not JSON, that's unexpected
      if (response.ok) {
        console.error('Expected JSON but got non-JSON response:', responseText.substring(0, 200));
        throw new Error('Server returned invalid JSON response');
      }
      // For error responses, use the text as error message
      throw new Error(
        response.status === 404
          ? 'Resource not found'
          : response.status === 401
          ? 'Unauthorized. Please login again.'
          : response.status === 403
          ? 'Access denied'
          : responseText || `Server error: ${response.status} ${response.statusText}`
      );
    }
  } else {
    // Empty response
    if (response.ok) {
      return { success: true, message: 'Success', data: null };
    }
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

  // Handle error responses
  if (!response.ok) {
    // Handle 401 Unauthorized - token might be missing or expired
    if (response.status === 401) {
      // Clear potentially invalid token
      const currentToken = getAccessToken();
      if (!currentToken || currentToken.trim() === '') {
        // Token is missing - this shouldn't happen if user is logged in
        console.error('API request failed: No token available in localStorage');
      }
      // Let the error propagate so the caller can handle it (e.g., redirect to login)
    }
    throw new Error(data?.message || data?.error || `Request failed: ${response.status} ${response.statusText}`);
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

