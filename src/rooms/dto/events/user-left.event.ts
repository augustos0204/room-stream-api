import { ApiProperty } from '@nestjs/swagger';

/**
 * Payload for 'userLeft' event
 * Broadcast to all room participants when a user leaves
 */
export class UserLeftEvent {
  @ApiProperty({ description: 'Client socket ID', example: 'abc123xyz' })
  clientId: string;

  @ApiProperty({ description: 'Participant display name', example: 'John Doe', nullable: true })
  participantName: string | null;

  @ApiProperty({ description: 'Room unique ID', example: 'room_1234567890_abc123' })
  roomId: string;

  @ApiProperty({ description: 'Room display name', example: 'General Chat', nullable: true })
  roomName: string | null;

  @ApiProperty({ description: 'Current number of participants', example: 4 })
  participantCount: number;

  @ApiProperty({ description: 'Whether the participant is an application', example: false })
  isApplication: boolean;
}
