import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for application response
 */
export class ApplicationResponseDto {
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
    description: 'API Key for the application (only shown on create/regenerate)',
    example: 'app_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
  })
  key: string;

  @ApiProperty({
    description: 'User ID who created the application',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  createdBy: string;

  @ApiProperty({
    description: 'When the application was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'When the application was last updated',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: string;

  @ApiProperty({
    description: 'Whether the application is active',
    example: true,
  })
  isActive: boolean;
}

/**
 * DTO for application list response (hides full key)
 */
export class ApplicationListItemDto {
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
}
