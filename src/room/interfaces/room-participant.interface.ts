/**
 * Room participant information
 *
 * Represents a participant in a chat room with their client ID and optional name.
 */
export interface RoomParticipant {
  clientId: string;
  name: string | null;
}
