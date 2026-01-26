import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for leaving a room via WebSocket
 *
 * Used by 'leaveRoom' WebSocket event
 */
export class LeaveRoomDto {
  @ApiProperty({
    description: 'Room ID to leave',
    example: 'room_1737550000000_abc123def',
  })
  @IsString()
  @IsNotEmpty()
  roomId: string;
}
