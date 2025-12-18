import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsModule } from './events/events.module';
import { MemoryModule } from './memory/memory.module';
import { RoomModule } from './room/room.module';
import { MetricsModule } from './metrics/metrics.module';
import { HealthModule } from './health/health.module';
import { ViewsModule } from './views/views.module';
import { SupabaseModule } from './supabase/supabase.module';
import { ApplicationModule } from './application/application.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    EventsModule,
    MemoryModule,
    MetricsModule,
    RoomModule,
    ViewsModule,
    SupabaseModule,
    ApplicationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
