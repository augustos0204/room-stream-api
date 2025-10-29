import type { AuthenticatedRequest } from '../interfaces';

/**
 * Utility class for extracting API keys from various request sources
 *
 * This utility provides a centralized method to extract API keys from:
 * - x-api-key header
 * - Authorization header (Bearer token)
 * - apiKey query parameter
 */
export class ApiKeyExtractor {
  /**
   * Extracts API key from request
   *
   * Checks multiple sources in order of preference:
   * 1. x-api-key header
   * 2. Authorization header (removes "Bearer " prefix)
   * 3. apiKey query parameter
   *
   * @param request - The authenticated request object
   * @returns The extracted API key or undefined if not found
   */
  static extract(request: AuthenticatedRequest): string | undefined {
    return (
      request.headers['x-api-key'] ||
      request.headers.authorization?.replace('Bearer ', '') ||
      (request.query.apiKey as string)
    );
  }
}
