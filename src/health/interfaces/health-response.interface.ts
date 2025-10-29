/**
 * Health check response
 *
 * Returned by GET /health endpoint to indicate service status.
 */
export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
}
