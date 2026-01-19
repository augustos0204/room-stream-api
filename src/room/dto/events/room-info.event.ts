import { ApiProperty } from '@nestjs/swagger';
import { ParticipantInfo } from './joined-room.event';

/**
 * Payload for 'roomInfo' event
 * Sent in response to 'getRoomInfo' request
 */
export class RoomInfoEvent {
  @ApiProperty({ description: 'Room unique ID', example: 'room_1234567890_abc123' })
  id: string;

  @ApiProperty({ description: 'Room display name', example: 'General Chat' })
  name: string;

  @ApiProperty({ description: 'Number of participants', example: 5 })
  participantCount: number;

  @ApiProperty({ description: 'List of current participants', type: [ParticipantInfo] })
  participants: ParticipantInfo[];

  @ApiProperty({ description: 'Total number of messages', example: 42 })
  messageCount: number;

  @ApiProperty({ description: 'Room creation timestamp', example: '2024-01-15T10:00:00.000Z' })
  createdAt: Date;
}
