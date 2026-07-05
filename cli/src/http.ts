// HTTP client wrapper for Schemory CLI
// Base URL from environment or config, attaches session token if present

import fetch, { RequestInfo, RequestInit, Response } from 'node-fetch';

/**
 * HTTP response with parsed body
 */
export interface HttpResponse<T = unknown> {
  status: number;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Configuration for the HTTP client
 */
export interface HttpClientConfig {
  apiUrl?: string;
  token?: string;
}

// Default API URL from ARCHITECTURE.md
const DEFAULT_API_URL = 'https://api.schemory.org';

/**
 * Create an HTTP client with configuration
 */
export function createHttpClient(config: HttpClientConfig = {}) {
  const apiUrl = config.apiUrl || DEFAULT_API_URL;
  const token = config.token;

  /**
   * Make an HTTP request to the Schemory API
   */
  async function request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {}
  ): Promise<HttpResponse<T>> {
    const url = `${apiUrl}${path}`;

    // Build request options
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    // Attach Authorization header only when a token is present
    if (token) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    // Add body if provided
    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    try {
      const response: Response = await fetch(url, options);
      const responseData = await response.text();

      if (!response.ok) {
        // Try to parse error response
        try {
          const errorData = responseData ? JSON.parse(responseData) : null;
          if (errorData && errorData.error) {
            return {
              status: response.status,
              error: {
                code: errorData.error.code || 'UNKNOWN_ERROR',
                message: errorData.error.message || 'Unknown error',
                details: errorData.error.details,
              },
            };
          }
          return {
            status: response.status,
            error: {
              code: 'HTTP_ERROR',
              message: responseData || `HTTP ${response.status}`,
            },
          };
        } catch {
          return {
            status: response.status,
            error: {
              code: 'HTTP_ERROR',
              message: responseData || `HTTP ${response.status}`,
            },
          };
        }
      }

      // Parse successful response
      if (responseData) {
        try {
          const data = JSON.parse(responseData);
          return {
            status: response.status,
            data,
          };
        } catch {
          // If response is not JSON, return as-is
          return {
            status: response.status,
            data: responseData as unknown as T,
          };
        }
      }

      return {
        status: response.status,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        status: 0,
        error: {
          code: 'NETWORK_ERROR',
          message: errorMessage,
        },
      };
    }
  }

  return {
    request,
    get: <T = unknown>(path: string, headers?: Record<string, string>) =>
      request<T>('GET', path, undefined, headers),
    post: <T = unknown>(path: string, body?: unknown, headers?: Record<string, string>) =>
      request<T>('POST', path, body, headers),
    put: <T = unknown>(path: string, body?: unknown, headers?: Record<string, string>) =>
      request<T>('PUT', path, body, headers),
    delete: <T = unknown>(path: string, headers?: Record<string, string>) =>
      request<T>('DELETE', path, undefined, headers),
  };
}

/**
 * Default HTTP client instance (can be configured after import)
 * This is a singleton that can be reconfigured with setHttpClientConfig
 */
let defaultClient = createHttpClient();

/**
 * Reconfigure the default HTTP client
 */
export function setHttpClientConfig(config: HttpClientConfig): void {
  defaultClient = createHttpClient(config);
}

/**
 * Get the default HTTP client
 */
export function getHttpClient() {
  return defaultClient;
}

// Export the default client methods directly for convenience
export const http = defaultClient;

export default http;
