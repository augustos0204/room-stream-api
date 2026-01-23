import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import type { IStorageAdapter } from '../interfaces';
import type { RoomMessage } from '../../rooms/interfaces';
import { getParticipantKey } from '../../rooms/interfaces';
import type { SupabaseUserData } from '../../types/room.types';

/**
 * Redis storage adapter
 *
 * Stores room runtime data in Redis for real-time operations.
 * Data survives application restarts.
 *
 * Redis Key Structure (Hybrid):
 * - room:{roomId}:participants - Set of participant keys (userId or clientId)
 * - room:{roomId}:participant:{key}:presence - Participant presence marker (TTL)
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
  private readonly participantTtlSeconds = parseInt(
    process.env.ROOM_PARTICIPANT_TTL_SECONDS || '120',
    10,
  );

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

  async deleteRoom(roomId: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      // Get all participants to clean up their data
      const participants = await this.redis.smembers(
        `room:${roomId}:participants`,
      );

      // Delete all participant-related keys
      const keysToDelete = [
        `room:${roomId}:participants`,
        `room:${roomId}:messages`,
      ];

      for (const key of participants) {
        keysToDelete.push(
          `room:${roomId}:participant:${key}:presence`,
          `room:${roomId}:participant:${key}:name`,
          `room:${roomId}:participant:${key}:supabase`,
        );
      }

      await this.redis.del(...keysToDelete);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete room ${roomId}:`, error);
      return false;
    }
  }

  // Participant operations
  async addParticipant(roomId: string, clientId: string, userId?: string | null): Promise<void> {
    if (!this.redis) return;

    try {
      const key = getParticipantKey(clientId, userId);
      await this.redis.sadd(`room:${roomId}:participants`, key);
      await this.touchParticipantPresence(roomId, key);
    } catch (error) {
      this.logger.error(
        `Failed to add participant ${clientId} to room ${roomId}:`,
        error,
      );
    }
  }

  async refreshParticipantPresence(
    roomId: string,
    clientId: string,
    userId?: string | null,
  ): Promise<void> {
    if (!this.redis) return;

    try {
      const key = getParticipantKey(clientId, userId);
      const presenceKey = this.getPresenceKey(roomId, key);
      await this.redis.set(
        presenceKey,
        '1',
        'EX',
        this.participantTtlSeconds,
      );

      await this.redis.expire(
        `room:${roomId}:participant:${key}:name`,
        this.participantTtlSeconds,
      );
      await this.redis.expire(
        `room:${roomId}:participant:${key}:supabase`,
        this.participantTtlSeconds,
      );
    } catch (error) {
      this.logger.error(
        `Failed to refresh presence for participant ${clientId} in room ${roomId}:`,
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
        `room:${roomId}:participant:${key}:presence`,
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
      const participants = await this.redis.smembers(
        `room:${roomId}:participants`,
      );

      if (participants.length === 0) {
        return [];
      }

      const presenceKeys = participants.map((key) =>
        this.getPresenceKey(roomId, key),
      );
      const presenceValues = await this.redis.mget(presenceKeys);

      const activeParticipants: string[] = [];
      const staleParticipants: string[] = [];

      presenceValues.forEach((value, index) => {
        const participantKey = participants[index];
        if (value) {
          activeParticipants.push(participantKey);
        } else if (participantKey) {
          staleParticipants.push(participantKey);
        }
      });

      if (staleParticipants.length > 0) {
        await this.cleanupStaleParticipants(roomId, staleParticipants);
      }

      return activeParticipants;
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
      if (result !== 1) {
        return false;
      }

      const isActive = await this.isParticipantActive(roomId, key);
      if (!isActive) {
        await this.cleanupStaleParticipants(roomId, [key]);
      }
      return isActive;
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
          'EX',
          this.participantTtlSeconds,
        );
        await this.touchParticipantPresence(roomId, key);
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
      const isActive = await this.isParticipantActive(roomId, key);
      if (!isActive) {
        await this.cleanupStaleParticipants(roomId, [key]);
        return null;
      }
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
      const participants = await this.getParticipants(roomId);
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
          'EX',
          this.participantTtlSeconds,
        );
        await this.touchParticipantPresence(roomId, key);
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
      const isActive = await this.isParticipantActive(roomId, key);
      if (!isActive) {
        await this.cleanupStaleParticipants(roomId, [key]);
        return null;
      }
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
      const participants = await this.getParticipants(roomId);
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

  private getPresenceKey(roomId: string, key: string): string {
    return `room:${roomId}:participant:${key}:presence`;
  }

  private async touchParticipantPresence(
    roomId: string,
    key: string,
  ): Promise<void> {
    if (!this.redis) return;
    await this.redis.set(
      this.getPresenceKey(roomId, key),
      '1',
      'EX',
      this.participantTtlSeconds,
    );
  }

  private async isParticipantActive(
    roomId: string,
    key: string,
  ): Promise<boolean> {
    if (!this.redis) return false;
    const exists = await this.redis.exists(this.getPresenceKey(roomId, key));
    return exists === 1;
  }

  private async cleanupStaleParticipants(
    roomId: string,
    keys: string[],
  ): Promise<void> {
    if (!this.redis || keys.length === 0) return;

    const redisKeys: string[] = [];
    keys.forEach((key) => {
      redisKeys.push(
        this.getPresenceKey(roomId, key),
        `room:${roomId}:participant:${key}:name`,
        `room:${roomId}:participant:${key}:supabase`,
      );
    });

    await this.redis.srem(`room:${roomId}:participants`, ...keys);
    if (redisKeys.length > 0) {
      await this.redis.del(...redisKeys);
    }
  }
}
