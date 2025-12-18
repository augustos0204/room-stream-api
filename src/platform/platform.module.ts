import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PagesService } from './pages.service';
import { RoomModule } from '../room/room.module';

@Module({
  imports: [RoomModule],
  controllers: [PlatformController],
  providers: [PagesService],
  exports: [PagesService],
})
export class PlatformModule {}
