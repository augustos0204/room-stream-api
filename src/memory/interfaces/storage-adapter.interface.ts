import type { Room, RoomMessage } from '../../room/interfaces';
import type { SupabaseUserData } from '../../types/room.types';

/**
 * Storage adapter interface for room data persistence
 *
 * Defines the contract for storage implementations (in-memory or Redis)
 */
export interface IStorageAdapter {
  /**
   * Initialize the storage adapter
   */
  initialize(): Promise<void>;

  /**
   * Check if the adapter is enabled and ready
   */
  isEnabled(): boolean;

  /**
   * Close/cleanup the storage adapter
   */
  close(): Promise<void>;

  // Room operations
  setRoom(roomId: string, room: Room): Promise<void>;
  getRoom(roomId: string): Promise<Room | null>;
  deleteRoom(roomId: string): Promise<boolean>;
  getAllRooms(): Promise<Room[]>;

  // Participant operations
  addParticipant(roomId: string, clientId: string, userId?: string | null): Promise<void>;
  removeParticipant(roomId: string, clientId: string, userId?: string | null): Promise<void>;
  getParticipants(roomId: string): Promise<string[]>;
  hasParticipant(roomId: string, clientId: string, userId?: string | null): Promise<boolean>;

  // Participant names operations
  setParticipantName(
    roomId: string,
    clientId: string,
    name: string | null,
    userId?: string | null,
  ): Promise<void>;
  getParticipantName(
    roomId: string,
    clientId: string,
    userId?: string | null,
  ): Promise<string | null>;
  deleteParticipantName(roomId: string, clientId: string, userId?: string | null): Promise<void>;
  getAllParticipantNames(
    roomId: string,
  ): Promise<Map<string, string | null>>;

  // Participant Supabase users operations
  setParticipantSupabaseUser(
    roomId: string,
    clientId: string,
    user: SupabaseUserData | null,
    userId?: string | null,
  ): Promise<void>;
  getParticipantSupabaseUser(
    roomId: string,
    clientId: string,
    userId?: string | null,
  ): Promise<SupabaseUserData | null>;
  deleteParticipantSupabaseUser(roomId: string, clientId: string, userId?: string | null): Promise<void>;
  getAllParticipantSupabaseUsers(
    roomId: string,
  ): Promise<Map<string, SupabaseUserData | null>>;

  // Message operations
  addMessage(roomId: string, message: RoomMessage): Promise<void>;
  getMessages(roomId: string): Promise<RoomMessage[]>;
}
