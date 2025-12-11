import { ApiProperty } from '@nestjs/swagger';

/**
 * Minimal Supabase user data for enrichment
 * Extracted from @supabase/supabase-js User object
 */
export interface SupabaseUserData {
  id: string;
  email: string | null;
  name: string | null;
}

export interface Room {
  id: string;
  name: string;
  participants: string[];
  participantNames: Map<string, string | null>;
  createdAt: Date;
  messages: RoomMessage[];
}

export interface RoomMessage {
  id: string;
  clientId: string;
  message: string;
  timestamp: Date;
  participantName?: string | null;
  supabaseUser?: SupabaseUserData;
}

export class CreateRoomDto {
  @ApiProperty({
    description: 'The name of the chat room',
    example: 'General Chat',
    minLength: 1,
  })
  name: string;
}
