import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key used to identify public routes
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks an endpoint as public (bypasses API key authentication)
 *
 * Use this decorator on controller methods that should be accessible
 * without API key authentication, even when API_KEY is configured.
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('health')
 * getHealth() {
 *   return { status: 'ok' };
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Can also be applied at controller level
 * @Public()
 * @Controller('view')
 * export class ViewsController {
 *   // All routes in this controller are public
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
