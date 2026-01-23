import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { MemoryService } from '../memory/memory.service';
import { RoomPersistenceService, RoomMetadata } from './room.persistence.service';
import { RoomApplicationService } from './room-application.service';
import type { Room, RoomMessage, RoomParticipant } from './interfaces';
import type { SupabaseUserData } from '../types/room.types';
import { RoomGateway } from './room.gateway';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  constructor(
    private readonly eventsService: EventsService,
    private readonly memoryService: MemoryService,
    private readonly roomPersistenceService: RoomPersistenceService,
    private readonly roomApplicationService: RoomApplicationService,
    @Inject(forwardRef(() => RoomGateway))
    private readonly roomGateway: RoomGateway,
  ) {}

  async createRoom(name: string, createdBy?: string | null): Promise<Room> {
    const roomId = this.generateRoomId();
    const createdAt = new Date();

    const roomMetadata = await this.roomPersistenceService.createRoom(
      roomId,
      name,
      createdAt,
      createdBy || null,
    );

    const room = await this.buildRoomFromMetadata(roomMetadata);
    this.logger.log(`Sala criada: ${roomId} (${name})`);

    this.eventsService.emitMetricsEvent('metrics:room-created', {
      roomId,
      roomName: name,
      timestamp: roomMetadata.createdAt,
    });

    return room;
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const roomMetadata = await this.roomPersistenceService.getRoom(roomId);
    if (!roomMetadata) {
      return null;
    }

    return this.buildRoomFromMetadata(roomMetadata);
  }

  async getAllRooms(): Promise<Room[]> {
    const roomsMetadata = await this.roomPersistenceService.getAllRooms();
    const rooms = await Promise.all(
      roomsMetadata.map((room) => this.buildRoomFromMetadata(room)),
    );
    return rooms;
  }

  async getRoomsForApplication(applicationId: string): Promise<Room[]> {
    const roomsMetadata =
      await this.roomApplicationService.listRoomsForApplication(applicationId);
    const rooms = await Promise.all(
      roomsMetadata.map((room) => this.buildRoomFromMetadata(room)),
    );
    return rooms;
  }

  async refreshParticipantPresence(
    roomId: string,
    clientId: string,
    userId?: string | null,
  ): Promise<void> {
    await this.memoryService.refreshParticipantPresence(
      roomId,
      clientId,
      userId,
    );
  }

  async joinRoom(
    roomId: string,
    clientId: string,
    participantName?: string | null,
    supabaseUser?: SupabaseUserData | null,
  ): Promise<boolean> {
    const roomMetadata = await this.roomPersistenceService.getRoom(roomId);
    if (!roomMetadata) {
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
        roomName: roomMetadata.name,
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
    const roomMetadata = await this.roomPersistenceService.getRoom(roomId);
    if (!roomMetadata) {
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
        roomName: roomMetadata.name,
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
    event: string = 'message',
  ): Promise<RoomMessage | null> {
    const roomMetadata = await this.roomPersistenceService.getRoom(roomId);
    if (!roomMetadata) {
      this.logger.warn(
        `Tentativa de enviar mensagem para sala inexistente: ${roomId}`,
      );
      return null;
    }

    const roomMessage: RoomMessage = {
      id: this.generateMessageId(),
      clientId,
      userId: supabaseUser?.id,
      event,
      message,
      timestamp: new Date(),
      supabaseUser: supabaseUser || undefined,
    };

    await this.memoryService.addMessage(roomId, roomMessage);
    this.logger.log(`Evento [${event}] adicionado à sala ${roomId}: ${message}`);

    this.eventsService.emitMetricsEvent('metrics:message-sent', {
      messageId: roomMessage.id,
      clientId,
      roomId,
      roomName: roomMetadata.name,
      timestamp: roomMessage.timestamp,
    });

    return roomMessage;
  }

  async deleteRoom(roomId: string): Promise<boolean> {
    const roomMetadata = await this.roomPersistenceService.getRoom(roomId);
    if (!roomMetadata) {
      return false;
    }

    const deleted = await this.roomPersistenceService.deleteRoom(roomId);
    if (deleted) {
      await this.memoryService.deleteRoom(roomId);
      this.logger.log(`Sala deletada: ${roomId}`);

      // Emit metrics event
      this.eventsService.emitMetricsEvent('metrics:room-deleted', {
        roomId,
        roomName: roomMetadata.name,
        timestamp: new Date(),
      });

      // Broadcast to all clients in the room via WebSocket
      this.roomGateway.broadcastRoomDeleted(roomId, roomMetadata.name);
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
    const roomMetadata = await this.roomPersistenceService.getRoom(roomId);
    const hasParticipant = await this.memoryService.hasParticipant(roomId, clientId, userId);

    if (!roomMetadata || !hasParticipant) {
      return false;
    }

    await this.memoryService.setParticipantName(roomId, clientId, name, userId);
    this.logger.log(
      `Nome do cliente ${clientId} atualizado para: ${name || 'sem nome'}`,
    );
    return true;
  }

  async getParticipantsWithNames(roomId: string): Promise<RoomParticipant[]> {
    const roomMetadata = await this.roomPersistenceService.getRoom(roomId);
    if (!roomMetadata) {
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

  private async buildRoomFromMetadata(room: RoomMetadata): Promise<Room> {
    const [
      participants,
      participantNames,
      participantSupabaseUsers,
      messages,
    ] = await Promise.all([
      this.memoryService.getParticipants(room.id),
      this.memoryService.getAllParticipantNames(room.id),
      this.memoryService.getAllParticipantSupabaseUsers(room.id),
      this.memoryService.getMessages(room.id),
    ]);

    return {
      id: room.id,
      name: room.name,
      createdBy: room.createdBy,
      participants,
      participantNames,
      participantSupabaseUsers,
      createdAt: room.createdAt,
      messages,
    };
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
