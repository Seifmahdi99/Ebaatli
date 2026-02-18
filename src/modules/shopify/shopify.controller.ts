import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { ShopifyService } from './shopify.service';

@Controller('shopify')
export class ShopifyController {
  private readonly logger = new Logger(ShopifyController.name);

  constructor(private readonly shopifyService: ShopifyService) {}

  @Get('install')
  install(@Query('shop') shop: string, @Res() res: Response) {
    if (!shop) {
      return res.status(400).json({ error: 'Shop parameter required' });
    }
    this.logger.log(`Install request from: ${shop}`);
    const authUrl = this.shopifyService.generateAuthUrl(shop);
    return res.redirect(authUrl);
  }

  @Get('callback')
  async callback(
    @Query('shop') shop: string,
    @Query('code') code: string,
    @Query('scope') scope: string,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`OAuth callback from: ${shop}`);
      const accessToken = await this.shopifyService.exchangeToken(shop, code);
      const store = await this.shopifyService.saveStore(shop, accessToken, scope);
      await this.shopifyService.registerWebhooks(shop, accessToken);
      this.logger.log(`✅ Store installed successfully: ${shop}`);
      return res.redirect(`/shopify/success?shop=${shop}&store_id=${store.id}`);
    } catch (error: any) {
      this.logger.error('❌ OAuth callback failed:', error.message);
      return res.status(500).json({ error: 'Installation failed', message: error.message });
    }
  }

  @Get('success')
  success(@Query('shop') shop: string, @Query('store_id') storeId: string) {
    return {
      message: '🎉 App installed successfully!',
      shop,
      storeId,
      status: 'active',
    };
  }
}
