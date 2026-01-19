import { ApiProperty } from '@nestjs/swagger';

/**
 * Payload for custom message events (default: 'message')
 * Broadcast to all room participants when a message is sent
 */
export class NewMessageEvent {
  @ApiProperty({ description: 'Message unique ID', example: 'msg_1234567890_abc123' })
  id: string;

  @ApiProperty({ description: 'Sender client ID', example: 'xyz789' })
  clientId: string;

  @ApiProperty({ description: 'Sender user ID (if authenticated)', example: '550e8400-e29b-41d4-a716-446655440000', required: false })
  userId?: string;

  @ApiProperty({ description: 'Event type', example: 'message' })
  event: string;

  @ApiProperty({ description: 'Message content', example: 'Hello everyone!' })
  message: string;

  @ApiProperty({ description: 'Message timestamp', example: '2024-01-15T10:30:00.000Z' })
  timestamp: Date;

  @ApiProperty({ description: 'Room ID where message was sent', example: 'room_1234567890_abc123' })
  roomId: string;

  @ApiProperty({ description: 'Supabase user data if authenticated', required: false })
  supabaseUser?: {
    id: string;
    email: string | null;
    name: string | null;
  };

  @ApiProperty({ description: 'Application data if sent via app key', required: false })
  application?: {
    id: string;
    name: string;
    createdBy: string;
  };

  @ApiProperty({ description: 'Whether the sender is an application', example: false })
  isApplication: boolean;
}
