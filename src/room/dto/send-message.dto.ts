import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for sending a message via WebSocket
 *
 * Used by 'sendMessage' WebSocket event
 */
export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty({ message: 'Message cannot be empty' })
  // @MaxLength(1000, { message: 'Message too long (max 1000 characters)' })
  message: string;
}
