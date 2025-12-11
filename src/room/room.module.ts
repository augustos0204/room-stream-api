import { Module } from '@nestjs/common';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { RoomGateway } from './room.gateway';
import { EventsModule } from '../events/events.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [EventsModule, SupabaseModule],
  controllers: [RoomController],
  providers: [RoomService, RoomGateway],
  exports: [RoomService],
})
export class RoomModule {}
