/**
 * Metrics for a specific room
 *
 * Contains statistics and information about a single room.
 */
export interface RoomMetrics {
  id: string;
  name: string;
  messages: number;
  connections: number;
  createdAt: Date;
  uptime: string;
}
