import { ApiProperty } from '@nestjs/swagger';

/**
 * Payload for 'leftRoom' event
 * Sent to client after successfully leaving a room
 */
export class LeftRoomEvent {
  @ApiProperty({ description: 'Room unique ID', example: 'room_1234567890_abc123' })
  roomId: string;
}
