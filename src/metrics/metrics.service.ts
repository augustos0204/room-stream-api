import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { EventsService } from '../events/events.service';
import {
  calculateUptime,
  calculateUptimeMs,
} from '../common/utils/uptime.util';
import {
  ClientEventPayload,
  RoomEventPayload,
  UserRoomEventPayload,
  MessageEventPayload,
} from '../events/metrics.events';
import { RoomMetrics, MetricsResponse } from '../types/metrics.types';

@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetricsService.name);
  private readonly startTime = Date.now();

  private connectedClients = 0;
  private connectionsByNamespace: Record<string, number> = {};
  private rooms: Map<string, RoomMetrics> = new Map();
  private roomNames: Map<string, string> = new Map();
  private totalMessages = 0;

  constructor(private readonly eventsService: EventsService) {}

  onModuleInit() {
    this.setupEventListeners();
    this.logger.log('MetricsService initialized with event listeners');
  }

  onModuleDestroy() {
    this.eventsService.removeAllMetricsListeners();
    this.logger.log('MetricsService destroyed, removed all listeners');
  }

  private setupEventListeners(): void {
    this.eventsService.onMetricsEvent(
      'metrics:client-connected',
      this.handleClientConnected.bind(this) as (
        payload: ClientEventPayload,
      ) => void,
    );
    this.eventsService.onMetricsEvent(
      'metrics:client-disconnected',
      this.handleClientDisconnected.bind(this) as (
        payload: ClientEventPayload,
      ) => void,
    );
    this.eventsService.onMetricsEvent(
      'metrics:room-created',
      this.handleRoomCreated.bind(this) as (payload: RoomEventPayload) => void,
    );
    this.eventsService.onMetricsEvent(
      'metrics:room-deleted',
      this.handleRoomDeleted.bind(this) as (payload: RoomEventPayload) => void,
    );
    this.eventsService.onMetricsEvent(
      'metrics:user-joined-room',
      this.handleUserJoinedRoom.bind(this) as (
        payload: UserRoomEventPayload,
      ) => void,
    );
    this.eventsService.onMetricsEvent(
      'metrics:user-left-room',
      this.handleUserLeftRoom.bind(this) as (
        payload: UserRoomEventPayload,
      ) => void,
    );
    this.eventsService.onMetricsEvent(
      'metrics:message-sent',
      this.handleMessageSent.bind(this) as (
        payload: MessageEventPayload,
      ) => void,
    );
  }

  private handleClientConnected(payload: ClientEventPayload): void {
    this.connectedClients++;
    const namespace = payload.namespace || 'default';
    this.connectionsByNamespace[namespace] =
      (this.connectionsByNamespace[namespace] || 0) + 1;
    this.logger.debug(
      `Client connected: ${payload.clientId}, namespace: ${namespace}`,
    );
  }

  private handleClientDisconnected(payload: ClientEventPayload): void {
    this.connectedClients = Math.max(0, this.connectedClients - 1);
    const namespace = payload.namespace || 'default';
    this.connectionsByNamespace[namespace] = Math.max(
      0,
      (this.connectionsByNamespace[namespace] || 0) - 1,
    );
    this.logger.debug(
      `Client disconnected: ${payload.clientId}, namespace: ${namespace}`,
    );
  }

  private handleRoomCreated(payload: RoomEventPayload): void {
    this.roomNames.set(payload.roomId, payload.roomName);
    this.rooms.set(payload.roomId, {
      id: payload.roomId,
      name: payload.roomName,
      messages: 0,
      connections: 0,
      createdAt: payload.timestamp,
      uptime: calculateUptime(payload.timestamp),
    });
    this.logger.debug(`Room created: ${payload.roomName} (${payload.roomId})`);
  }

  private handleRoomDeleted(payload: RoomEventPayload): void {
    this.rooms.delete(payload.roomId);
    this.roomNames.delete(payload.roomId);
    this.logger.debug(`Room deleted: ${payload.roomName} (${payload.roomId})`);
  }

  private handleUserJoinedRoom(payload: UserRoomEventPayload): void {
    const room = this.rooms.get(payload.roomId);
    if (room) {
      room.connections++;
      this.logger.debug(
        `User joined room: ${payload.participantName || payload.clientId} -> ${payload.roomName}`,
      );
    }
  }

  private handleUserLeftRoom(payload: UserRoomEventPayload): void {
    const room = this.rooms.get(payload.roomId);
    if (room) {
      room.connections = Math.max(0, room.connections - 1);
      this.logger.debug(
        `User left room: ${payload.participantName || payload.clientId} <- ${payload.roomName}`,
      );
    }
  }

  private handleMessageSent(payload: MessageEventPayload): void {
    this.totalMessages++;
    const room = this.rooms.get(payload.roomId);
    if (room) {
      room.messages++;
      this.logger.debug(`Message sent in room: ${payload.roomName}`);
    }
  }

  getMetrics(): MetricsResponse {
    const uptime = calculateUptimeMs(this.startTime);
    const roomsArray: RoomMetrics[] = [];

    this.rooms.forEach((metrics) => {
      roomsArray.push({
        ...metrics,
        uptime: calculateUptime(metrics.createdAt),
      });
    });

    return {
      totalClients: this.connectedClients,
      totalRooms: this.rooms.size,
      totalMessages: this.totalMessages,
      uptime,
      timestamp: new Date().toISOString(),
      connectionsByNamespace: { ...this.connectionsByNamespace },
      rooms: roomsArray,
    };
  }

  getConnectedClients(): number {
    return this.connectedClients;
  }

  getTotalRooms(): number {
    return this.rooms.size;
  }

  getTotalMessages(): number {
    return this.totalMessages;
  }
}
