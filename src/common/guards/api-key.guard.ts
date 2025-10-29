import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private readonly API_KEY = process.env.API_KEY;

  constructor(private reflector: Reflector) {}

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

    // Skip validation if no API_KEY is configured
    if (!this.API_KEY) {
      this.logger.warn(
        'API_KEY not configured in environment variables - API key validation is disabled',
      );
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Try to get API key from multiple sources
    const apiKey =
      request.headers['x-api-key'] ||
      request.headers['authorization']?.replace('Bearer ', '') ||
      request.query.apiKey;

    if (!apiKey) {
      this.logger.warn(
        `API key missing from request: ${request.method} ${request.url}`,
      );
      throw new UnauthorizedException(
        'API key is required. Provide it via x-api-key header, Authorization header, or apiKey query parameter',
      );
    }

    if (apiKey !== this.API_KEY) {
      this.logger.warn(
        `Invalid API key attempt from ${request.ip}: ${request.method} ${request.url}`,
      );
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
