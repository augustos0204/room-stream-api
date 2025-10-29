import { Injectable } from '@nestjs/common';
import { calculateUptime } from '../common/utils/uptime.util';
import type { HealthResponse } from './interfaces';

@Injectable()
export class HealthService {
  private readonly startTime = new Date();

  getHealthStatus(): HealthResponse & { uptime: string } {
    const now = new Date();
    const uptime = calculateUptime(this.startTime);

    return {
      status: 'ok',
      timestamp: now.toISOString(),
      uptime,
    };
  }
}
