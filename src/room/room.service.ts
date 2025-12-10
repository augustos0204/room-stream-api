import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import type { Room, RoomMessage, RoomParticipant } from './interfaces';
import type { SupabaseUserData } from '../types/room.types';
import { RoomGateway } from './room.gateway';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);
  private rooms: Map<string, Room> = new Map();

  constructor(
    private readonly eventsService: EventsService,
    @Inject(forwardRef(() => RoomGateway))
    private readonly roomGateway: RoomGateway,
  ) {}

  createRoom(name: string): Room {
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

    this.rooms.set(roomId, room);
    this.logger.log(`Sala criada: ${roomId} (${name})`);

    this.eventsService.emitMetricsEvent('metrics:room-created', {
      roomId,
      roomName: name,
      timestamp: room.createdAt,
    });

    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  joinRoom(
    roomId: string,
    clientId: string,
    participantName?: string | null,
    supabaseUser?: SupabaseUserData | null,
  ): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      this.logger.warn(`Tentativa de entrar em sala inexistente: ${roomId}`);
      return false;
    }

    if (!room.participants.includes(clientId)) {
      room.participants.push(clientId);
      room.participantNames.set(clientId, participantName || null);
      room.participantSupabaseUsers.set(clientId, supabaseUser || null);

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
      room.participantNames.set(clientId, participantName || null);
      room.participantSupabaseUsers.set(clientId, supabaseUser || null);
    }

    return true;
  }

  leaveRoom(roomId: string, clientId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    const index = room.participants.indexOf(clientId);
    if (index > -1) {
      const participantName = room.participantNames.get(clientId);
      room.participants.splice(index, 1);
      room.participantNames.delete(clientId);
      room.participantSupabaseUsers.delete(clientId);
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

  addMessage(
    roomId: string,
    clientId: string,
    message: string,
    supabaseUser?: SupabaseUserData | null,
  ): RoomMessage | null {
    const room = this.rooms.get(roomId);
    if (!room) {
      this.logger.warn(
        `Tentativa de enviar mensagem para sala inexistente: ${roomId}`,
      );
      return null;
    }

    const roomMessage: RoomMessage = {
      id: this.generateMessageId(),
      clientId,
      message,
      timestamp: new Date(),
      supabaseUser: supabaseUser || undefined,
    };

    room.messages.push(roomMessage);
    this.logger.log(`Mensagem adicionada à sala ${roomId}: ${message}`);

    this.eventsService.emitMetricsEvent('metrics:message-sent', {
      messageId: roomMessage.id,
      clientId,
      roomId,
      roomName: room.name,
      timestamp: roomMessage.timestamp,
    });

    return roomMessage;
  }

  deleteRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    const deleted = this.rooms.delete(roomId);
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

  getParticipantName(roomId: string, clientId: string): string | null {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }
    return room.participantNames.get(clientId) || null;
  }

  updateParticipantName(
    roomId: string,
    clientId: string,
    name: string | null,
  ): boolean {
    const room = this.rooms.get(roomId);
    if (!room || !room.participants.includes(clientId)) {
      return false;
    }

    room.participantNames.set(clientId, name);
    this.logger.log(
      `Nome do cliente ${clientId} atualizado para: ${name || 'sem nome'}`,
    );
    return true;
  }

  getParticipantsWithNames(roomId: string): RoomParticipant[] {
    const room = this.rooms.get(roomId);
    if (!room) {
      return [];
    }

    return room.participants.map((clientId) => ({
      clientId,
      name: room.participantNames.get(clientId) || null,
      supabaseUser: room.participantSupabaseUsers.get(clientId) || undefined,
    }));
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
