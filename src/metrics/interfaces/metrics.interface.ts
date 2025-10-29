import type { RoomMetrics } from './room-metrics.interface';

/**
 * System-wide metrics response
 *
 * Contains overall application statistics and metrics.
 * Returned by GET /metrics endpoint.
 */
export interface MetricsResponse {
  totalClients: number;
  totalRooms: number;
  totalMessages: number;
  uptime: number;
  timestamp: string;
  connectionsByNamespace: Record<string, number>;
  rooms: RoomMetrics[];
}
