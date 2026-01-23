import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateRoomApplicationDto {
  @ApiProperty({
    description: 'Application UUID to associate with the room',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  applicationId: string;
}
