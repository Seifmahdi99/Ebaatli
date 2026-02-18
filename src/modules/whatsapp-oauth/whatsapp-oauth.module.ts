import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WhatsAppOAuthController } from './whatsapp-oauth.controller';
import { WhatsAppOAuthService } from './whatsapp-oauth.service';

@Module({
  imports: [HttpModule],
  controllers: [WhatsAppOAuthController],
  providers: [WhatsAppOAuthService],
  exports: [WhatsAppOAuthService],
})
export class WhatsAppOAuthModule {}
