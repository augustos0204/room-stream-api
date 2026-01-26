import { Module } from '@nestjs/common';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { RoomPersistenceService } from './room.persistence.service';
import { RoomGateway } from './room.gateway';
import {
  RoomApplicationsController,
  ApplicationRoomsController,
} from './room-applications.controller';
import { RoomApplicationService } from './room-application.service';
import { RoomAccessGuard } from '../common/guards/room-access.guard';
import { EventsModule } from '../events/events.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ApplicationModule } from '../application/application.module';

@Module({
  imports: [EventsModule, SupabaseModule, ApplicationModule],
  controllers: [RoomController, RoomApplicationsController, ApplicationRoomsController],
  providers: [
    RoomService,
    RoomGateway,
    RoomPersistenceService,
    RoomApplicationService,
    RoomAccessGuard,
  ],
  exports: [RoomService],
})
export class RoomModule {}
