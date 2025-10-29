import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for room ID parameter validation
 *
 * Used by GET/DELETE /room/:id endpoints
 */
export class RoomIdDto {
  @ApiProperty({
    description: 'Room ID',
    example: 'room_1234567890_abc123def',
  })
  @IsString()
  @IsNotEmpty()
  id: string;
}
