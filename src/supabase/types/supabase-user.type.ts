import { User } from '@supabase/supabase-js';

/**
 * Extended request object with authenticated Supabase user
 */
export interface RequestWithUser extends Request {
  user: User;
}
