import { Module } from '@nestjs/common';
import { ViewsController } from './views.controller';
import { RoomModule } from '../room/room.module';

@Module({
  imports: [RoomModule],
  controllers: [ViewsController],
  providers: [],
})
export class ViewsModule {}
