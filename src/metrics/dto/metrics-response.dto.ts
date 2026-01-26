import { ApiProperty } from '@nestjs/swagger';

/**
 * Room metrics in response
 */
export class RoomMetricsDto {
  @ApiProperty({
    description: 'Room unique ID',
    example: 'room_1737550000000_abc123def',
  })
  id: string;

  @ApiProperty({
    description: 'Room display name',
    example: 'General Chat',
  })
  name: string;

  @ApiProperty({
    description: 'Number of messages in the room',
    example: 42,
  })
  messages: number;

  @ApiProperty({
    description: 'Number of active connections',
    example: 5,
  })
  connections: number;

  @ApiProperty({
    description: 'Room creation timestamp',
    example: '2024-01-15T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Room uptime formatted',
    example: '2h 30m 15s',
  })
  uptime: string;
}

/**
 * DTO for GET /metrics response
 */
export class MetricsResponseDto {
  @ApiProperty({
    description: 'Total number of connected clients',
    example: 42,
  })
  totalClients: number;

  @ApiProperty({
    description: 'Total number of active rooms',
    example: 8,
  })
  totalRooms: number;

  @ApiProperty({
    description: 'Total number of messages sent',
    example: 1234,
  })
  totalMessages: number;

  @ApiProperty({
    description: 'Server uptime in seconds',
    example: 3600,
  })
  uptime: number;

  @ApiProperty({
    description: 'Current server timestamp',
    example: '2024-01-15T10:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Connections count by namespace',
    example: { '/ws/rooms': 42 },
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  connectionsByNamespace: Record<string, number>;

  @ApiProperty({
    description: 'Detailed metrics for each room',
    type: [RoomMetricsDto],
    example: [
      {
        id: 'room_1737550000000_abc123def',
        name: 'General Chat',
        messages: 42,
        connections: 5,
        createdAt: '2024-01-15T10:00:00.000Z',
        uptime: '2h 30m 15s',
      },
    ],
  })
  rooms: RoomMetricsDto[];
}
