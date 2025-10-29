import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating a new chat room
 *
 * Used by POST /room endpoint
 */
export class CreateRoomDto {
  @ApiProperty({
    description: 'The name of the chat room',
    example: 'General Chat',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Room name is required' })
  @MinLength(1, { message: 'Room name must not be empty' })
  @MaxLength(100, { message: 'Room name must not exceed 100 characters' })
  name: string;
}
