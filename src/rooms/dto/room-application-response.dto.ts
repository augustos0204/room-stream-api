import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoomApplicationListItemDto {
  @ApiProperty({
    description: 'Unique identifier of the application',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the application',
    example: 'My Mobile App',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the application',
    example: 'Mobile app for customer support',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Masked API Key (only shows last 8 characters)',
    example: '••••••••••••••••vwx234yz',
  })
  keyPreview: string;

  @ApiProperty({
    description: 'When the application was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Whether the application is active',
    example: true,
  })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Supabase user ID who linked the application to the room',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  linkedBy: string | null;

  @ApiProperty({
    description: 'When the application was linked to the room',
    example: '2024-01-10T12:00:00.000Z',
  })
  linkedAt: string;
}

export class ApplicationRoomListItemDto {
  @ApiProperty({
    description: 'Room unique ID',
    example: 'room_1234567890_abc123',
  })
  id: string;

  @ApiProperty({
    description: 'Room display name',
    example: 'General Chat',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Supabase user ID that created the room',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  createdBy: string | null;

  @ApiProperty({
    description: 'Room creation timestamp',
    example: '2024-01-15T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Supabase user ID who linked the room to the application',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  linkedBy: string | null;

  @ApiProperty({
    description: 'When the room was linked to the application',
    example: '2024-01-10T12:00:00.000Z',
  })
  linkedAt: string;
}
