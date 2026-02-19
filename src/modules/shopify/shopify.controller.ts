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
async callback(@Query() query: any, @Res() res: any) {
  const { code, shop, state } = query;

  if (!code || !shop) {
    return res.status(400).json({ error: 'Missing code or shop' });
  }

  try {
    // Exchange code for access token
    const accessToken = await this.shopifyService.exchangeToken(shop, code);
    
    // Save store and get store info
    const store = await this.shopifyService.saveStore(shop, accessToken, query.scope || '');
    
    // Register webhooks
    await this.shopifyService.registerWebhooks(shop, accessToken);
    
    this.logger.log(`✅ App installed successfully for: ${shop}`);
    
    // Redirect to merchant dashboard with storeId
    const dashboardUrl = `/merchant/index.html?storeId=${store.id}`;
    return res.redirect(dashboardUrl);
  } catch (error) {
    this.logger.error('OAuth callback failed:', error);
    return res.status(500).json({ error: 'Installation failed' });
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
