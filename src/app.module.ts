import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { CryptoModule } from './modules/crypto/crypto.module';
import { SmsModule } from './modules/sms/sms.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { ShopifyModule } from './modules/shopify/shopify.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { TemplateModule } from './modules/template/template.module';
import { FlowModule } from './modules/flow/flow.module';
import { AdminModule } from './modules/admin/admin.module';
import { WhatsAppOAuthModule } from './modules/whatsapp-oauth/whatsapp-oauth.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CryptoModule,
    SmsModule,
    WhatsAppModule,
    ShopifyModule,
    WebhookModule,
    TemplateModule,
    FlowModule,
    AdminModule,
    WhatsAppOAuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
