import { ApiProperty } from '@nestjs/swagger';

/**
 * Payload for 'roomDeleted' event
 * Broadcast to all room participants when a room is deleted
 */
export class RoomDeletedEvent {
  @ApiProperty({ description: 'Room unique ID', example: 'room_1234567890_abc123' })
  roomId: string;

  @ApiProperty({ description: 'Room display name', example: 'General Chat' })
  roomName: string;

  @ApiProperty({ description: 'Deletion message', example: 'A sala "General Chat" foi deletada' })
  message: string;
}
