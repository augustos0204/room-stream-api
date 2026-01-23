import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

interface SupabaseRoomRecord {
  id: string;
  name: string;
  created_at: string;
  created_by: string | null;
}

export interface RoomMetadata {
  id: string;
  name: string;
  createdAt: Date;
  createdBy: string | null;
}

@Injectable()
export class RoomPersistenceService {
  private readonly logger = new Logger(RoomPersistenceService.name);
  private readonly TABLE_NAME = 'rooms';
  private readonly fallbackRooms = new Map<string, RoomMetadata>();

  constructor(private readonly supabaseService: SupabaseService) {}

  async createRoom(
    roomId: string,
    name: string,
    createdAt: Date,
    createdBy?: string | null,
  ): Promise<RoomMetadata> {
    const client = this.supabaseService.getClient();
    if (!client) {
      const metadata = { id: roomId, name, createdAt, createdBy: createdBy || null };
      this.fallbackRooms.set(roomId, metadata);
      return metadata;
    }

    const { data, error } = await client
      .from(this.TABLE_NAME)
      .insert({
        id: roomId,
        name,
        created_at: createdAt.toISOString(),
        created_by: createdBy || null,
      })
      .select('id, name, created_at, created_by')
      .single();

    if (error || !data) {
      this.logger.error(`Failed to create room: ${error?.message || 'no data'}`);
      throw new InternalServerErrorException('Failed to create room');
    }

    return this.mapToMetadata(data);
  }

  async getRoom(roomId: string): Promise<RoomMetadata | null> {
    const client = this.supabaseService.getClient();
    if (!client) {
      return this.fallbackRooms.get(roomId) || null;
    }

    const { data, error } = await client
      .from(this.TABLE_NAME)
      .select('id, name, created_at, created_by')
      .eq('id', roomId)
      .single();

    if (error || !data) {
      if (error) {
        this.logger.debug(`Failed to fetch room ${roomId}: ${error.message}`);
      }
      return null;
    }

    return this.mapToMetadata(data);
  }

  async getAllRooms(): Promise<RoomMetadata[]> {
    const client = this.supabaseService.getClient();
    if (!client) {
      return Array.from(this.fallbackRooms.values());
    }

    const { data, error } = await client
      .from(this.TABLE_NAME)
      .select('id, name, created_at, created_by')
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to list rooms: ${error.message}`);
      throw new InternalServerErrorException('Failed to list rooms');
    }

    return (data || []).map((room) => this.mapToMetadata(room));
  }

  async getRoomsByIds(roomIds: string[]): Promise<RoomMetadata[]> {
    if (roomIds.length === 0) {
      return [];
    }

    const client = this.supabaseService.getClient();
    if (!client) {
      return roomIds
        .map((roomId) => this.fallbackRooms.get(roomId))
        .filter((room): room is RoomMetadata => !!room);
    }

    const { data, error } = await client
      .from(this.TABLE_NAME)
      .select('id, name, created_at, created_by')
      .in('id', roomIds)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch rooms by IDs: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch rooms');
    }

    return (data || []).map((room) => this.mapToMetadata(room));
  }

  async deleteRoom(roomId: string): Promise<boolean> {
    const client = this.supabaseService.getClient();
    if (!client) {
      return this.fallbackRooms.delete(roomId);
    }

    const { data, error } = await client
      .from(this.TABLE_NAME)
      .delete()
      .eq('id', roomId)
      .select('id');

    if (error) {
      this.logger.error(`Failed to delete room: ${error.message}`);
      throw new InternalServerErrorException('Failed to delete room');
    }

    return (data || []).length > 0;
  }

  private mapToMetadata(room: SupabaseRoomRecord): RoomMetadata {
    return {
      id: room.id,
      name: room.name,
      createdAt: new Date(room.created_at),
      createdBy: room.created_by,
    };
  }
}
