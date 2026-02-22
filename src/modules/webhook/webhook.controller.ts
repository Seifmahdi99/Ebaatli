import {
  Controller,
  Post,
  Headers,
  Req,
  Logger,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common';
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

  /**
   * Verify the Shopify HMAC signature and throw 401 if invalid.
   * Returns the raw body string for further use.
   */
  private verifyHmac(
    req: Request & { rawBody?: Buffer },
    hmac: string,
    shop: string,
  ): string {
    const rawBody = req.rawBody?.toString() ?? JSON.stringify(req.body);
    if (!this.shopifyService.verifyWebhook(rawBody, hmac)) {
      this.logger.warn(`Invalid HMAC signature on webhook from shop: ${shop}`);
      throw new UnauthorizedException('Invalid HMAC signature');
    }
    return rawBody;
  }

  // ─── Business webhooks ───────────────────────────────────────────────────

  @Post('orders/created')
  @HttpCode(200)
  async orderCreated(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Headers('x-shopify-shop-domain') shop: string,
  ) {
    this.verifyHmac(req, hmac, shop);
    this.logger.log(`📦 Order created webhook from: ${shop}`);
    const payload = req.body;

    this.webhookService.handleOrderCreated(shop, payload).catch((err) => {
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
    this.verifyHmac(req, hmac, shop);
    this.logger.log(`🔄 Order updated webhook from: ${shop}`);
    const payload = req.body;

    this.webhookService.handleOrderUpdated(shop, payload).catch((err) => {
      this.logger.error('Error processing order updated:', err.message);
    });

    return { status: 'ok' };
  }

  @Post('orders/cancelled')
  @HttpCode(200)
  async orderCancelled(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Headers('x-shopify-shop-domain') shop: string,
  ) {
    this.verifyHmac(req, hmac, shop);
    this.logger.log(`❌ Order cancelled webhook from: ${shop}`);
    return { status: 'ok' };
  }

  @Post('checkouts/created')
  @HttpCode(200)
  async checkoutCreated(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Headers('x-shopify-shop-domain') shop: string,
  ) {
    this.verifyHmac(req, hmac, shop);
    this.logger.log(`🛒 Checkout created webhook from: ${shop}`);
    const payload = req.body;

    this.webhookService.handleCheckoutCreated(shop, payload).catch((err) => {
      this.logger.error('Error processing checkout:', err.message);
    });

    return { status: 'ok' };
  }

  @Post('uninstalled')
  @HttpCode(200)
  async appUninstalled(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Headers('x-shopify-shop-domain') shop: string,
  ) {
    this.verifyHmac(req, hmac, shop);
    this.logger.log(`💔 App uninstalled from: ${shop}`);
    await this.shopifyService.uninstallStore(shop);
    return { status: 'ok' };
  }

  // ─── Mandatory GDPR compliance webhooks ──────────────────────────────────
  // These must be registered in the Shopify Partner Dashboard under
  // "App setup > GDPR webhooks". Shopify will POST to these URLs when
  // merchants or customers make data requests.

  /**
   * customers/data_request
   * A customer or store owner has requested a copy of their personal data.
   * Respond 200 to acknowledge receipt. No personal data is stored beyond
   * what is needed to operate the service.
   */
  @Post('customers/data_request')
  @HttpCode(200)
  async customerDataRequest(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Headers('x-shopify-shop-domain') shop: string,
  ) {
    this.verifyHmac(req, hmac, shop);
    this.logger.log(`📋 Customer data request from: ${shop}`);
    return { status: 'ok' };
  }

  /**
   * customers/redact
   * A customer has requested deletion of their personal data.
   * Anonymise PII stored for this customer.
   */
  @Post('customers/redact')
  @HttpCode(200)
  async customerRedact(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Headers('x-shopify-shop-domain') shop: string,
  ) {
    this.verifyHmac(req, hmac, shop);
    this.logger.log(`🗑️  Customer redact request from: ${shop}`);
    const payload = req.body;

    this.webhookService.handleCustomerRedact(shop, payload).catch((err) => {
      this.logger.error('Error processing customer redact:', err.message);
    });

    return { status: 'ok' };
  }

  /**
   * shop/redact
   * Sent 48 hours after a shop owner uninstalls the app. All shop data
   * should be deleted. Store status is already set to "uninstalled" by the
   * app/uninstalled webhook so no additional action is required here.
   */
  @Post('shop/redact')
  @HttpCode(200)
  async shopRedact(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Headers('x-shopify-shop-domain') shop: string,
  ) {
    this.verifyHmac(req, hmac, shop);
    this.logger.log(`🏪 Shop redact request from: ${shop}`);
    return { status: 'ok' };
  }
}
