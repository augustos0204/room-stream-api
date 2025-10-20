import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import type { MetricsResponse } from '../types/metrics.types';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Get system metrics and observability data' })
  @ApiResponse({
    status: 200,
    description: 'Current system metrics',
    schema: {
      properties: {
        connections: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 42 },
            active: { type: 'number', example: 15 },
          },
        },
        rooms: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 8 },
            active: { type: 'number', example: 5 },
          },
        },
        messages: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 1234 },
          },
        },
        uptime: {
          type: 'object',
          properties: {
            seconds: { type: 'number', example: 3600 },
            formatted: { type: 'string', example: '1h 0m 0s' },
          },
        },
      },
    },
  })
  getMetrics(): MetricsResponse {
    return this.metricsService.getMetrics();
  }
}
