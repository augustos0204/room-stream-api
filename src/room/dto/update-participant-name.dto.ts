import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * DTO for updating participant name via WebSocket
 *
 * Used by 'updateParticipantName' WebSocket event
 */
export class UpdateParticipantNameDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50, { message: 'Participant name must not exceed 50 characters' })
  participantName: string;
}
