import {
  Injectable,
  Logger,
  UnauthorizedException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ShopifyService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ShopifyService.name);
  
  // Store pending OAuth nonces (state values) in-memory
  private readonly pendingNonces = new Map<string, number>();
  private static readonly NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Generate Shopify OAuth URL.
   * The nonce is stored server-side and validated in the callback to
   * prevent CSRF attacks.
   */
  generateAuthUrl(shop: string): string {
    const apiKey = this.config.get<string>('SHOPIFY_API_KEY');
    const scopes = this.config.get<string>('SHOPIFY_SCOPES');
    const redirectUri = this.config.get<string>('SHOPIFY_REDIRECT_URI');
    const nonce = crypto.randomBytes(16).toString('hex');

    // Store nonce with expiry
    this.pendingNonces.set(nonce, Date.now() + ShopifyService.NONCE_TTL_MS);

    const authUrl =
      `https://${shop}/admin/oauth/authorize` +
      `?client_id=${apiKey}` +
      `&scope=${scopes}` +
      `&redirect_uri=${redirectUri}` +
      `&state=${nonce}`;

    this.logger.log(`Generated auth URL for shop: ${shop}`);
    return authUrl;
  }

  /**
   * Validate and consume an OAuth state nonce.
   * Returns true if the nonce is valid and unused; false otherwise.
   * Each nonce can only be used once (consumed on validation).
   */
  validateAndConsumeNonce(nonce: string): boolean {
    const expiry = this.pendingNonces.get(nonce);
    if (expiry === undefined) return false;        // unknown nonce
    this.pendingNonces.delete(nonce);              // consume immediately
    if (Date.now() > expiry) return false;         // expired
    return true;
  }

  /**
   * Exchange authorization code for access token via Shopify OAuth.
   */
  async exchangeToken(shop: string, code: string): Promise<string> {
    const apiKey = this.config.get<string>('SHOPIFY_API_KEY');
    const apiSecret = this.config.get<string>('SHOPIFY_API_SECRET');

    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: apiKey,
        client_secret: apiSecret,
        code,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to exchange token: ${text}`);
    }

    const data = (await response.json()) as any;
    return data.access_token;
  }

  /**
   * Save or update a store in the database.
   */
  async saveStore(shop: string, accessToken: string, scope: string) {
    return this.prisma.store.upsert({
      where: { 
        platform_platformStoreId: {
          platform: 'shopify',
          platformStoreId: shop
        }
      },
      create: {
        platform: 'shopify',
        platformStoreId: shop,
        name: shop.replace('.myshopify.com', ''),
        accessToken,
        scope,
        status: 'active',
        timezone: '(GMT+00:00) UTC',
        currency: 'USD',
        smsQuotaAllocated: 50,
        whatsappQuotaAllocated: 0,
      },
      update: {
        accessToken,
        scope,
        status: 'active',
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Retrieve store by shop domain.
   */
  async getStoreByShop(shop: string) {
    return this.prisma.store.findUnique({
      where: { 
        platform_platformStoreId: {
          platform: 'shopify',
          platformStoreId: shop
        }
      },
    });
  }

  /**
   * Register webhooks with Shopify.
   * 1. List existing webhooks.
   * 2. Delete any that point to a stale/wrong address (e.g. old ngrok tunnels).
   * 3. Create only the webhooks that are missing for the current APP_URL.
   */
  async registerWebhooks(shop: string, accessToken: string) {
    const appUrl  = this.config.get<string>('APP_URL');
    const baseUrl = `https://${shop}/admin/api/2024-01`;
    const authHdr = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    };

    // Define webhooks with correct topic names (underscores, not slashes)
    const desired = [
      {
        topic: 'ORDERS_CREATE',
        address: `${appUrl}/webhooks/shopify/orders/created`,
      },
      {
        topic: 'ORDERS_UPDATED',
        address: `${appUrl}/webhooks/shopify/orders/updated`,
      },
      {
        topic: 'ORDERS_CANCELLED',
        address: `${appUrl}/webhooks/shopify/orders/cancelled`,
      },
      {
        topic: 'CHECKOUTS_CREATE',
        address: `${appUrl}/webhooks/shopify/checkouts/created`,
      },
      {
        topic: 'APP_UNINSTALLED',
        address: `${appUrl}/webhooks/shopify/uninstalled`,
      },
      {
        topic: 'CUSTOMERS_DATA_REQUEST',
        address: `${appUrl}/webhooks/shopify/customers/data_request`,
      },
      {
        topic: 'CUSTOMERS_REDACT',
        address: `${appUrl}/webhooks/shopify/customers/redact`,
      },
      {
        topic: 'SHOP_REDACT',
        address: `${appUrl}/webhooks/shopify/shop/redact`,
      },
    ];

    // 1. Fetch the current webhook list from Shopify
    const listRes  = await fetch(`${baseUrl}/webhooks.json`, { headers: authHdr });
    const listData = await listRes.json() as any;
    const existing: any[] = listData.webhooks || [];
    this.logger.log(`📋 Found ${existing.length} existing webhook(s) for ${shop}`);
    
    // 2. Remove stale webhooks (addresses that don't start with the current APP_URL)
    for (const wh of existing) {
      if (!wh.address.startsWith(appUrl)) {
        const delRes = await fetch(`${baseUrl}/webhooks/${wh.id}.json`, {
          method: 'DELETE',
          headers: authHdr,
        });
        if (delRes.ok || delRes.status === 404) {
          this.logger.log(`🗑️  Deleted stale webhook: ${wh.topic} → ${wh.address}`);
        }
      }
    }

    // 3. Create missing webhooks
    for (const webhook of desired) {
      const alreadyOk = existing.some(
        e => e.topic === webhook.topic && e.address === webhook.address,
      );
      if (alreadyOk) {
        this.logger.log(`✓  Webhook already up-to-date: ${webhook.topic}`);
        continue;
      }

      try {
        const res  = await fetch(`${baseUrl}/webhooks.json`, {
          method: 'POST',
          headers: authHdr,
          body: JSON.stringify({ webhook }),
        });
        const data = await res.json() as any;

        if (res.ok && data.webhook) {
          this.logger.log(`✅ Webhook registered: ${webhook.topic} → ${webhook.address}`);
        } else {
          this.logger.warn(
            `⚠️  Webhook registration failed [${webhook.topic}]: ${JSON.stringify(data.errors || data)}`,
          );
        }
      } catch (err: any) {
        this.logger.error(`Error registering ${webhook.topic}: ${err.message}`);
      }
    }
  }

  /**
   * List all webhooks for a shop
   */
  async listWebhooks(shop: string, accessToken: string) {
    const baseUrl = `https://${shop}/admin/api/2024-01`;
    const response = await fetch(`${baseUrl}/webhooks.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json() as any;
    return data.webhooks || [];
  }

  /**
   * Verify a Shopify webhook using HMAC signature.
   */
  verifyWebhook(rawBody: string, hmacHeader: string): boolean {
    // Shopify signs webhooks with the app's client secret (API secret)
    const secret =
      this.config.get<string>('SHOPIFY_WEBHOOK_SECRET') ||
      this.config.get<string>('SHOPIFY_API_SECRET');

    if (!secret) {
      this.logger.error('No webhook secret configured for HMAC verification');
      return false;
    }

    const hash = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('base64');

    const isValid = hash === hmacHeader;

    if (!isValid) {
      this.logger.error('HMAC mismatch!', {
        calculated: hash.substring(0, 20) + '...',
        received: hmacHeader?.substring(0, 20) + '...',
      });
    }

    return isValid;
  }

  /**
   * Mark store as uninstalled
   */
  async uninstallStore(shop: string) {
    await this.prisma.store.updateMany({
      where: { platformStoreId: shop },
      data: { status: 'uninstalled' },
    });
  }

  /**
   * Create a subscription charge via Shopify Billing API.
   */
  async createSubscription(shop: string, accessToken: string): Promise<{ confirmationUrl: string; subscriptionId: string }> {
    const appUrl = this.config.get<string>('APP_URL');
    const returnUrl = `${appUrl}/shopify/billing/success?shop=${encodeURIComponent(shop)}`;

    const mutation = `
      mutation AppSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!) {
        appSubscriptionCreate(name: $name, returnUrl: $returnUrl, lineItems: $lineItems) {
          userErrors { field message }
          appSubscription { id }
          confirmationUrl
        }
      }
    `;

    const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          name: 'Ebaatli Pro Plan',
          returnUrl,
          lineItems: [
            {
              plan: {
                appRecurringPricingDetails: {
                  price: { amount: 20, currencyCode: 'USD' },
                  interval: 'EVERY_30_DAYS',
                },
              },
            },
          ],
        },
      }),
    });

    const json = await response.json() as any;
    const result = json.data?.appSubscriptionCreate;

    if (!result || !result.confirmationUrl) {
      this.logger.error('Invalid result structure:', json);
      throw new Error('Invalid response from Shopify billing API');
    }

    if (result.userErrors?.length > 0) {
      throw new Error(result.userErrors[0].message);
    }

    this.logger.log(`✅ Subscription created for ${shop}: ${result.appSubscription.id}`);

    return {
      confirmationUrl: result.confirmationUrl,
      subscriptionId: result.appSubscription.id,
    };
  }

  /**
   * Fetch active subscriptions for a shop.
   */
  async getActiveSubscriptions(shop: string, accessToken: string): Promise<any[]> {
    const query = `
      query {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
            lineItems {
              plan {
                pricingDetails {
                  ... on AppRecurringPricing {
                    price { amount currencyCode }
                    interval
                  }
                }
              }
            }
            createdAt
            currentPeriodEnd
          }
        }
      }
    `;

    const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const json = await response.json() as any;
    return json.data?.currentAppInstallation?.activeSubscriptions || [];
  }

  /**
   * Get subscription status (alias for getActiveSubscriptions)
   */
  async getSubscriptionStatus(shop: string, accessToken: string) {
    return this.getActiveSubscriptions(shop, accessToken);
  }

  /**
   * Save subscription to database
   */

async saveSubscriptionToDb(storeId: string, shopifySubscriptionId: string) {
    return this.prisma.subscription.upsert({
      where: {
        storeId: storeId,
      },
      create: {
        storeId: storeId,
        shopifySubscriptionId: shopifySubscriptionId,
        status: 'ACTIVE',
        tier: 'pro',
        startDate: new Date(),
      },
      update: {
        shopifySubscriptionId: shopifySubscriptionId,
        status: 'ACTIVE',
      },
    });
  }


  /**
   * On startup, re-register webhooks for every active store so that the
   * current APP_URL (production domain) is always registered with Shopify.
   * This corrects stale webhook URLs (e.g. ngrok tunnels from development).
   */
  async onApplicationBootstrap() {
    const stores = await this.prisma.store.findMany({
      where: { status: 'active' },
      select: { platformStoreId: true, accessToken: true },
    });

    this.logger.log(`🔁 Re-registering webhooks for ${stores.length} active store(s)…`);

    for (const store of stores) {
      try {
        await this.registerWebhooks(store.platformStoreId, store.accessToken);
      } catch (err: any) {
        this.logger.warn(`Webhook refresh failed for ${store.platformStoreId}: ${err.message}`);
      }
    }
  }
}
