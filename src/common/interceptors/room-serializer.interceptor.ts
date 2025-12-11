import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Room } from '../../room/interfaces';

/**
 * Interceptor to serialize Room objects for JSON responses
 *
 * Converts Map objects to plain objects to ensure proper JSON serialization
 */
@Injectable()
export class RoomSerializerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (!data) return data;

        // Handle single room
        if (this.isRoom(data)) {
          return this.serializeRoom(data);
        }

        // Handle array of rooms
        if (Array.isArray(data)) {
          const serialized = data.map((item) =>
            this.isRoom(item) ? this.serializeRoom(item) : item,
          );
          return serialized;
        }

        // Handle nested room in response objects
        if (data && typeof data === 'object') {
          const serialized = { ...data };
          for (const key in serialized) {
            if (this.isRoom(serialized[key])) {
              serialized[key] = this.serializeRoom(serialized[key]);
            } else if (Array.isArray(serialized[key])) {
              serialized[key] = serialized[key].map((item: any) =>
                this.isRoom(item) ? this.serializeRoom(item) : item,
              );
            }
          }
          return serialized;
        }

        return data;
      }),
    );
  }

  private isRoom(obj: any): obj is Room {
    return (
      obj &&
      typeof obj === 'object' &&
      'id' in obj &&
      'name' in obj &&
      'participants' in obj &&
      'participantNames' in obj &&
      'messages' in obj
    );
  }

  private serializeRoom(room: Room): any {
    return {
      id: room.id,
      name: room.name,
      participants: Array.isArray(room.participants)
        ? room.participants
        : [],
      participantNames: this.mapToObject(room.participantNames),
      participantSupabaseUsers: this.mapToObject(room.participantSupabaseUsers),
      createdAt: room.createdAt,
      messages: Array.isArray(room.messages) ? room.messages : [],
    };
  }

  private mapToObject(map: any): any {
    if (!map) return {};
    if (map instanceof Map) {
      return Object.fromEntries(map);
    }
    return map;
  }
}
