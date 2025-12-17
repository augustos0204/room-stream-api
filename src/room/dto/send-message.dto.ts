import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

/**
 * DTO for sending a message/event via WebSocket
 *
 * Used by 'emit' WebSocket event
 */
export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty({ message: 'Message cannot be empty' })
  // @MaxLength(1000, { message: 'Message too long (max 1000 characters)' })
  message: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z][a-zA-Z0-9_-]*$/, {
    message: 'Event name must start with a letter and contain only letters, numbers, underscores, or hyphens',
  })
  event?: string = 'message';
}
