import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import type { IStorageAdapter } from '../interfaces';
import type { Room, RoomMessage } from '../../room/interfaces';
import { getParticipantKey } from '../../room/interfaces';
import type { SupabaseUserData } from '../../types/room.types';

/**
 * Redis storage adapter
 *
 * Stores all room data in Redis for persistence and scalability.
 * Data survives application restarts.
 *
 * Redis Key Structure (Hybrid):
 * - rooms - Set of all room IDs
 * - room:{roomId} - Room metadata (JSON)
 * - room:{roomId}:participants - Set of participant keys (userId or clientId)
 * - room:{roomId}:participant:{key}:name - Participant name (string)
 * - room:{roomId}:participant:{key}:supabase - Participant Supabase user data (JSON)
 * - room:{roomId}:messages - List of messages (JSON array)
 *
 * Hybrid Key System:
 * - Supabase users: key = userId (persistent across sessions)
 * - Anonymous users: key = clientId (volatile, lost on reconnect)
 */
@Injectable()
export class RedisStorageAdapter implements IStorageAdapter {
  private readonly logger = new Logger(RedisStorageAdapter.name);
  private redis: Redis | null = null;
  private readonly redisUrl: string | undefined;

  constructor() {
    this.redisUrl = process.env.REDIS_URL;
  }

