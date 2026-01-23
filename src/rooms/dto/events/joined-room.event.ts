import { ApiProperty } from '@nestjs/swagger';

/**
 * Supabase user data for authenticated participants
 */
export class SupabaseUserInfo {
  @ApiProperty({
    description: 'Supabase user ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
    nullable: true,
  })
  email: string | null;

  @ApiProperty({
    description: 'User display name',
    example: 'John Doe',
    nullable: true,
  })
  name: string | null;
}

/**
 * Participant information in a room
 */
export class ParticipantInfo {
  @ApiProperty({
    description: 'Client socket ID or user ID',
    example: 'xW3kJ9pL2mN8qR5t',
  })
  clientId: string;

  @ApiProperty({
    description: 'Participant display name',
    example: 'John Doe',
    nullable: true,
  })
  name: string | null;

  @ApiProperty({
    description: 'Supabase user data if authenticated',
    type: SupabaseUserInfo,
    required: false,
  })
  supabaseUser?: SupabaseUserInfo;
}

/**
 * Recent message in room history
 */
export class RecentMessage {
  @ApiProperty({ description: 'Message unique ID', example: 'msg_1234567890_abc123' })
  id: string;

  @ApiProperty({ description: 'Sender client ID', example: 'xyz789' })
  clientId: string;

  @ApiProperty({ description: 'Event type', example: 'message' })
  event: string;

  @ApiProperty({ description: 'Message content', example: 'Hello everyone!' })
  message: string;

  @ApiProperty({ description: 'Message timestamp', example: '2024-01-15T10:30:00.000Z' })
  timestamp: Date;
}

/**
 * Payload for 'joinedRoom' event
 * Sent to client after successfully joining a room
 */
export class JoinedRoomEvent {
  @ApiProperty({ description: 'Room unique ID', example: 'room_1234567890_abc123' })
  roomId: string;

  @ApiProperty({ description: 'Room display name', example: 'General Chat' })
  roomName: string;

  @ApiProperty({ description: 'List of current participants', type: [ParticipantInfo] })
  participants: ParticipantInfo[];

  @ApiProperty({ description: 'Last 10 messages in the room', type: [RecentMessage] })
  recentMessages: RecentMessage[];
}
