import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { ShopifyModule } from '../shopify/shopify.module';
import { FlowModule } from '../flow/flow.module';

@Module({
  imports: [ShopifyModule, FlowModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
