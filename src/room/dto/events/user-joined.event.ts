import { ApiProperty } from '@nestjs/swagger';

/**
 * Payload for 'userJoined' event
 * Broadcast to all room participants when a new user joins
 */
export class UserJoinedEvent {
  @ApiProperty({ description: 'Client socket ID', example: 'abc123xyz' })
  clientId: string;

  @ApiProperty({ description: 'Participant display name', example: 'John Doe', nullable: true })
  participantName: string | null;

  @ApiProperty({ description: 'Room unique ID', example: 'room_1234567890_abc123' })
  roomId: string;

  @ApiProperty({ description: 'Room display name', example: 'General Chat' })
  roomName: string;

  @ApiProperty({ description: 'Current number of participants', example: 5 })
  participantCount: number;

  @ApiProperty({ description: 'Supabase user data if authenticated', required: false })
  supabaseUser?: {
    id: string;
    email: string | null;
    name: string | null;
  };

  @ApiProperty({ description: 'Application data if connected via app key', required: false })
  application?: {
    id: string;
    name: string;
    createdBy: string;
  };

  @ApiProperty({ description: 'Whether the participant is an application', example: false })
  isApplication: boolean;
}
