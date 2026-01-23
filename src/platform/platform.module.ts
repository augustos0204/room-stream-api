import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PagesService } from './pages.service';
import { RoomModule } from '../rooms/room.module';

@Module({
  imports: [RoomModule],
  controllers: [PlatformController],
  providers: [PagesService],
  exports: [PagesService],
})
export class PlatformModule {}
