import { Controller, Get, Query, Res, Logger, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ShopifyService } from './shopify.service';
import { ConfigService } from '@nestjs/config';
import { ShopifySessionGuard } from '../../guards/shopify-session.guard';

@Controller('shopify')
export class ShopifyController {
  private readonly logger = new Logger(ShopifyController.name);

  constructor(
    private readonly shopifyService: ShopifyService,
    private readonly config: ConfigService,
  ) {}

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

  // Validate OAuth state nonce — prevents CSRF attacks
  if (!state || !this.shopifyService.validateAndConsumeNonce(state)) {
    this.logger.warn(`Invalid or missing OAuth state for shop: ${shop}`);
    return res.status(403).json({ error: 'Invalid OAuth state. Please try installing the app again.' });
  }

  try {
    // Exchange code for access token
    const accessToken = await this.shopifyService.exchangeToken(shop, code);
    
    // Save store and get store info
    const store = await this.shopifyService.saveStore(shop, accessToken, query.scope || '');
    
    // Register webhooks
    await this.shopifyService.registerWebhooks(shop, accessToken);
    
    this.logger.log(`✅ App installed successfully for: ${shop}`);
    
    // Redirect to Shopify embedded app
    const host = query.host || '';
    const embeddedUrl = `/app/index.html?shop=${shop}&host=${host}`;
    return res.redirect(embeddedUrl);
  } catch (error) {
    this.logger.error('OAuth callback failed:', error);
    return res.status(500).json({ error: 'Installation failed' });
  }
}


  @Get('config')
  getConfig() {
    return {
      apiKey: this.config.get<string>('SHOPIFY_API_KEY') || '',
    };
  }

  /**
   * Diagnostic: list all webhooks currently registered with Shopify for a shop.
   * GET /shopify/webhooks/list?shop=mystore.myshopify.com
   */
  @Get('webhooks/list')
  async listWebhooks(@Query('shop') shop: string) {
    if (!shop) return { error: 'shop query param required' };
    const store = await this.shopifyService.getStoreByShop(shop);
    if (!store) return { error: 'Store not found' };
    return this.shopifyService.listWebhooks(shop, store.accessToken);
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

  // ── Billing Endpoints ────────────────────────────────────────────────────

  /**
   * Create a $20/month subscription for the given shop.
   * Returns { confirmationUrl } — the frontend should redirect to this URL.
   */


@UseGuards(ShopifySessionGuard)
@Get('billing/subscribe')
async createSubscription(@Query('shop') shop: string, @Res() res: any) {
  if (!shop) {
    return res.status(400).json({ error: 'shop parameter required' });
  }
  
  const store = await this.shopifyService.getStoreByShop(shop);
  if (!store) {
    return res.status(404).json({ error: 'Store not found. Please install the app first.' });
  }
  
  try {
    const { confirmationUrl, subscriptionId } =
      await this.shopifyService.createSubscription(shop, store.accessToken);
    
    this.logger.log(`✅ Subscription created, returning confirmationUrl`);
    
    // Return JSON instead of redirect
    return res.json({ confirmationUrl, subscriptionId });
  } catch (error: any) {
    this.logger.error('Billing subscription creation failed:', error);
    return res.status(500).json({ error: error.message || 'Failed to create subscription' });
  }
}
  /**
   * Return current active subscriptions for the shop.
   */
  @UseGuards(ShopifySessionGuard)
  @Get('billing/status')
  async getSubscriptionStatus(@Query('shop') shop: string, @Res() res: any) {
    if (!shop) {
      return res.status(400).json({ error: 'shop parameter required' });
    }

    const store = await this.shopifyService.getStoreByShop(shop);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    try {
      const subscriptions = await this.shopifyService.getSubscriptionStatus(shop, store.accessToken);
      return res.json({ subscriptions });
    } catch (error: any) {
      this.logger.error('Failed to fetch subscription status:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch subscription status' });
    }
  }

  /**
   * Shopify redirects here after merchant confirms/cancels subscription.
   * Redirects back to the embedded app.
   */
  @Get('billing/success')
  async billingSuccess(@Query('shop') shop: string, @Query('charge_id') chargeId: string, @Res() res: any) {
    this.logger.log(`Billing confirmed — shop: ${shop}, charge: ${chargeId}`);

    const store = await this.shopifyService.getStoreByShop(shop);
    if (store) {
      try {
        // Verify the subscription is active with Shopify, then persist to DB
        const subscriptions = await this.shopifyService.getSubscriptionStatus(shop, store.accessToken);
        const active = subscriptions.find((s: any) => s.status === 'ACTIVE');
        if (active) {
          await this.shopifyService.saveSubscriptionToDb(store.id, active.id);
        }
      } catch (err: any) {
        this.logger.error('Failed to persist subscription after billing confirmation:', err);
      }
    }

    return res.redirect(`/app/index.html?shop=${encodeURIComponent(shop)}`);
  }
}
