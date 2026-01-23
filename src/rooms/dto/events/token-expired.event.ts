import { ApiProperty } from '@nestjs/swagger';

/**
 * Payload for 'tokenExpired' event
 * Sent to client when Supabase JWT token expires
 */
export class TokenExpiredEvent {
  @ApiProperty({ description: 'Expiration message', example: 'Your session has expired. Please log in again.' })
  message: string;

  @ApiProperty({ description: 'User ID of the expired session', example: '550e8400-e29b-41d4-a716-446655440000' })
  userId: string;
}
