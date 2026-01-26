import { ApiProperty } from '@nestjs/swagger';
import { SupabaseUserInfo } from './joined-room.event';
import { ApplicationInfo } from './new-message.event';

/**
 * Payload for 'userJoined' event
 * Broadcast to all room participants when a new user joins
 */
export class UserJoinedEvent {
  @ApiProperty({
    description: 'Client socket ID',
    example: 'xW3kJ9pL2mN8qR5t',
  })
  clientId: string;

  @ApiProperty({
    description: 'Participant display name',
    example: 'John Doe',
    nullable: true,
  })
  participantName: string | null;

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
    description: 'Current number of participants',
    example: 5,
  })
  participantCount: number;

  @ApiProperty({
    description: 'Supabase user data if authenticated',
    type: SupabaseUserInfo,
    required: false,
  })
  supabaseUser?: SupabaseUserInfo;

  @ApiProperty({
    description: 'Application data if connected via app key',
    type: ApplicationInfo,
    required: false,
  })
  application?: ApplicationInfo;

  @ApiProperty({
    description: 'Whether the participant is an application',
    example: false,
  })
  isApplication: boolean;
}
