import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

/**
 * DTO for joining a room via WebSocket
 *
 * Used by 'joinRoom' WebSocket event
 */
export class JoinRoomDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Participant name must not exceed 50 characters' })
  participantName?: string;
}