  async initialize(): Promise<void> {
    if (!this.redisUrl) {
      this.logger.warn(
        'REDIS_URL not configured - Redis storage adapter disabled',
      );
      return;
    }

    try {
      this.redis = new Redis(this.redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        lazyConnect: true,
      });

      await this.redis.connect();
      this.logger.log('Redis storage adapter initialized successfully');

      // Handle Redis errors
      this.redis.on('error', (error) => {
        this.logger.error('Redis connection error:', error);
      });

      this.redis.on('close', () => {
        this.logger.warn('Redis connection closed');
      });

      this.redis.on('reconnecting', () => {
        this.logger.log('Redis reconnecting...');
      });
    } catch (error) {
      this.logger.error('Failed to initialize Redis:', error);
      this.redis = null;
    }
  }

  isEnabled(): boolean {
    return this.redis !== null && this.redis.status === 'ready';
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.logger.log('Redis storage adapter closed');
    }
  }

  // Room operations
  async setRoom(roomId: string, room: Room): Promise<void> {
    if (!this.redis) return;

    try {
      // Store room metadata (without Maps and arrays that need special handling)
      const roomData = {
        id: room.id,
        name: room.name,
        createdAt: room.createdAt.toISOString(),
      };

      await this.redis.set(
        `room:${roomId}`,
        JSON.stringify(roomData),
      );

      // Add to rooms set
      await this.redis.sadd('rooms', roomId);

      // Store participants as a set
      if (room.participants.length > 0) {
        await this.redis.sadd(
          `room:${roomId}:participants`,
          ...room.participants,
        );
      }

      // Store participant names
      for (const [key, name] of room.participantNames.entries()) {
        if (name !== null) {
          await this.redis.set(
            `room:${roomId}:participant:${key}:name`,
            name,
          );
        }
      }

      // Store participant Supabase users
      for (const [key, user] of room.participantSupabaseUsers.entries()) {
        if (user !== null) {
          await this.redis.set(
            `room:${roomId}:participant:${key}:supabase`,
            JSON.stringify(user),
          );
        }
      }

      // Store messages
      if (room.messages.length > 0) {
        const messagesJson = room.messages.map((msg) => JSON.stringify(msg));
        await this.redis.rpush(`room:${roomId}:messages`, ...messagesJson);
      }
    } catch (error) {
      this.logger.error(`Failed to set room ${roomId}:`, error);
    }
  }

  async getRoom(roomId: string): Promise<Room | null> {
    if (!this.redis) return null;

    try {
      const roomData = await this.redis.get(`room:${roomId}`);
      if (!roomData) return null;

      const room = JSON.parse(roomData);

      // Reconstruct participants array
      const participants = await this.redis.smembers(
        `room:${roomId}:participants`,
      );

      // Reconstruct participantNames Map
      const participantNames = new Map<string, string | null>();
      for (const key of participants) {
        const name = await this.redis.get(
          `room:${roomId}:participant:${key}:name`,
        );
        participantNames.set(key, name);
      }

      // Reconstruct participantSupabaseUsers Map
      const participantSupabaseUsers = new Map<
        string,
        SupabaseUserData | null
      >();
      for (const key of participants) {
        const userData = await this.redis.get(
          `room:${roomId}:participant:${key}:supabase`,
        );
        participantSupabaseUsers.set(
          key,
          userData ? JSON.parse(userData) : null,
        );
      }

      // Reconstruct messages array
      const messagesJson = await this.redis.lrange(
        `room:${roomId}:messages`,
        0,
        -1,
      );
      const messages = messagesJson.map((msg) => {
        const parsed = JSON.parse(msg);
        return {
          ...parsed,
          timestamp: new Date(parsed.timestamp),
        };
      });

      return {
        id: room.id,
        name: room.name,
        participants,
        participantNames,
        participantSupabaseUsers,
        createdAt: new Date(room.createdAt),
        messages,
      };
    } catch (error) {
      this.logger.error(`Failed to get room ${roomId}:`, error);
      return null;
    }
  }

  async deleteRoom(roomId: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      // Get all participants to clean up their data
      const participants = await this.redis.smembers(
        `room:${roomId}:participants`,
      );

      // Delete all participant-related keys
      const keysToDelete = [
        `room:${roomId}`,
        `room:${roomId}:participants`,
        `room:${roomId}:messages`,
      ];

      for (const key of participants) {
        keysToDelete.push(
          `room:${roomId}:participant:${key}:name`,
          `room:${roomId}:participant:${key}:supabase`,
        );
      }

      await this.redis.del(...keysToDelete);
      await this.redis.srem('rooms', roomId);

      return true;
    } catch (error) {
      this.logger.error(`Failed to delete room ${roomId}:`, error);
      return false;
    }
  }

  async getAllRooms(): Promise<Room[]> {
    if (!this.redis) return [];

    try {
      const roomIds = await this.redis.smembers('rooms');
      const rooms: Room[] = [];

      for (const roomId of roomIds) {
        const room = await this.getRoom(roomId);
        if (room) {
          rooms.push(room);
        }
      }

      return rooms;
    } catch (error) {
      this.logger.error('Failed to get all rooms:', error);
      return [];
    }
  }

  // Participant operations
  async addParticipant(roomId: string, clientId: string, userId?: string | null): Promise<void> {
    if (!this.redis) return;

    try {
      const key = getParticipantKey(clientId, userId);
      await this.redis.sadd(`room:${roomId}:participants`, key);
    } catch (error) {
      this.logger.error(
        `Failed to add participant ${clientId} to room ${roomId}:`,
        error,
      );
    }
  }

  async removeParticipant(roomId: string, clientId: string, userId?: string | null): Promise<void> {
    if (!this.redis) return;

    try {
      const key = getParticipantKey(clientId, userId);
      await this.redis.srem(`room:${roomId}:participants`, key);
      // Also clean up participant data
      await this.redis.del(
        `room:${roomId}:participant:${key}:name`,
        `room:${roomId}:participant:${key}:supabase`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to remove participant ${clientId} from room ${roomId}:`,
        error,
      );
    }
  }

  async getParticipants(roomId: string): Promise<string[]> {
    if (!this.redis) return [];

    try {
      return await this.redis.smembers(`room:${roomId}:participants`);
    } catch (error) {
      this.logger.error(
        `Failed to get participants for room ${roomId}:`,
        error,
      );
      return [];
    }
  }

  async hasParticipant(roomId: string, clientId: string, userId?: string | null): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const key = getParticipantKey(clientId, userId);
      const result = await this.redis.sismember(
        `room:${roomId}:participants`,
        key,
      );
      return result === 1;
    } catch (error) {
      this.logger.error(
        `Failed to check participant ${clientId} in room ${roomId}:`,
        error,
      );
      return false;
    }
  }

  // Participant names operations
  async setParticipantName(
    roomId: string,
    clientId: string,
    name: string | null,
    userId?: string | null,
  ): Promise<void> {
    if (!this.redis) return;

    try {
      const key = getParticipantKey(clientId, userId);
      if (name === null) {
        await this.redis.del(`room:${roomId}:participant:${key}:name`);
      } else {
        await this.redis.set(
          `room:${roomId}:participant:${key}:name`,
          name,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to set participant name for ${clientId} in room ${roomId}:`,
        error,
      );
    }
  }

  async getParticipantName(
    roomId: string,
    clientId: string,
    userId?: string | null,
  ): Promise<string | null> {
    if (!this.redis) return null;

    try {
      const key = getParticipantKey(clientId, userId);
      return await this.redis.get(
        `room:${roomId}:participant:${key}:name`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to get participant name for ${clientId} in room ${roomId}:`,
        error,
      );
      return null;
    }
  }

  async deleteParticipantName(
    roomId: string,
    clientId: string,
    userId?: string | null,
  ): Promise<void> {
    if (!this.redis) return;

    try {
      const key = getParticipantKey(clientId, userId);
      await this.redis.del(`room:${roomId}:participant:${key}:name`);
    } catch (error) {
      this.logger.error(
        `Failed to delete participant name for ${clientId} in room ${roomId}:`,
        error,
      );
    }
  }

  async getAllParticipantNames(
    roomId: string,
  ): Promise<Map<string, string | null>> {
    if (!this.redis) return new Map();

    try {
      const participants = await this.redis.smembers(
        `room:${roomId}:participants`,
      );
      const names = new Map<string, string | null>();

      for (const key of participants) {
        const name = await this.redis.get(
          `room:${roomId}:participant:${key}:name`,
        );
        names.set(key, name);
      }

      return names;
    } catch (error) {
      this.logger.error(
        `Failed to get all participant names for room ${roomId}:`,
        error,
      );
      return new Map();
    }
  }

  // Participant Supabase users operations
  async setParticipantSupabaseUser(
    roomId: string,
    clientId: string,
    user: SupabaseUserData | null,
    userId?: string | null,
  ): Promise<void> {
    if (!this.redis) return;

    try {
      const key = getParticipantKey(clientId, userId);
      if (user === null) {
        await this.redis.del(
          `room:${roomId}:participant:${key}:supabase`,
        );
      } else {
        await this.redis.set(
          `room:${roomId}:participant:${key}:supabase`,
          JSON.stringify(user),
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to set Supabase user for ${clientId} in room ${roomId}:`,
        error,
      );
    }
  }

  async getParticipantSupabaseUser(
    roomId: string,
    clientId: string,
    userId?: string | null,
  ): Promise<SupabaseUserData | null> {
    if (!this.redis) return null;

    try {
      const key = getParticipantKey(clientId, userId);
      const userData = await this.redis.get(
        `room:${roomId}:participant:${key}:supabase`,
      );
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      this.logger.error(
        `Failed to get Supabase user for ${clientId} in room ${roomId}:`,
        error,
      );
      return null;
    }
  }

  async deleteParticipantSupabaseUser(
    roomId: string,
    clientId: string,
    userId?: string | null,
  ): Promise<void> {
    if (!this.redis) return;

    try {
      const key = getParticipantKey(clientId, userId);
      await this.redis.del(`room:${roomId}:participant:${key}:supabase`);
    } catch (error) {
      this.logger.error(
        `Failed to delete Supabase user for ${clientId} in room ${roomId}:`,
        error,
      );
    }
  }

  async getAllParticipantSupabaseUsers(
    roomId: string,
  ): Promise<Map<string, SupabaseUserData | null>> {
    if (!this.redis) return new Map();

    try {
      const participants = await this.redis.smembers(
        `room:${roomId}:participants`,
      );
      const users = new Map<string, SupabaseUserData | null>();

      for (const key of participants) {
        const userData = await this.redis.get(
          `room:${roomId}:participant:${key}:supabase`,
        );
        users.set(key, userData ? JSON.parse(userData) : null);
      }

      return users;
    } catch (error) {
      this.logger.error(
        `Failed to get all Supabase users for room ${roomId}:`,
        error,
      );
      return new Map();
    }
  }

  // Message operations
  async addMessage(roomId: string, message: RoomMessage): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.rpush(
        `room:${roomId}:messages`,
        JSON.stringify(message),
      );
    } catch (error) {
      this.logger.error(
        `Failed to add message to room ${roomId}:`,
        error,
      );
    }
  }

  async getMessages(roomId: string): Promise<RoomMessage[]> {
    if (!this.redis) return [];

    try {
      const messagesJson = await this.redis.lrange(
        `room:${roomId}:messages`,
        0,
        -1,
      );

      return messagesJson.map((msg) => {
        const parsed = JSON.parse(msg);
        return {
          ...parsed,
          timestamp: new Date(parsed.timestamp),
        };
      });
    } catch (error) {
      this.logger.error(`Failed to get messages for room ${roomId}:`, error);
      return [];
    }
  }
}
