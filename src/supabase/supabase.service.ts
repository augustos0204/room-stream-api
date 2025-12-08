import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient;

  onModuleInit() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn(
        'Supabase credentials not configured. Authentication will be disabled.',
      );
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.logger.log('Supabase client initialized successfully');
  }

  /**
   * Validates a JWT token and returns the authenticated user
   * @param token - JWT token from Authorization header
   * @returns User object if valid, null otherwise
   */
  async validateToken(token: string): Promise<User | null> {
    if (!this.supabase) {
      return null;
    }

    try {
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser(token);

      if (error) {
        this.logger.debug(`Token validation failed: ${error.message}`);
        return null;
      }

      return user;
    } catch (error) {
      this.logger.error('Error validating token', error);
      return null;
    }
  }

  /**
   * Checks if Supabase authentication is enabled
   */
  isEnabled(): boolean {
    return !!this.supabase;
  }

  /**
   * Gets the Supabase client instance
   * @returns SupabaseClient instance or null if not configured
   */
  getClient(): SupabaseClient | null {
    return this.supabase;
  }
}
