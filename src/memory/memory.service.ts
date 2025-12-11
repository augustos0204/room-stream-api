import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import type { IStorageAdapter } from './interfaces';
import { InMemoryStorageAdapter } from './adapters/in-memory-storage.adapter';
import { RedisStorageAdapter } from './adapters/redis-storage.adapter';
import type { Room, RoomMessage } from '../room/interfaces';
import type { SupabaseUserData } from '../types/room.types';

/**
 * Memory service for managing storage adapters
 *
 * Automatically selects between Redis and in-memory storage based on REDIS_URL environment variable.
 * - If REDIS_URL is set: Uses Redis storage adapter
 * - If REDIS_URL is not set: Falls back to in-memory storage adapter
 *
 * This service provides a unified interface for all storage operations.
 */
@Injectable()
export class MemoryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MemoryService.name);
  private adapter: IStorageAdapter;

  constructor(
    private readonly inMemoryAdapter: InMemoryStorageAdapter,
    private readonly redisAdapter: RedisStorageAdapter,
  ) {
    // Select adapter based on REDIS_URL environment variable
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.adapter = this.redisAdapter;
      this.logger.log('Using Redis storage adapter');
    } else {
      this.adapter = this.inMemoryAdapter;
      this.logger.log('Using in-memory storage adapter (REDIS_URL not configured)');
    }
  }

  async onModuleInit() {
    await this.adapter.initialize();
  }

  async onModuleDestroy() {
    await this.adapter.close();
  }

  /**
   * Check if the current adapter is enabled and ready
   */
  isEnabled(): boolean {
    return this.adapter.isEnabled();
  }

  /**
   * Get the name of the current adapter
   */
  getAdapterName(): string {
    return this.adapter instanceof RedisStorageAdapter ? 'Redis' : 'InMemory';
  }

  // Room operations
  async setRoom(roomId: string, room: Room): Promise<void> {
    return this.adapter.setRoom(roomId, room);
  }

  async getRoom(roomId: string): Promise<Room | null> {
    return this.adapter.getRoom(roomId);
  }

  async deleteRoom(roomId: string): Promise<boolean> {
    return this.adapter.deleteRoom(roomId);
  }

  async getAllRooms(): Promise<Room[]> {
    return this.adapter.getAllRooms();
  }

  // Participant operations
  async addParticipant(roomId: string, clientId: string, userId?: string | null): Promise<void> {
    return this.adapter.addParticipant(roomId, clientId, userId);
  }

  async removeParticipant(roomId: string, clientId: string, userId?: string | null): Promise<void> {
    return this.adapter.removeParticipant(roomId, clientId, userId);
  }

  async getParticipants(roomId: string): Promise<string[]> {
    return this.adapter.getParticipants(roomId);
  }

  async hasParticipant(roomId: string, clientId: string, userId?: string | null): Promise<boolean> {
    return this.adapter.hasParticipant(roomId, clientId, userId);
  }

  // Participant names operations
  async setParticipantName(
    roomId: string,
    clientId: string,
    name: string | null,
    userId?: string | null,
  ): Promise<void> {
    return this.adapter.setParticipantName(roomId, clientId, name, userId);
  }

  async getParticipantName(
    roomId: string,
    clientId: string,
    userId?: string | null,
  ): Promise<string | null> {
    return this.adapter.getParticipantName(roomId, clientId, userId);
  }

  async deleteParticipantName(roomId: string, clientId: string, userId?: string | null): Promise<void> {
    return this.adapter.deleteParticipantName(roomId, clientId, userId);
  }

  async getAllParticipantNames(
    roomId: string,
  ): Promise<Map<string, string | null>> {
    return this.adapter.getAllParticipantNames(roomId);
  }

  // Participant Supabase users operations
  async setParticipantSupabaseUser(
    roomId: string,
    clientId: string,
    user: SupabaseUserData | null,
    userId?: string | null,
  ): Promise<void> {
    return this.adapter.setParticipantSupabaseUser(roomId, clientId, user, userId);
  }

  async getParticipantSupabaseUser(
    roomId: string,
    clientId: string,
    userId?: string | null,
  ): Promise<SupabaseUserData | null> {
    return this.adapter.getParticipantSupabaseUser(roomId, clientId, userId);
  }

  async deleteParticipantSupabaseUser(
    roomId: string,
    clientId: string,
    userId?: string | null,
  ): Promise<void> {
    return this.adapter.deleteParticipantSupabaseUser(roomId, clientId, userId);
  }

  async getAllParticipantSupabaseUsers(
    roomId: string,
  ): Promise<Map<string, SupabaseUserData | null>> {
    return this.adapter.getAllParticipantSupabaseUsers(roomId);
  }

  // Message operations
  async addMessage(roomId: string, message: RoomMessage): Promise<void> {
    return this.adapter.addMessage(roomId, message);
  }

  async getMessages(roomId: string): Promise<RoomMessage[]> {
    return this.adapter.getMessages(roomId);
  }
}
