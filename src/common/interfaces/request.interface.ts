import { Request } from 'express';
import { User } from '@supabase/supabase-js';

/**
 * Extended Express Request with authentication data
 *
 * This interface extends the base Express Request type to include
 * typed authentication-related properties used throughout the application.
 */
export interface AuthenticatedRequest extends Request {
  headers: Request['headers'] & {
    'x-api-key'?: string;
    'x-app-key'?: string;
    authorization?: string;
  };
  query: Request['query'] & {
    apiKey?: string;
  };
  user?: User;
  application?: { id: string };
}
