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
 * Represents a single message/event in a chat room.
 */
export interface RoomMessage {
  id: string;
  clientId: string;
  userId?: string; // Supabase User ID (persistent) - optional for anonymous users
  event: string;
  message: string;
  timestamp: Date;
  participantName?: string | null;
  supabaseUser?: SupabaseUserData;
}

/**
 * Helper function to generate participant key
 * Prioritizes userId (Supabase) over clientId (socket)
 */
export function getParticipantKey(
  clientId: string,
  userId?: string | null,
): string {
  return userId || clientId;
}
