import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for GET /health response
 */
export class HealthResponseDto {
  @ApiProperty({
    description: 'Health status',
    example: 'ok',
    enum: ['ok', 'degraded', 'error'],
  })
  status: string;

  @ApiProperty({
    description: 'Current server timestamp',
    example: '2024-01-15T10:00:00.000Z',
  })
  timestamp: string;
}
