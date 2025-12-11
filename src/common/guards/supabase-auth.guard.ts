import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SupabaseService } from '../../supabase/supabase.service';
import { ApiKeyExtractor } from '../utils/api-key-extractor.util';

/**
 * Guard for authenticating requests using Supabase JWT tokens
 *
 * This guard works in combination with ApiKeyGuard:
 * - Applied globally in main.ts
 * - Validates Supabase JWT tokens from Authorization header
 * - Can be bypassed with @Public() decorator
 * - Skipped if API Key is already provided (either/or authentication)
 * - Automatically disabled if SUPABASE_URL or SUPABASE_ANON_KEY not configured
 *
 * Authentication logic:
 * - If API Key is provided → Supabase token is optional
 * - If API Key is NOT provided → Supabase token is required
 *
 * Token must be provided via Authorization header:
 * Authorization: Bearer <token>
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly API_KEY = process.env.API_KEY;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Check if the route is marked as @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), // Method-level decorator
      context.getClass(), // Controller-level decorator
    ]);

    if (isPublic) {
      return true; // Bypass authentication for public routes
    }

    if (!this.supabaseService.isEnabled()) {
      return true;
    }

    if (this.API_KEY) {
      const request = context.switchToHttp().getRequest();
      const apiKey = ApiKeyExtractor.extract(request);

      if (apiKey === this.API_KEY) {
        return true;
      }
    }

    return this.validateSupabaseToken(context);
  }

  private async validateSupabaseToken(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException(
        'Supabase authentication token is required. Provide it via Authorization header (Bearer token)',
      );
    }

    const user = await this.supabaseService.validateToken(token);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired Supabase token');
    }

    request.user = user;

    return true;
  }

  /**
   * Extracts JWT token from Authorization header
   */
  private extractToken(request: any): string | null {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    return authHeader.substring(7);
  }
}
