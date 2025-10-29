import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for getting room info via WebSocket
 *
 * Used by 'getRoomInfo' WebSocket event
 */
export class GetRoomInfoDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;
}
