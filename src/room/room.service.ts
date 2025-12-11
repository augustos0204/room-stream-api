import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { MemoryService } from '../memory/memory.service';
import type { Room, RoomMessage, RoomParticipant } from './interfaces';
import type { SupabaseUserData } from '../types/room.types';
import { RoomGateway } from './room.gateway';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  constructor(
    private readonly eventsService: EventsService,
    private readonly memoryService: MemoryService,
    @Inject(forwardRef(() => RoomGateway))
    private readonly roomGateway: RoomGateway,
  ) {}

  async createRoom(name: string): Promise<Room> {
    const roomId = this.generateRoomId();
    const room: Room = {
      id: roomId,
      name,
      participants: [],
      participantNames: new Map(),
      participantSupabaseUsers: new Map(),
      createdAt: new Date(),
      messages: [],
    };

    await this.memoryService.setRoom(roomId, room);
    this.logger.log(`Sala criada: ${roomId} (${name})`);

    this.eventsService.emitMetricsEvent('metrics:room-created', {
      roomId,
      roomName: name,
      timestamp: room.createdAt,
    });

    return room;
  }

  async getRoom(roomId: string): Promise<Room | null> {
    return this.memoryService.getRoom(roomId);
  }

  async getAllRooms(): Promise<Room[]> {
    return this.memoryService.getAllRooms();
  }

  async joinRoom(
    roomId: string,
    clientId: string,
    participantName?: string | null,
    supabaseUser?: SupabaseUserData | null,
  ): Promise<boolean> {
    const room = await this.memoryService.getRoom(roomId);
    if (!room) {
      this.logger.warn(`Tentativa de entrar em sala inexistente: ${roomId}`);
      return false;
    }

    const userId = supabaseUser?.id || null;
    const hasParticipant = await this.memoryService.hasParticipant(roomId, clientId, userId);

    if (!hasParticipant) {
      await this.memoryService.addParticipant(roomId, clientId, userId);
      await this.memoryService.setParticipantName(roomId, clientId, participantName || null, userId);
      await this.memoryService.setParticipantSupabaseUser(roomId, clientId, supabaseUser || null, userId);

      const userInfo = supabaseUser
        ? `(Supabase: ${supabaseUser.email || supabaseUser.id})`
        : `(${participantName || 'sem nome'})`;

      this.logger.log(`Cliente ${clientId} ${userInfo} entrou na sala ${roomId}`);

      this.eventsService.emitMetricsEvent('metrics:user-joined-room', {
        clientId,
        roomId,
        roomName: room.name,
        participantName: participantName || null,
        timestamp: new Date(),
      });
    } else {
      // Atualizar nome e Supabase user data se já estiver na sala
      await this.memoryService.setParticipantName(roomId, clientId, participantName || null, userId);
      await this.memoryService.setParticipantSupabaseUser(roomId, clientId, supabaseUser || null, userId);
    }

    return true;
  }

  async leaveRoom(roomId: string, clientId: string, userId?: string | null): Promise<boolean> {
    const room = await this.memoryService.getRoom(roomId);
    if (!room) {
      return false;
    }

    // If userId not provided, try to get it from stored Supabase data
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const supabaseUser = await this.memoryService.getParticipantSupabaseUser(roomId, clientId, null);
      resolvedUserId = supabaseUser?.id || null;
    }

    const hasParticipant = await this.memoryService.hasParticipant(roomId, clientId, resolvedUserId);
    if (hasParticipant) {
      const participantName = await this.memoryService.getParticipantName(roomId, clientId, resolvedUserId);
      await this.memoryService.removeParticipant(roomId, clientId, resolvedUserId);
      await this.memoryService.deleteParticipantName(roomId, clientId, resolvedUserId);
      await this.memoryService.deleteParticipantSupabaseUser(roomId, clientId, resolvedUserId);
      this.logger.log(`Cliente ${clientId} saiu da sala ${roomId}`);

      this.eventsService.emitMetricsEvent('metrics:user-left-room', {
        clientId,
        roomId,
        roomName: room.name,
        participantName: participantName || null,
        timestamp: new Date(),
      });
    }

    return true;
  }

  async addMessage(
    roomId: string,
    clientId: string,
    message: string,
    supabaseUser?: SupabaseUserData | null,
  ): Promise<RoomMessage | null> {
    const room = await this.memoryService.getRoom(roomId);
    if (!room) {
      this.logger.warn(
        `Tentativa de enviar mensagem para sala inexistente: ${roomId}`,
      );
      return null;
    }

    const roomMessage: RoomMessage = {
      id: this.generateMessageId(),
      clientId,
      userId: supabaseUser?.id,
      message,
      timestamp: new Date(),
      supabaseUser: supabaseUser || undefined,
    };

    await this.memoryService.addMessage(roomId, roomMessage);
    this.logger.log(
      `Mensagem adicionada à sala ${roomId}: ${message} (userId: ${roomMessage.userId || 'null'}, clientId: ${clientId})`,
    );

    this.eventsService.emitMetricsEvent('metrics:message-sent', {
      messageId: roomMessage.id,
      clientId,
      roomId,
      roomName: room.name,
      timestamp: roomMessage.timestamp,
    });

    return roomMessage;
  }

  async deleteRoom(roomId: string): Promise<boolean> {
    const room = await this.memoryService.getRoom(roomId);
    const deleted = await this.memoryService.deleteRoom(roomId);
    if (deleted && room) {
      this.logger.log(`Sala deletada: ${roomId}`);

      // Emit metrics event
      this.eventsService.emitMetricsEvent('metrics:room-deleted', {
        roomId,
        roomName: room.name,
        timestamp: new Date(),
      });

      // Broadcast to all clients in the room via WebSocket
      this.roomGateway.broadcastRoomDeleted(roomId, room.name);
    }
    return deleted;
  }

  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getParticipantName(roomId: string, clientId: string, userId?: string | null): Promise<string | null> {
    return this.memoryService.getParticipantName(roomId, clientId, userId);
  }

  async updateParticipantName(
    roomId: string,
    clientId: string,
    name: string | null,
    userId?: string | null,
  ): Promise<boolean> {
    const room = await this.memoryService.getRoom(roomId);
    const hasParticipant = await this.memoryService.hasParticipant(roomId, clientId, userId);

    if (!room || !hasParticipant) {
      return false;
    }

    await this.memoryService.setParticipantName(roomId, clientId, name, userId);
    this.logger.log(
      `Nome do cliente ${clientId} atualizado para: ${name || 'sem nome'}`,
    );
    return true;
  }

  async getParticipantsWithNames(roomId: string): Promise<RoomParticipant[]> {
    const room = await this.memoryService.getRoom(roomId);
    if (!room) {
      return [];
    }

    const participants = await this.memoryService.getParticipants(roomId);
    const participantNames = await this.memoryService.getAllParticipantNames(roomId);
    const participantSupabaseUsers = await this.memoryService.getAllParticipantSupabaseUsers(roomId);

    return participants.map((key) => ({
      clientId: key, // key is now userId or clientId
      name: participantNames.get(key) || null,
      supabaseUser: participantSupabaseUsers.get(key) || undefined,
    }));
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
