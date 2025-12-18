/**
 * API Routes Configuration
 * 
 * Centralized configuration for routes that should always return JSON responses
 * (even for browser requests). Used by HttpExceptionFilter to determine
 * whether to render EJS error pages or return JSON.
 * 
 * Add route prefixes here instead of hardcoding in the filter.
 */

export const API_ROUTE_PREFIXES = [
  '/room',      // Room API endpoints
  '/metrics',   // Metrics endpoints
  '/health',    // Health check endpoint
  '/api',       // Generic API prefix (if used in future)
  '/application'
] as const;

/**
 * Check if a given path matches any API route prefix
 */
export function isApiRoutePath(path: string): boolean {
  return API_ROUTE_PREFIXES.some(prefix => {
    // For other prefixes, check if path starts with prefix
    if (path.includes(prefix)) {
      return path.startsWith(prefix);
    }
    
    return false;
  });
}
