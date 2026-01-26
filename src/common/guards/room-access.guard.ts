import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { ApplicationService } from '../../application/application.service';
import { ApiKeyExtractor } from '../utils/api-key-extractor.util';
import type { AuthenticatedRequest } from '../interfaces';

@Injectable()
export class RoomAccessGuard implements CanActivate {
  private readonly API_KEY = process.env.API_KEY;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly applicationService: ApplicationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const appKey = request.headers['x-app-key'] as string | undefined;
    if (appKey) {
      const application = await this.applicationService.validateApiKey(appKey);
      if (!application) {
        throw new UnauthorizedException('Invalid or inactive application key');
      }
      request.application = application;
      return true;
    }

    const apiKey = ApiKeyExtractor.extract(request);
    if (this.API_KEY && apiKey) {
      if (apiKey !== this.API_KEY) {
        throw new UnauthorizedException('Invalid API key');
      }
      return true;
    }

    if (this.supabaseService.isEnabled()) {
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

    if (this.API_KEY) {
      throw new UnauthorizedException(
        'API key is required. Provide it via x-api-key header or apiKey query parameter',
      );
    }

    return true;
  }

  private extractToken(request: AuthenticatedRequest): string | null {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    return authHeader.substring(7);
  }
}
