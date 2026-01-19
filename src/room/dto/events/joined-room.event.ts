import { ApiProperty } from '@nestjs/swagger';

/**
 * Participant information in a room
 */
export class ParticipantInfo {
  @ApiProperty({ description: 'Client socket ID or user ID', example: 'abc123' })
  clientId: string;

  @ApiProperty({ description: 'Participant display name', example: 'John Doe', nullable: true })
  name: string | null;

  @ApiProperty({ description: 'Supabase user data if authenticated', required: false })
  supabaseUser?: {
    id: string;
    email: string | null;
    name: string | null;
  };
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
