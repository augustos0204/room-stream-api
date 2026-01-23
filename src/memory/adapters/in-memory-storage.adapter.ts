import { Injectable, Logger } from '@nestjs/common';
import type { IStorageAdapter } from '../interfaces';
import type { RoomMessage } from '../../rooms/interfaces';
import { getParticipantKey } from '../../rooms/interfaces';
import type { SupabaseUserData } from '../../types/room.types';

/**
 * In-memory storage adapter
 *
 * Stores all room data in memory using Maps.
 * Data is lost when the application restarts.
 *
 * Uses hybrid key system:
 * - Supabase users: userId (persistent across sessions)
 * - Anonymous users: clientId (volatile, lost on reconnect)
 */
@Injectable()
export class InMemoryStorageAdapter implements IStorageAdapter {
  private readonly logger = new Logger(InMemoryStorageAdapter.name);
  private rooms: Map<string, RuntimeRoomData> = new Map();

  async initialize(): Promise<void> {
    this.logger.log('In-memory storage adapter initialized');
  }

  isEnabled(): boolean {
    return true;
  }

  async close(): Promise<void> {
    this.rooms.clear();
    this.logger.log('In-memory storage adapter closed');
  }

  async deleteRoom(roomId: string): Promise<boolean> {
    return this.rooms.delete(roomId);
  }

  // Participant operations
  async addParticipant(roomId: string, clientId: string, userId?: string | null): Promise<void> {
    const room = this.getOrCreateRoom(roomId);
    const key = getParticipantKey(clientId, userId);

    if (!room.participants.has(key)) {
      room.participants.add(key);
    }
  }

  async refreshParticipantPresence(
    _roomId: string,
    _clientId: string,
    _userId?: string | null,
  ): Promise<void> {
    // No-op for in-memory adapter (no TTL support)
  }

  async removeParticipant(roomId: string, clientId: string, userId?: string | null): Promise<void> {
    const room = this.rooms.get(roomId);
    const key = getParticipantKey(clientId, userId);

    if (room) {
      room.participants.delete(key);
    }
  }

  async getParticipants(roomId: string): Promise<string[]> {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.participants) : [];
  }

  async hasParticipant(roomId: string, clientId: string, userId?: string | null): Promise<boolean> {
    const room = this.rooms.get(roomId);
    const key = getParticipantKey(clientId, userId);
    return room ? room.participants.has(key) : false;
  }

  // Participant names operations
  async setParticipantName(
    roomId: string,
    clientId: string,
    name: string | null,
    userId?: string | null,
  ): Promise<void> {
    const room = this.getOrCreateRoom(roomId);
    const key = getParticipantKey(clientId, userId);
    room.participantNames.set(key, name);
  }

  async getParticipantName(
    roomId: string,
    clientId: string,
    userId?: string | null,
  ): Promise<string | null> {
    const room = this.rooms.get(roomId);
    const key = getParticipantKey(clientId, userId);
    return room ? room.participantNames.get(key) || null : null;
  }

  async deleteParticipantName(roomId: string, clientId: string, userId?: string | null): Promise<void> {
    const room = this.rooms.get(roomId);
    const key = getParticipantKey(clientId, userId);

    if (room) {
      room.participantNames.delete(key);
    }
  }

  async getAllParticipantNames(
    roomId: string,
  ): Promise<Map<string, string | null>> {
    const room = this.rooms.get(roomId);
    return room ? new Map(room.participantNames) : new Map();
  }

  // Participant Supabase users operations
  async setParticipantSupabaseUser(
    roomId: string,
    clientId: string,
    user: SupabaseUserData | null,
    userId?: string | null,
  ): Promise<void> {
    const room = this.getOrCreateRoom(roomId);
    const key = getParticipantKey(clientId, userId);
    room.participantSupabaseUsers.set(key, user);
  }

  async getParticipantSupabaseUser(
    roomId: string,
    clientId: string,
    userId?: string | null,
  ): Promise<SupabaseUserData | null> {
    const room = this.rooms.get(roomId);
    const key = getParticipantKey(clientId, userId);
    return room
      ? room.participantSupabaseUsers.get(key) || null
      : null;
  }

  async deleteParticipantSupabaseUser(roomId: string, clientId: string, userId?: string | null): Promise<void> {
    const room = this.rooms.get(roomId);
    const key = getParticipantKey(clientId, userId);

    if (room) {
      room.participantSupabaseUsers.delete(key);
    }
  }

  async getAllParticipantSupabaseUsers(
    roomId: string,
  ): Promise<Map<string, SupabaseUserData | null>> {
    const room = this.rooms.get(roomId);
    return room ? new Map(room.participantSupabaseUsers) : new Map();
  }

  // Message operations
  async addMessage(roomId: string, message: RoomMessage): Promise<void> {
    const room = this.getOrCreateRoom(roomId);
    room.messages.push(message);
  }

  async getMessages(roomId: string): Promise<RoomMessage[]> {
    const room = this.rooms.get(roomId);
    return room ? [...room.messages] : [];
  }

  private getOrCreateRoom(roomId: string): RuntimeRoomData {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        participants: new Set(),
        participantNames: new Map(),
        participantSupabaseUsers: new Map(),
        messages: [],
      };
      this.rooms.set(roomId, room);
    }
    return room;
  }
}

interface RuntimeRoomData {
  participants: Set<string>;
  participantNames: Map<string, string | null>;
  participantSupabaseUsers: Map<string, SupabaseUserData | null>;
  messages: RoomMessage[];
}
