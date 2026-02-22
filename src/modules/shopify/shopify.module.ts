import { Module } from '@nestjs/common';
import { ShopifyService } from './shopify.service';
import { ShopifyController } from './shopify.controller';
import { ShopifySessionGuard } from '../../guards/shopify-session.guard';

@Module({
  providers: [ShopifyService, ShopifySessionGuard],
  exports: [ShopifyService],
  controllers: [ShopifyController],
})
export class ShopifyModule {}
