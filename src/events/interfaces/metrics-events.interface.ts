/**
 * Metrics event system types
 *
 * Defines all events emitted for metrics tracking throughout the application.
 */

/**
 * Map of all metrics events and their payload types
 */
export interface MetricsEvents {
  'metrics:client-connected': ClientEventPayload;
  'metrics:client-disconnected': ClientEventPayload;
  'metrics:room-created': RoomEventPayload;
  'metrics:room-deleted': RoomEventPayload;
  'metrics:user-joined-room': UserRoomEventPayload;
  'metrics:user-left-room': UserRoomEventPayload;
  'metrics:message-sent': MessageEventPayload;
}

/**
 * Payload for client connection/disconnection events
 */
export interface ClientEventPayload {
  clientId: string;
  timestamp: Date;
  namespace?: string;
}

/**
 * Payload for room creation/deletion events
 */
export interface RoomEventPayload {
  roomId: string;
  roomName: string;
  timestamp: Date;
}

/**
 * Payload for user joining/leaving room events
 */
export interface UserRoomEventPayload {
  clientId: string;
  roomId: string;
  roomName: string;
  participantName?: string | null;
  timestamp: Date;
}

/**
 * Payload for message sent events
 */
export interface MessageEventPayload {
  messageId: string;
  clientId: string;
  roomId: string;
  roomName: string;
  timestamp: Date;
}

/**
 * Union type of all metrics event keys
 */
export type MetricsEventKeys = keyof MetricsEvents;
