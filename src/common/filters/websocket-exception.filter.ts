import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * Standard WebSocket error response interface
 */
export interface StandardWsErrorResponse {
  status: 'error';
  message: string | string[];
  timestamp: string;
  event?: string;
}

/**
 * Global WebSocket Exception Filter
 *
 * Catches all WebSocket exceptions and formats them into a standardized response.
 * This ensures consistent error messages across WebSocket events.
 */
@Catch(WsException)
export class WsExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  catch(exception: WsException, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    const data = host.switchToWs().getData();

    const error = exception.getError();
    const message = typeof error === 'string' ? error : (error as any).message;

    const errorResponse: StandardWsErrorResponse = {
      status: 'error',
      message,
      timestamp: new Date().toISOString(),
      event: data?.event || 'unknown',
    };

    // Log the error for debugging
    this.logger.error(
      `WebSocket Error: Client ${client.id}`,
      JSON.stringify(errorResponse),
    );

    // Emit standardized error to client
    client.emit('exception', errorResponse);
  }
}
