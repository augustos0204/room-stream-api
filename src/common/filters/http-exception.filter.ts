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
 * Standard error response interface
 */
export interface StandardErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
}

/**
 * Global HTTP Exception Filter
 *
 * Catches all HTTP exceptions and formats them into a standardized response.
 * This ensures consistent error messages across the entire REST API.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse();

    // Extract message from exception response
    let message: string | string[];
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

    const errorResponse: StandardErrorResponse = {
      statusCode: status,
      error: this.getErrorName(status),
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log the error for debugging
    this.logger.error(
      `HTTP ${status} Error: ${request.method} ${request.url}`,
      JSON.stringify(errorResponse),
    );

    // Check if request accepts HTML (browser request)
    const acceptsHtml = request.accepts('html');
    
    // Check if route is an API route (from centralized config)
    const isApiRoute = isApiRoutePath(request.path);

    // Render custom error page for browser requests (not API routes)
    if (acceptsHtml && !isApiRoute) {
      const templateName = this.getErrorTemplate(status);
      if (templateName) {
        return response.status(status).render(templateName, {
          statusCode: status,
          error: errorResponse.error,
          message: Array.isArray(message) ? message.join(', ') : message,
          timestamp: errorResponse.timestamp,
          path: errorResponse.path,
        });
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
