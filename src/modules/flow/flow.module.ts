import { Module } from '@nestjs/common';
import { FlowService } from './flow.service';
import { SmsModule } from '../sms/sms.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { TemplateModule } from '../template/template.module';

@Module({
  imports: [SmsModule, WhatsAppModule, TemplateModule],
  providers: [FlowService],
  exports: [FlowService],
})
export class FlowModule {}
