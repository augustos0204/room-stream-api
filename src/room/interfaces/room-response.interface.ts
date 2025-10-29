import type { RoomMessage } from './room.interface';
import type { RoomParticipant } from './room-participant.interface';

/**
 * Response when successfully joining a room
 */
export interface JoinedRoomResponse {
  roomId: string;
  roomName: string;
  participants: RoomParticipant[];
  recentMessages: RoomMessage[];
}

/**
 * Response/Event when a user joins a room
 */
export interface UserJoinedResponse {
  clientId: string;
  participantName: string | null;
  roomId: string;
  roomName: string;
  participantCount: number;
}

/**
 * Response/Event when a user leaves a room
 */
export interface UserLeftResponse {
  clientId: string;
  participantName: string | null;
  roomId: string;
  roomName: string;
  participantCount: number;
}

/**
 * Response for GET /room/:id/messages endpoint
 */
export interface RoomMessagesResponse {
  roomId: string;
  roomName: string;
  messages: RoomMessage[];
  totalMessages: number;
}

/**
 * Response for GET /room/:id/participants endpoint
 */
export interface RoomParticipantsResponse {
  roomId: string;
  roomName: string;
  participants: RoomParticipant[];
  participantCount: number;
}

/**
 * Response when leaving a room
 */
export interface LeftRoomResponse {
  roomId: string;
}

/**
 * Response/Event when a new message is received
 */
export interface NewMessageResponse {
  messageId: string;
  clientId: string;
  participantName: string | null;
  message: string;
  timestamp: Date;
  roomId: string;
  roomName: string;
}

/**
 * Response when getting room info
 */
export interface RoomInfoResponse {
  id: string;
  name: string;
  participantCount: number;
  messageCount: number;
  participants: RoomParticipant[];
}

/**
 * Response/Event when participant name is updated
 */
export interface ParticipantNameUpdatedResponse {
  clientId: string;
  oldName: string | null;
  newName: string | null;
  roomId: string;
  roomName: string;
}
