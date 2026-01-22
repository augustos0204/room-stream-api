import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import type { MetricsResponse } from './interfaces';
import { MetricsResponseDto } from './dto';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Get system metrics and observability data' })
  @ApiResponse({
    status: 200,
    description: 'Current system metrics',
    type: MetricsResponseDto,
  })
  getMetrics(): MetricsResponse {
    return this.metricsService.getMetrics();
  }
}
