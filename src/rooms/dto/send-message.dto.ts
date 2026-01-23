import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

/**
 * DTO for sending a message/event via WebSocket
 *
 * Used by 'emit' WebSocket event
 */
export class SendMessageDto {
  @ApiProperty({
    description: 'Room ID to send the message to',
    example: 'room_1737550000000_abc123def',
  })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({
    description: 'Message content to send',
    example: 'Hello everyone!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Message cannot be empty' })
  message: string;

  @ApiProperty({
    description: 'Custom event name (defaults to "message")',
    example: 'message',
    required: false,
    default: 'message',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z][a-zA-Z0-9_-]*$/, {
    message:
      'Event name must start with a letter and contain only letters, numbers, underscores, or hyphens',
  })
  event?: string = 'message';
}
