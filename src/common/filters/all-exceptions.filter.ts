import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { isApiRoutePath } from '../config/api-routes.config';

/**
 * Global All Exceptions Filter
 *
 * Catches ALL exceptions (including non-HTTP errors) and formats them appropriately.
 * This ensures that even unexpected errors (like EJS parsing errors) are handled gracefully.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code and message
    let status: number;
    let message: string | string[];
    let errorName: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Extract message from exception response
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        const responseMessage = (exceptionResponse as any).message;
        message = Array.isArray(responseMessage)
          ? responseMessage
          : typeof responseMessage === 'string'
            ? responseMessage
            : exception.message;
      } else {
        message = exception.message;
      }

      errorName = this.getErrorName(status);
    } else {
      // Non-HTTP exception (e.g., EJS parsing error, database error, etc.)
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message =
        exception instanceof Error
          ? exception.message
          : 'Ocorreu um erro interno no servidor';
      errorName = 'Internal Server Error';

      // Log full error details for debugging
      this.logger.error(
        `Unhandled Exception: ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : exception,
      );
    }

    const errorResponse = {
      statusCode: status,
      error: errorName,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Check if request accepts HTML (browser request)
    const acceptsHtml = request.accepts('html');

    // Check if route is an API route (from centralized config)
    const isApiRoute = isApiRoutePath(request.path);

    // Render custom error page for browser requests (not API routes)
    if (acceptsHtml && !isApiRoute) {
      const templateName = this.getErrorTemplate(status);
      if (templateName) {
        try {
          return response.status(status).render(templateName, {
            statusCode: status,
            error: errorResponse.error,
            messages: Array.isArray(message) ? message : [message],
            timestamp: errorResponse.timestamp,
            path: errorResponse.path,
            isDevelopment: process.env.NODE_ENV !== 'production',
          });
        } catch (renderError) {
          // If rendering error page fails, fall back to JSON
          this.logger.error(
            `Failed to render error template '${templateName}':`,
            renderError,
          );
          return response.status(status).json(errorResponse);
        }
      }
    }

    // Default JSON response for API routes or non-browser requests
    response.status(status).json(errorResponse);
  }

  /**
   * Get EJS template name for error page based on status code
   * Returns null if no custom template exists
   */
  private getErrorTemplate(status: number): string | null {
    switch (status) {
      case HttpStatus.NOT_FOUND:
        return '404';
      case HttpStatus.FORBIDDEN:
        return '403';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return '500';
      default:
        return null; // Use JSON response for other errors
    }
  }

  /**
   * Get standardized error name from HTTP status code
   */
  private getErrorName(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad Request';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.NOT_FOUND:
        return 'Not Found';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'Unprocessable Entity';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'Internal Server Error';
      default:
        return 'Error';
    }
  }
}
