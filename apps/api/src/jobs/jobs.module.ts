import { Global, Module } from '@nestjs/common';
import { JobQueueService } from './job-queue.service';
import { OutboxDispatcherService } from './outbox-dispatcher.service';

@Global()
@Module({
  providers: [JobQueueService, OutboxDispatcherService],
  exports: [JobQueueService, OutboxDispatcherService],
})
export class JobsModule {}
