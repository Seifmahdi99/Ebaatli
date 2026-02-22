import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Generate Shopify OAuth URL
   * Merchant clicks this to install our app
   */
  generateAuthUrl(shop: string): string {
    const apiKey = this.config.get<string>('SHOPIFY_API_KEY');
    const scopes = this.config.get<string>('SHOPIFY_SCOPES');
    const redirectUri = this.config.get<string>('SHOPIFY_REDIRECT_URI');
    const nonce = crypto.randomBytes(16).toString('hex');

    const authUrl = `https://${shop}/admin/oauth/authorize` +
      `?client_id=${apiKey}` +
      `&scope=${scopes}` +
      `&redirect_uri=${redirectUri}` +
      `&state=${nonce}`;

    this.logger.log(`Generated auth URL for shop: ${shop}`);
    return authUrl;
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
   * Register webhooks with Shopify
   * So Shopify notifies us of events
   */
  async registerWebhooks(shop: string, accessToken: string) {
    const appUrl = this.config.get<string>('APP_URL');

    const webhooks = [
      {
        topic: 'orders/create',
        address: `${appUrl}/webhooks/shopify/orders/created`,
      },
      {
        topic: 'orders/updated',
        address: `${appUrl}/webhooks/shopify/orders/updated`,
      },
      {
        topic: 'orders/cancelled',
        address: `${appUrl}/webhooks/shopify/orders/cancelled`,
      },
      {
        topic: 'checkouts/create',
        address: `${appUrl}/webhooks/shopify/checkouts/created`,
      },
      {
        topic: 'app/uninstalled',
        address: `${appUrl}/webhooks/shopify/uninstalled`,
      },
    ];

    for (const webhook of webhooks) {
      try {
        const response = await fetch(
          `https://${shop}/admin/api/2024-01/webhooks.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ webhook }),
          }
        );

        const data = await response.json();
        this.logger.log(`✅ Webhook registered: ${webhook.topic}`);
      } catch (error) {
        this.logger.error(`❌ Failed to register webhook: ${webhook.topic}`, error);
      }
    }
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
    const secret = this.config.get<string>('SHOPIFY_WEBHOOK_SECRET');
    
    const hash = crypto
      .createHmac('sha256', secret!)
      .update(rawBody, 'utf8')
      .digest('base64');

    return hash === hmacHeader;
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
    const result = json.data?.appSubscriptionCreate;

    if (!result) {
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
      where: { storeId, status: 'active' },
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
      where: { storeId, status: 'active' },
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
}
