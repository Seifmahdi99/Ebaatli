import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SmsService } from './sms.service';
import { TwilioSmsService } from './twilio.service';

@Module({
  imports: [HttpModule],
  providers: [SmsService, TwilioSmsService],
  exports: [SmsService, TwilioSmsService],
})
export class SmsModule {}
