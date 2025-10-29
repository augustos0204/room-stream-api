import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for leaving a room via WebSocket
 *
 * Used by 'leaveRoom' WebSocket event
 */
export class LeaveRoomDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;
}
