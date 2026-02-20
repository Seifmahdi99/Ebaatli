import { PrismaService } from '../prisma/prisma.service';
import { Controller, Get, Post, Patch, Param, Body, UnauthorizedException, BadRequestException } from '@nestjs/common';
@Controller('admin')
export class AdminController {
@Post('auth/verify')
async verifyAdminKey(@Body() body: { key: string }) {
  // Simple hardcoded key for now - you can improve this later
  const validKey = process.env.ADMIN_API_KEY || 'admin-secret-key-12345';
  
  if (body.key === validKey) {
    return { valid: true };
  }
  
  throw new UnauthorizedException('Invalid admin key');
}




  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all stores with quota info
   */
  @Get('stores')
  async listStores() {
    const stores = await this.prisma.store.findMany({
      select: {
        id: true,
        name: true,
        platformStoreId: true,
        platform: true,
        smsQuotaAllocated: true,
        smsQuotaUsed: true,
        whatsappQuotaAllocated: true,
        whatsappQuotaUsed: true,
        whatsappEnabled: true,
        status: true,
        installedAt: true,
      },
      orderBy: { installedAt: 'desc' },
    });

    return stores.map(store => ({
      ...store,
      smsRemaining: store.smsQuotaAllocated - store.smsQuotaUsed,
      whatsappRemaining: store.whatsappQuotaAllocated - store.whatsappQuotaUsed,
      smsPercentUsed: store.smsQuotaAllocated > 0 
        ? Math.round((store.smsQuotaUsed / store.smsQuotaAllocated) * 100) 
        : 0,
      whatsappPercentUsed: store.whatsappQuotaAllocated > 0
        ? Math.round((store.whatsappQuotaUsed / store.whatsappQuotaAllocated) * 100)
        : 0,
    }));
  }

