import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventService } from './event.service';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Use wildcard to allow all events
      wildcard: true,
      // Delimiter for namespaced events
      delimiter: '.',
      // Maximum number of listeners
      maxListeners: 20,
      // Show warnings for memory leaks
      verboseMemoryLeak: true,
      // Ignore errors in event handlers
      ignoreErrors: false,
    }),
  ],
  providers: [EventService],
  exports: [EventService, EventEmitterModule],
})
export class EventModule {}
