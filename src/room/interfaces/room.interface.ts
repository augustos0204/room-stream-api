import { SupabaseUserData } from '../../types/room.types';

/**
 * Main room entity interface
 *
 * Represents a chat room with participants and messages.
 */
export interface Room {
  id: string;
  name: string;
  participants: string[];
  participantNames: Map<string, string | null>;
  participantSupabaseUsers: Map<string, SupabaseUserData | null>;
  createdAt: Date;
  messages: RoomMessage[];
}

/**
 * Room message structure
 *
 * Represents a single message in a chat room.
 */
export interface RoomMessage {
  id: string;
  clientId: string;
  message: string;
  timestamp: Date;
  participantName?: string | null;
  supabaseUser?: SupabaseUserData;
}