  /**
   * Get single store details
   */
  @Get('store/:storeId')
  async getStore(@Param('storeId') storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: {
        _count: {
          select: {
            customers: true,
            orders: true,
            messageJobs: true,
          },
        },
      },
    });

    return store;
  }

  /**
   * Set SMS quota for a store
   */
  @Post('store/:storeId/sms-quota')
  async setSmsQuota(
    @Param('storeId') storeId: string,
    @Body() body: { quota: number }
  ) {
    const store = await this.prisma.store.update({
      where: { id: storeId },
      data: {
        smsQuotaAllocated: body.quota,
        smsQuotaResetDate: new Date(),
      },
    });

    return {
      message: `SMS quota set to ${body.quota} for ${store.name}`,
      store: {
        id: store.id,
        name: store.name,
        smsQuotaAllocated: store.smsQuotaAllocated,
        smsQuotaUsed: store.smsQuotaUsed,
      },
    };
  }

  /**
   * Set WhatsApp quota for a store
   */
  @Post('store/:storeId/whatsapp-quota')
  async setWhatsAppQuota(
    @Param('storeId') storeId: string,
    @Body() body: { quota: number }
  ) {
    const store = await this.prisma.store.update({
      where: { id: storeId },
      data: {
        whatsappQuotaAllocated: body.quota,
        whatsappQuotaResetDate: new Date(),
      },
    });

    return {
      message: `WhatsApp quota set to ${body.quota} for ${store.name}`,
      store: {
        id: store.id,
        name: store.name,
        whatsappQuotaAllocated: store.whatsappQuotaAllocated,
        whatsappQuotaUsed: store.whatsappQuotaUsed,
      },
    };
  }

  /**
   * Set WhatsApp credentials for a store
   */
  @Patch('store/:storeId/whatsapp-credentials')
  async updateWhatsAppCredentials(
    @Param('storeId') storeId: string,
    @Body() body: any,
  ) {
    const { whatsappAccessToken, whatsappPhoneNumberId, whatsappBusinessAccountId } = body;

    if (whatsappAccessToken && !whatsappAccessToken.startsWith('EAA')) {
      throw new BadRequestException('Invalid access token format. Token should start with "EAA"');
    }

    if (whatsappPhoneNumberId && !/^\d+$/.test(whatsappPhoneNumberId)) {
      throw new BadRequestException('Invalid Phone Number ID. Should contain only numbers');
    }

    if (whatsappBusinessAccountId && !/^\d+$/.test(whatsappBusinessAccountId)) {
      throw new BadRequestException('Invalid Business Account ID. Should contain only numbers');
    }

    if (whatsappAccessToken && whatsappPhoneNumberId) {
      try {
        const testResponse = await fetch(
          `https://graph.facebook.com/v18.0/${whatsappPhoneNumberId}?access_token=${whatsappAccessToken}`
        );

        if (!testResponse.ok) {
          const errorData = await testResponse.json() as { error?: { message?: string } };
          throw new BadRequestException(
            `WhatsApp API validation failed: ${errorData.error?.message || 'Invalid credentials'}`
          );
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException('Failed to validate WhatsApp credentials with Meta API');
      }
    }

    const updatedStore = await this.prisma.store.update({
      where: { id: storeId },
      data: {
        whatsappAccessToken,
        whatsappPhoneNumberId,
        whatsappBusinessAccountId,
        whatsappEnabled: body.whatsappEnabled ?? true,
      },
    });

    return {
      success: true,
      message: 'WhatsApp credentials validated and saved successfully',
      store: updatedStore,
    };
  }

  /**
   * Enable/disable WhatsApp for a store
   */
  @Patch('store/:storeId/whatsapp')
  async toggleWhatsApp(
    @Param('storeId') storeId: string,
    @Body() body: { enabled: boolean }
  ) {
    const store = await this.prisma.store.update({
      where: { id: storeId },
      data: { whatsappEnabled: body.enabled },
    });

    return {
      message: `WhatsApp ${body.enabled ? 'enabled' : 'disabled'} for ${store.name}`,
      whatsappEnabled: store.whatsappEnabled,
    };
  }

  /**
   * Reset quotas (for monthly reset)
   */
  @Post('store/:storeId/reset-quotas')
  async resetQuotas(@Param('storeId') storeId: string) {
    const store = await this.prisma.store.update({
      where: { id: storeId },
      data: {
        smsQuotaUsed: 0,
        whatsappQuotaUsed: 0,
        smsQuotaResetDate: new Date(),
        whatsappQuotaResetDate: new Date(),
      },
    });

    return {
      message: `Quotas reset for ${store.name}`,
      store: {
        id: store.id,
        name: store.name,
        smsQuotaUsed: store.smsQuotaUsed,
        whatsappQuotaUsed: store.whatsappQuotaUsed,
      },
    };
  }

@Get('store/:storeId/customers')
async getCustomers(@Param('storeId') storeId: string) {
  const customers = await this.prisma.customer.findMany({
    where: { storeId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return customers;
}

@Get('store/:storeId/orders')
async getOrders(@Param('storeId') storeId: string) {
  const orders = await this.prisma.order.findMany({
    where: { storeId },
    include: {
      customer: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return orders;
}

@Get('store/:storeId/messages')
async getMessages(@Param('storeId') storeId: string) {
  const messages = await this.prisma.messageJob.findMany({
    where: { storeId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return messages;
}

  /**
   * Get platform stats
   */
  @Get('stats')
  async getPlatformStats() {
    const stores = await this.prisma.store.findMany();
    const totalMessages = await this.prisma.message.count();
    const totalOrders = await this.prisma.order.count();

    const totalSmsAllocated = stores.reduce((sum, s) => sum + s.smsQuotaAllocated, 0);
    const totalSmsUsed = stores.reduce((sum, s) => sum + s.smsQuotaUsed, 0);
    const totalWhatsappAllocated = stores.reduce((sum, s) => sum + s.whatsappQuotaAllocated, 0);
    const totalWhatsappUsed = stores.reduce((sum, s) => sum + s.whatsappQuotaUsed, 0);

    return {
      totalStores: stores.length,
      activeStores: stores.filter(s => s.status === 'active').length,
      totalMessages,
      totalOrders,
      sms: {
        allocated: totalSmsAllocated,
        used: totalSmsUsed,
        remaining: totalSmsAllocated - totalSmsUsed,
      },
      whatsapp: {
        allocated: totalWhatsappAllocated,
        used: totalWhatsappUsed,
        remaining: totalWhatsappAllocated - totalWhatsappUsed,
      },
    };
  }
}
