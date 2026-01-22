import { ApiProperty } from '@nestjs/swagger';
import { SupabaseUserInfo } from './joined-room.event';

/**
 * Application data for messages sent via app key
 */
export class ApplicationInfo {
  @ApiProperty({
    description: 'Application ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Application name',
    example: 'My Chat Bot',
  })
  name: string;

  @ApiProperty({
    description: 'User ID who created the application',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  createdBy: string;
}

/**
 * Payload for custom message events (default: 'message')
 * Broadcast to all room participants when a message is sent
 */
export class NewMessageEvent {
  @ApiProperty({
    description: 'Message unique ID',
    example: 'msg_1737550000000_abc123def',
  })
  id: string;

  @ApiProperty({
    description: 'Sender client ID',
    example: 'xW3kJ9pL2mN8qR5t',
  })
  clientId: string;

  @ApiProperty({
    description: 'Sender user ID (if authenticated)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  userId?: string;

  @ApiProperty({
    description: 'Event type',
    example: 'message',
  })
  event: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello everyone!',
  })
  message: string;

  @ApiProperty({
    description: 'Message timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Room ID where message was sent',
    example: 'room_1737550000000_abc123def',
  })
  roomId: string;

  @ApiProperty({
    description: 'Supabase user data if authenticated',
    type: SupabaseUserInfo,
    required: false,
  })
  supabaseUser?: SupabaseUserInfo;

  @ApiProperty({
    description: 'Application data if sent via app key',
    type: ApplicationInfo,
    required: false,
  })
  application?: ApplicationInfo;

  @ApiProperty({
    description: 'Whether the sender is an application',
    example: false,
  })
  isApplication: boolean;
}
