import { Module, Global } from '@nestjs/common';
import { MemoryService } from './memory.service';
import { InMemoryStorageAdapter } from './adapters/in-memory-storage.adapter';
import { RedisStorageAdapter } from './adapters/redis-storage.adapter';

/**
 * Memory module
 *
 * Provides storage abstraction with automatic Redis fallback to in-memory storage.
 * Made global to be available throughout the application.
 */
@Global()
@Module({
  providers: [
    MemoryService,
    InMemoryStorageAdapter,
    RedisStorageAdapter,
  ],
  exports: [MemoryService],
})
export class MemoryModule {}
