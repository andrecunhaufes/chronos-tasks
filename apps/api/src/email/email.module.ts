import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailWorker } from './email.worker';
import { ProvedorEmailService } from './provedor-email.service';

@Module({
  providers: [EmailService, EmailWorker, ProvedorEmailService],
  exports: [EmailService, ProvedorEmailService],
})
export class EmailModule {}
