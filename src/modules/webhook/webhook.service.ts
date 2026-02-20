import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FlowService } from '../flow/flow.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly flowService: FlowService,
  ) { }

  async handleOrderCreated(shop: string, payload: any) {
    this.logger.log(`Processing order created for shop: ${shop}`);

    try {
      const store = await this.prisma.store.findFirst({
        where: { platform: 'shopify', platformStoreId: shop, status: 'active' },
      });

      if (!store) {
        this.logger.warn(`Store not found: ${shop}`);
        return;
      }

      const customerPhone = payload.customer?.phone ||
        payload.billing_address?.phone ||
        payload.shipping_address?.phone;

      const customerName = payload.customer?.first_name ||
        payload.billing_address?.first_name ||
        'Customer';

      const orderNumber = payload.order_number;
      const totalPrice = payload.total_price;
      const currency = payload.currency || store.currency;

      if (!customerPhone) {
        this.logger.warn(`No phone number for order #${orderNumber} in shop ${shop}`);
        return;
      }

      const customer = await this.upsertCustomer(store.id, payload);
      const order = await this.upsertOrder(store.id, customer.id, payload);

      await this.prisma.event.create({
        data: {
          storeId: store.id,
          orderId: order.id,
          type: 'order_created',
          referenceId: String(payload.id),
          payload: payload,
          status: 'processing',
        },
      });

      // Execute automation flows (flows handle all messaging)
      await this.flowService.executeTrigger({
        type: 'order_created',
        storeId: store.id,
        data: {
          customerId: customer.id,
          customer_name: customerName,
          order_number: String(orderNumber),
          total_amount: String(totalPrice),
          currency: currency,
          customerPhone: customerPhone,
        },
      });

      this.logger.log(`✅ Order #${orderNumber} processed, flows executed`);

    } catch (error: any) {
      this.logger.error(`❌ Error handling order created: ${error.message}`);
      throw error;
    }
  }

  async handleOrderUpdated(shop: string, payload: any) {
    this.logger.log(`Processing order updated for shop: ${shop}`);
  }

  async handleCheckoutCreated(shop: string, payload: any) {
    this.logger.log(`Processing checkout created for shop: ${shop}`);
  }

  async handleAppUninstalled(shop: string) {
    this.logger.log(`Processing app uninstall for shop: ${shop}`);
    await this.prisma.store.updateMany({
      where: { platformStoreId: shop },
      data: { status: 'uninstalled' },
    });
  }

  private async upsertCustomer(storeId: string, payload: any) {
    const customerData = payload.customer || {};
    const billingAddress = payload.billing_address || {};

    return await this.prisma.customer.upsert({
      where: {
        storeId_platformCustomerId: {
          storeId,
          platformCustomerId: String(customerData.id || payload.id),
        },
      },
      create: {
        storeId,
        platformCustomerId: String(customerData.id || payload.id),
        firstName: customerData.first_name || billingAddress.first_name,
        lastName: customerData.last_name || billingAddress.last_name,
        email: customerData.email || payload.email,
        phone: customerData.phone || billingAddress.phone,
        acceptsMarketing: customerData.accepts_marketing || false,
      },
      update: {
        firstName: customerData.first_name || billingAddress.first_name,
        lastName: customerData.last_name || billingAddress.last_name,
        email: customerData.email || payload.email,
        phone: customerData.phone || billingAddress.phone,
      },
    });
  }

  private async upsertOrder(storeId: string, customerId: string, payload: any) {
    return await this.prisma.order.upsert({
      where: {
        storeId_platformOrderId: {
          storeId,
          platformOrderId: String(payload.id),
        },
      },
      create: {
        storeId,
        customerId,
        platformOrderId: String(payload.id),
        orderNumber: String(payload.order_number),
        status: payload.financial_status || 'pending',
        fulfillmentStatus: payload.fulfillment_status,
        financialStatus: payload.financial_status,
        totalAmount: parseFloat(payload.total_price || '0'),
        currency: payload.currency || 'USD',
        rawPayload: payload,
      },
      update: {
        status: payload.financial_status || 'pending',
        fulfillmentStatus: payload.fulfillment_status,
        financialStatus: payload.financial_status,
        totalAmount: parseFloat(payload.total_price || '0'),
        rawPayload: payload,
      },
    });
  }
}
