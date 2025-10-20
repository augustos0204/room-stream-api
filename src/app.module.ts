import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsModule } from './events/events.module';
import { RoomModule } from './room/room.module';
import { MetricsModule } from './metrics/metrics.module';
import { HealthModule } from './health/health.module';
import { ViewsModule } from './views/views.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    EventsModule,
    MetricsModule,
    RoomModule,
    ViewsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
