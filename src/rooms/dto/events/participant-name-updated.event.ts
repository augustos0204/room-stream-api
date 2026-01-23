import { ApiProperty } from '@nestjs/swagger';

/**
 * Payload for 'participantNameUpdated' event
 * Broadcast to all room participants when someone updates their name
 */
export class ParticipantNameUpdatedEvent {
  @ApiProperty({ description: 'Client socket ID', example: 'abc123xyz' })
  clientId: string;

  @ApiProperty({ description: 'New participant name', example: 'Jane Doe' })
  participantName: string;

  @ApiProperty({ description: 'Room unique ID', example: 'room_1234567890_abc123' })
  roomId: string;
}
