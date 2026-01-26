import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * DTO for updating participant name via WebSocket
 *
 * Used by 'updateParticipantName' WebSocket event
 */
export class UpdateParticipantNameDto {
  @ApiProperty({
    description: 'Room ID where to update the name',
    example: 'room_1737550000000_abc123def',
  })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({
    description: 'New display name for the participant',
    example: 'Jane Doe',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50, { message: 'Participant name must not exceed 50 characters' })
  participantName: string;
}
