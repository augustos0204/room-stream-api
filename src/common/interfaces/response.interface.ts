/**
 * Generic API response wrapper
 *
 * Used for standardized API responses across the application.
 *
 * @template T - The type of the data payload
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
  statusCode: number;
}

/**
 * Success message response
 *
 * Used for endpoints that return simple success messages.
 */
export interface MessageResponse {
  message: string;
}
