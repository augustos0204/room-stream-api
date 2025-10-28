export interface RoomMetrics {
  id: string;
  name: string;
  messages: number;
  connections: number;
  createdAt: Date;
  uptime: string;
}

export interface MetricsResponse {
  totalClients: number;
  totalRooms: number;
  totalMessages: number;
  uptime: number;
  timestamp: string;
  connectionsByNamespace: Record<string, number>;
  rooms: RoomMetrics[];
}
