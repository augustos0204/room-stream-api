import { Request } from 'express';

/**
 * Extended Express Request with authentication data
 *
 * This interface extends the base Express Request type to include
 * typed authentication-related properties used throughout the application.
 */
export interface AuthenticatedRequest extends Request {
  headers: Request['headers'] & {
    'x-api-key'?: string;
    authorization?: string;
  };
  query: Request['query'] & {
    apiKey?: string;
  };
}
