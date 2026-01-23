import { ApiProperty } from '@nestjs/swagger';

/**
 * Payload for 'error' event
 * Sent to client when an error occurs
 */
export class ErrorEvent {
  @ApiProperty({ description: 'Error message', example: 'Sala não encontrada' })
  message: string;
}
