import { Controller, Post, Headers, Req, Logger, HttpCode } from '@nestjs/common';
import type { Request } from 'express';
import { ShopifyService } from '../shopify/shopify.service';
import { WebhookService } from './webhook.service';

@Controller('webhooks/shopify')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly shopifyService: ShopifyService,
    private readonly webhookService: WebhookService,
  ) {}

  @Post('orders/created')
  @HttpCode(200)
  async orderCreated(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Headers('x-shopify-shop-domain') shop: string,
  ) {
    this.logger.log(`📦 Order created webhook from: ${shop}`);
    const rawBody = req.rawBody?.toString() || JSON.stringify(req.body);
    const payload = req.body;

    this.webhookService.handleOrderCreated(shop, payload).catch(err => {
      this.logger.error('Error processing order created:', err.message);
    });

    return { status: 'ok' };
  }

  @Post('orders/updated')
  @HttpCode(200)
  async orderUpdated(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Headers('x-shopify-shop-domain') shop: string,
  ) {
    this.logger.log(`🔄 Order updated webhook from: ${shop}`);
    const payload = req.body;

    this.webhookService.handleOrderUpdated(shop, payload).catch(err => {
      this.logger.error('Error processing order updated:', err.message);
    });

    return { status: 'ok' };
  }

  @Post('checkouts/created')
  @HttpCode(200)
  async checkoutCreated(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Headers('x-shopify-shop-domain') shop: string,
  ) {
    this.logger.log(`🛒 Checkout created webhook from: ${shop}`);
    const payload = req.body;

    this.webhookService.handleCheckoutCreated(shop, payload).catch(err => {
      this.logger.error('Error processing checkout:', err.message);
    });

    return { status: 'ok' };
  }

  @Post('uninstalled')
  @HttpCode(200)
  async appUninstalled(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-shopify-shop-domain') shop: string,
  ) {
    this.logger.log(`💔 App uninstalled from: ${shop}`);
    await this.shopifyService.uninstallStore(shop);
    return { status: 'ok' };
  }
}
