import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for getting room info via WebSocket
 *
 * Used by 'getRoomInfo' WebSocket event
 */
export class GetRoomInfoDto {
  @ApiProperty({
    description: 'Room ID to get information about',
    example: 'room_1737550000000_abc123def',
  })
  @IsString()
  @IsNotEmpty()
  roomId: string;
}
