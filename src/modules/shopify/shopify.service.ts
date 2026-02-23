import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ShopifyService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ShopifyService.name);

  // In-memory nonce store for OAuth CSRF protection.
  // Maps nonce → expiry timestamp (ms). Nonces expire after 10 minutes.
  private readonly pendingNonces = new Map<string, number>();
  private static readonly NONCE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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
    // Clean up any expired nonces while we're here
    this.purgeExpiredNonces();

    const authUrl = `https://${shop}/admin/oauth/authorize` +
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

  private purgeExpiredNonces(): void {
    const now = Date.now();
    for (const [nonce, expiry] of this.pendingNonces) {
      if (now > expiry) this.pendingNonces.delete(nonce);
    }
  }

  /**
   * Exchange code for access token
   * Called after merchant approves our app
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

    const data = await response.json() as { access_token: string; scope: string };
    
    if (!data.access_token) {
      throw new Error('Failed to get access token from Shopify');
    }

    this.logger.log(`✅ Got access token for shop: ${shop}`);
    return data.access_token;
  }

  /**
   * Save store to database after installation
   */
  async saveStore(shop: string, accessToken: string, scope: string) {
    const storeInfo = await this.getShopInfo(shop, accessToken);

    const store = await this.prisma.store.upsert({
      where: {
        platform_platformStoreId: {
          platform: 'shopify',
          platformStoreId: shop,
        }
      },
      create: {
        platform: 'shopify',
        platformStoreId: shop,
        name: storeInfo.name,
        timezone: storeInfo.timezone || 'Africa/Cairo',
        currency: storeInfo.currency || 'EGP',
        accessToken: accessToken,
        scope: scope,
        status: 'active',
        smsQuotaAllocated: 50, // Free tier default
        smsQuotaUsed: 0,
      },
      update: {
        accessToken: accessToken,
        scope: scope,
        status: 'active',
        name: storeInfo.name,
      },
    });

    this.logger.log(`✅ Store saved: ${shop} (ID: ${store.id})`);
    return store;
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
        } else {
          this.logger.warn(`⚠️  Could not delete stale webhook ${wh.id}: HTTP ${delRes.status}`);
        }
      }
    }

    // 3. Create any missing webhooks for the current APP_URL
    const desired = [
      { topic: 'orders/create',    address: `${appUrl}/webhooks/shopify/orders/created`    },
      { topic: 'orders/updated',   address: `${appUrl}/webhooks/shopify/orders/updated`    },
      { topic: 'orders/cancelled', address: `${appUrl}/webhooks/shopify/orders/cancelled`  },
      { topic: 'checkouts/create', address: `${appUrl}/webhooks/shopify/checkouts/created` },
      { topic: 'app/uninstalled',  address: `${appUrl}/webhooks/shopify/uninstalled`       },
    ];

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
      } catch (error: any) {
        this.logger.error(`❌ Failed to register webhook: ${webhook.topic}`, error);
      }
    }
  }

  /**
   * Return the raw webhook list from Shopify (used by the diagnostic endpoint).
   */
  async listWebhooks(shop: string, accessToken: string) {
    const res  = await fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
      headers: { 'X-Shopify-Access-Token': accessToken },
    });
    const data = await res.json() as any;
    return { webhooks: data.webhooks || [], total: (data.webhooks || []).length };
  }

  /**
   * Get shop information from Shopify
   */
  async getShopInfo(shop: string, accessToken: string) {
    const response = await fetch(
      `https://${shop}/admin/api/2024-01/shop.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json() as { shop: any };
    return {
      name: data.shop.name,
      email: data.shop.email,
      timezone: data.shop.timezone,
      currency: data.shop.currency,
    };
  }

  /**
   * Verify Shopify webhook signature
   * Security: make sure webhook is really from Shopify
   */

verifyWebhook(rawBody: string, hmacHeader: string): boolean {
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
      where: {
        platform: 'shopify',
        platformStoreId: shop,
      },
      data: { status: 'uninstalled' },
    });
    this.logger.log(`Store uninstalled: ${shop}`);
  }

  /**
   * Get store by shop domain
   */
  async getStoreByShop(shop: string) {
    return await this.prisma.store.findFirst({
      where: {
        platform: 'shopify',
        platformStoreId: shop,
        status: 'active',
      },
    });
  }

  /**
   * Create a $20/month recurring subscription via Shopify Billing API
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
    this.logger.log('Shopify billing API response:', JSON.stringify(json, null, 2));
    const result = json.data?.appSubscriptionCreate;
     this.logger.log('Extracted result:', JSON.stringify(result, null, 2));
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
   * Save a confirmed Shopify subscription to the local database.
   * Cancels any previous active subscriptions for the store first.
   */
  async saveSubscriptionToDb(storeId: string, shopifySubscriptionId: string): Promise<void> {
    // Mark any existing active subscriptions as cancelled
    await this.prisma.subscription.updateMany({
      where: { storeId, status: { equals: 'active', mode: 'insensitive' } },
      data: { status: 'cancelled' },
    });

    // Create the new active subscription record
await this.prisma.subscription.create({
  data: {
    storeId,
    tier: 'pro',
    status: 'active',
    startDate: new Date(),
  },
});
    this.logger.log(`✅ Subscription saved to DB for store: ${storeId}`);
  }

  /**
   * Check if a store has an active subscription in the local database.
   */
  async hasActiveSubscription(storeId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findFirst({
      where: { storeId, status: { equals: 'active', mode: 'insensitive' } },
    });
    return !!sub;
  }

  /**
   * Get active subscriptions for a shop via Shopify Billing API
   */
  async getSubscriptionStatus(shop: string, accessToken: string): Promise<any[]> {
    const query = `
      query {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
            createdAt
            currentPeriodEnd
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
