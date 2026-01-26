import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

/**
 * DTO for joining a room via WebSocket
 *
 * Used by 'joinRoom' WebSocket event
 */
export class JoinRoomDto {
  @ApiProperty({
    description: 'Room ID to join',
    example: 'room_1737550000000_abc123def',
  })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({
    description: 'Display name for the participant (optional for authenticated users)',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Participant name must not exceed 50 characters' })
  participantName?: string;
}
