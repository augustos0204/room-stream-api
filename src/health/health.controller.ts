import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Public } from '../common/decorators';

@ApiTags('health')
@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check service health status' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2025-10-20T12:00:00.000Z' },
      },
    },
  })
  getHealth() {
    return this.healthService.getHealthStatus();
  }
}
