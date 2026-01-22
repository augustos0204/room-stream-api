import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Supabase user data in responses
 */
export class SupabaseUserDataDto {
  @ApiProperty({
    description: 'Supabase user ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
    nullable: true,
  })
  email: string | null;

  @ApiProperty({
    description: 'User display name',
    example: 'John Doe',
    nullable: true,
  })
  name: string | null;
}

/**
 * Room message in responses
 */
export class RoomMessageDto {
  @ApiProperty({
    description: 'Message unique ID',
    example: 'msg_1737550000000_abc123def',
  })
  id: string;

  @ApiProperty({
    description: 'Sender client ID',
    example: 'xW3kJ9pL2mN8qR5t',
  })
  clientId: string;

  @ApiProperty({
    description: 'Sender user ID (if authenticated)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  userId?: string;

  @ApiProperty({
    description: 'Event type',
    example: 'message',
  })
  event: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello everyone!',
  })
  message: string;

  @ApiProperty({
    description: 'Message timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: Date;

  @ApiPropertyOptional({
    description: 'Sender display name',
    example: 'John Doe',
    nullable: true,
  })
  participantName?: string | null;

  @ApiPropertyOptional({
    description: 'Supabase user data if authenticated',
    type: SupabaseUserDataDto,
  })
  supabaseUser?: SupabaseUserDataDto;
}

/**
 * Room participant in responses
 */
export class RoomParticipantDto {
  @ApiProperty({
    description: 'Client socket ID or user ID',
    example: 'xW3kJ9pL2mN8qR5t',
  })
  clientId: string;

  @ApiProperty({
    description: 'Participant display name',
    example: 'John Doe',
    nullable: true,
  })
  name: string | null;

  @ApiPropertyOptional({
    description: 'Supabase user data if authenticated',
    type: SupabaseUserDataDto,
  })
  supabaseUser?: SupabaseUserDataDto;
}

/**
 * DTO for Room response
 * Used by GET /room, GET /room/:id, POST /room
 */
export class RoomResponseDto {
  @ApiProperty({
    description: 'Room unique ID',
    example: 'room_1737550000000_abc123def',
  })
  id: string;

  @ApiProperty({
    description: 'Room display name',
    example: 'General Chat',
  })
  name: string;

  @ApiProperty({
    description: 'List of participant IDs',
    example: ['xW3kJ9pL2mN8qR5t', '550e8400-e29b-41d4-a716-446655440000'],
    type: [String],
  })
  participants: string[];

  @ApiProperty({
    description: 'Room creation timestamp',
    example: '2024-01-15T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Room messages',
    type: [RoomMessageDto],
    example: [
      {
        id: 'msg_1737550000000_abc123def',
        clientId: 'xW3kJ9pL2mN8qR5t',
        event: 'message',
        message: 'Hello everyone!',
        timestamp: '2024-01-15T10:30:00.000Z',
        participantName: 'John Doe',
      },
    ],
  })
  messages: RoomMessageDto[];
}

/**
 * DTO for GET /room/:id/messages response
 */
export class RoomMessagesResponseDto {
  @ApiProperty({
    description: 'Room unique ID',
    example: 'room_1737550000000_abc123def',
  })
  roomId: string;

  @ApiProperty({
    description: 'Room display name',
    example: 'General Chat',
  })
  roomName: string;

  @ApiProperty({
    description: 'All messages in the room',
    type: [RoomMessageDto],
    example: [
      {
        id: 'msg_1737550000000_abc123def',
        clientId: 'xW3kJ9pL2mN8qR5t',
        event: 'message',
        message: 'Hello everyone!',
        timestamp: '2024-01-15T10:30:00.000Z',
        participantName: 'John Doe',
      },
    ],
  })
  messages: RoomMessageDto[];

  @ApiProperty({
    description: 'Total number of messages',
    example: 42,
  })
  totalMessages: number;
}

/**
 * DTO for GET /room/:id/participants response
 */
export class RoomParticipantsResponseDto {
  @ApiProperty({
    description: 'Room unique ID',
    example: 'room_1737550000000_abc123def',
  })
  roomId: string;

  @ApiProperty({
    description: 'Room display name',
    example: 'General Chat',
  })
  roomName: string;

  @ApiProperty({
    description: 'List of participants with names',
    type: [RoomParticipantDto],
    example: [
      {
        clientId: 'xW3kJ9pL2mN8qR5t',
        name: 'John Doe',
        supabaseUser: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'john@example.com',
          name: 'John Doe',
        },
      },
    ],
  })
  participants: RoomParticipantDto[];

  @ApiProperty({
    description: 'Total number of participants',
    example: 5,
  })
  participantCount: number;
}

/**
 * DTO for DELETE /room/:id response
 */
export class DeleteRoomResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Sala deletada com sucesso',
  })
  message: string;
}
