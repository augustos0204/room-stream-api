import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { MetricsEvents, MetricsEventKeys } from './interfaces';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  emitMetricsEvent<K extends MetricsEventKeys>(
    event: K,
    payload: MetricsEvents[K],
  ): void {
    this.logger.debug(`Emitting event: ${event}`, payload);
    this.eventEmitter.emit(event, payload);
  }

  onMetricsEvent<K extends MetricsEventKeys>(
    event: K,
    listener: (payload: MetricsEvents[K]) => void,
  ): void {
    this.logger.debug(`Registering listener for event: ${event}`);
    this.eventEmitter.on(event, listener);
  }

  removeMetricsListener<K extends MetricsEventKeys>(
    event: K,
    listener: (payload: MetricsEvents[K]) => void,
  ): void {
    this.logger.debug(`Removing listener for event: ${event}`);
    this.eventEmitter.off(event, listener);
  }

  removeAllMetricsListeners(): void {
    const metricsEvents: MetricsEventKeys[] = [
      'metrics:client-connected',
      'metrics:client-disconnected',
      'metrics:room-created',
      'metrics:room-deleted',
      'metrics:user-joined-room',
      'metrics:user-left-room',
      'metrics:message-sent',
    ];

    metricsEvents.forEach((event) => {
      this.eventEmitter.removeAllListeners(event);
    });

    this.logger.debug('Removed all metrics listeners');
  }
}
