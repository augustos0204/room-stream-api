import { Injectable, Logger } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import type { Room, RoomMessage, RoomParticipant } from './interfaces';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);
  private rooms: Map<string, Room> = new Map();

  constructor(private readonly eventsService: EventsService) {}

  createRoom(name: string): Room {
    const roomId = this.generateRoomId();
    const room: Room = {
      id: roomId,
      name,
      participants: [],
      participantNames: new Map(),
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
  ): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      this.logger.warn(`Tentativa de entrar em sala inexistente: ${roomId}`);
      return false;
    }

    if (!room.participants.includes(clientId)) {
      room.participants.push(clientId);
      room.participantNames.set(clientId, participantName || null);
      this.logger.log(
        `Cliente ${clientId} (${participantName || 'sem nome'}) entrou na sala ${roomId}`,
      );

      this.eventsService.emitMetricsEvent('metrics:user-joined-room', {
        clientId,
        roomId,
        roomName: room.name,
        participantName: participantName || null,
        timestamp: new Date(),
      });
    } else {
      // Atualizar nome se já estiver na sala
      room.participantNames.set(clientId, participantName || null);
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

      this.eventsService.emitMetricsEvent('metrics:room-deleted', {
        roomId,
        roomName: room.name,
        timestamp: new Date(),
      });
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
    }));
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
