import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ApplicationService } from '../application/application.service';
import { RoomPersistenceService, RoomMetadata } from './room.persistence.service';

interface RoomApplicationRow {
  created_by: string | null;
  created_at: string;
  application:
    | {
        id: string;
        name: string;
        description: string | null;
        key: string;
        created_by: string;
        created_at: string;
        updated_at: string;
        is_active: boolean;
      }
    | {
        id: string;
        name: string;
        description: string | null;
        key: string;
        created_by: string;
        created_at: string;
        updated_at: string;
        is_active: boolean;
      }[]
    | null;
}

interface RoomAssociationRow {
  room_id: string;
  created_by: string | null;
  created_at: string;
}

@Injectable()
export class RoomApplicationService {
  private readonly logger = new Logger(RoomApplicationService.name);
  private readonly TABLE_NAME = 'room_applications';

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly applicationService: ApplicationService,
    private readonly roomPersistenceService: RoomPersistenceService,
  ) {}

  async addApplicationToRoom(
    userId: string,
    roomId: string,
    applicationId: string,
  ): Promise<void> {
    await this.ensureRoomAccess(roomId, userId);
    await this.applicationService.findOne(userId, applicationId);

    const client = this.getClientOrThrow();
    const { error } = await client
      .from(this.TABLE_NAME)
      .upsert(
        {
          room_id: roomId,
          application_id: applicationId,
          created_by: userId,
        },
        { onConflict: 'room_id,application_id' },
      );

    if (error) {
      this.logger.error(`Failed to link application to room: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to associate application with room',
      );
    }
  }

  async removeApplicationFromRoom(
    userId: string,
    roomId: string,
    applicationId: string,
  ): Promise<void> {
    await this.ensureRoomAccess(roomId, userId);
    await this.applicationService.findOne(userId, applicationId);

    const client = this.getClientOrThrow();
    const { error } = await client
      .from(this.TABLE_NAME)
      .delete()
      .eq('room_id', roomId)
      .eq('application_id', applicationId);

    if (error) {
      this.logger.error(
        `Failed to remove application from room: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to remove application from room',
      );
    }
  }

  async listApplicationsForRoom(
    userId: string,
    roomId: string,
  ): Promise<
    (ReturnType<ApplicationService['toListItem']> & {
      linkedBy: string | null;
      linkedAt: string;
    })[]
  > {
    await this.ensureRoomAccess(roomId, userId);

    const client = this.getClientOrThrow();
    const { data, error } = await client
      .from(this.TABLE_NAME)
      .select(
        'created_by, created_at, application:applications(id, name, description, key, created_by, created_at, updated_at, is_active)',
      )
      .eq('room_id', roomId);

    if (error) {
      this.logger.error(`Failed to list room applications: ${error.message}`);
      throw new InternalServerErrorException('Failed to list room applications');
    }

    return (data as RoomApplicationRow[])
      .flatMap((row) => {
        if (!row.application) {
          return [];
        }

        const applications = Array.isArray(row.application)
          ? row.application
          : [row.application];

        return applications.map((application) => ({
          ...this.applicationService.toListItem(application),
          linkedBy: row.created_by,
          linkedAt: row.created_at,
        }));
      });
  }

  async listRoomsForApplication(
    applicationId: string,
  ): Promise<RoomMetadata[]> {
    const roomIds = await this.listRoomIdsForApplication(applicationId);
    return this.roomPersistenceService.getRoomsByIds(roomIds);
  }

  async listRoomAssociationsForApplication(
    applicationId: string,
  ): Promise<
    (RoomMetadata & { linkedBy: string | null; linkedAt: string })[]
  > {
    const associationRows =
      await this.listRoomAssociationRowsForApplication(applicationId);
    const roomIds = associationRows.map((row) => row.room_id);
    const rooms = await this.roomPersistenceService.getRoomsByIds(roomIds);
    const roomsById = new Map(rooms.map((room) => [room.id, room]));

    return associationRows
      .map((row) => {
        const room = roomsById.get(row.room_id);
        if (!room) {
          return null;
        }
        return {
          ...room,
          linkedBy: row.created_by,
          linkedAt: row.created_at,
        };
      })
      .filter(
        (room): room is RoomMetadata & {
          linkedBy: string | null;
          linkedAt: string;
        } => !!room,
      );
  }

  async listRoomsForApplicationByUser(
    userId: string,
    applicationId: string,
  ): Promise<RoomMetadata[]> {
    await this.applicationService.findOne(userId, applicationId);
    return this.listRoomsForApplication(applicationId);
  }

  async listRoomAssociationsForApplicationByUser(
    userId: string,
    applicationId: string,
  ): Promise<
    (RoomMetadata & { linkedBy: string | null; linkedAt: string })[]
  > {
    await this.applicationService.findOne(userId, applicationId);
    return this.listRoomAssociationsForApplication(applicationId);
  }

  async listRoomIdsForApplication(applicationId: string): Promise<string[]> {
    const client = this.getClientOrThrow();
    const { data, error } = await client
      .from(this.TABLE_NAME)
      .select('room_id')
      .eq('application_id', applicationId);

    if (error) {
      this.logger.error(`Failed to list application rooms: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to list rooms for application',
      );
    }

    return (data || []).map((row: { room_id: string }) => row.room_id);
  }

  private async listRoomAssociationRowsForApplication(
    applicationId: string,
  ): Promise<RoomAssociationRow[]> {
    const client = this.getClientOrThrow();
    const { data, error } = await client
      .from(this.TABLE_NAME)
      .select('room_id, created_by, created_at')
      .eq('application_id', applicationId);

    if (error) {
      this.logger.error(`Failed to list application rooms: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to list rooms for application',
      );
    }

    return (data || []) as RoomAssociationRow[];
  }

  async isApplicationAssociated(
    roomId: string,
    applicationId: string,
  ): Promise<boolean> {
    const client = this.supabaseService.getClient();
    if (!client) {
      return false;
    }

    const { data, error } = await client
      .from(this.TABLE_NAME)
      .select('room_id')
      .eq('room_id', roomId)
      .eq('application_id', applicationId)
      .limit(1);

    if (error) {
      this.logger.error(`Failed to check room association: ${error.message}`);
      return false;
    }

    return (data || []).length > 0;
  }

  private getClientOrThrow() {
    const client = this.supabaseService.getClient();
    if (!client) {
      throw new InternalServerErrorException('Supabase is not configured');
    }
    return client;
  }

  private async ensureRoomAccess(
    roomId: string,
    userId: string,
  ): Promise<RoomMetadata> {
    const room = await this.roomPersistenceService.getRoom(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.createdBy && room.createdBy !== userId) {
      throw new ForbiddenException('You do not have access to this room');
    }

    return room;
  }
}
