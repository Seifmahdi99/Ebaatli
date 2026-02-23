import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

interface SendWhatsAppParams {
  to: string;
  message?: string;
  templateName?: string;
}

interface WhatsAppResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private getGlobalConfig() {
    const accessToken = this.config.get<string>('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');

    if (!accessToken || !phoneNumberId) {
      throw new Error('WhatsApp credentials not configured');
    }

    return { accessToken, phoneNumberId };
  }

  async sendMessage(storeId: string, params: SendWhatsAppParams): Promise<WhatsAppResponse> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new Error('Store not found');
    }

    if (!store.whatsappEnabled) {
      throw new Error('WhatsApp not enabled for this store');
    }

    if (store.whatsappQuotaUsed >= store.whatsappQuotaAllocated) {
      throw new ForbiddenException(
        `WhatsApp quota exceeded. Used: ${store.whatsappQuotaUsed}/${store.whatsappQuotaAllocated}`
      );
    }

    const config = this.getGlobalConfig();
    const to = this.formatPhone(params.to);

    const accessToken = store.whatsappAccessToken || config.accessToken;
    const phoneNumberId = store.whatsappPhoneNumberId || config.phoneNumberId;

    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    // Use template for test accounts - custom text requires production
    const payload = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'template',
      template: {
        name: 'hello_world',
        language: { code: 'en_US' },
      },
    };

    this.logger.log(`Sending WhatsApp to ${to} (Store: ${store.name}, Mode: template)`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        })
      );

      const data = response.data as WhatsAppResponse;

      await this.incrementUsage(storeId);

      this.logger.log(
        `✅ WhatsApp sent! MsgID: ${data.messages[0].id}, Store: ${store.name} (${store.whatsappQuotaUsed + 1}/${store.whatsappQuotaAllocated})`
      );

      return data;
    } catch (error: any) {
      this.logger.error('❌ WhatsApp Error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  async sendTemplate(storeId: string, params: SendWhatsAppParams): Promise<WhatsAppResponse> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store || !store.whatsappEnabled) {
      throw new Error('Store not found or WhatsApp not enabled');
    }

    if (store.whatsappQuotaUsed >= store.whatsappQuotaAllocated) {
      throw new ForbiddenException('WhatsApp quota exceeded');
    }

    const config = this.getGlobalConfig();
    const to = this.formatPhone(params.to);
    const accessToken = store.whatsappAccessToken || config.accessToken;
    const phoneNumberId = store.whatsappPhoneNumberId || config.phoneNumberId;

    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'template',
      template: {
        name: params.templateName || 'hello_world',
        language: {
          code: 'en_US',
        },
      },
    };

    this.logger.log(`Sending WhatsApp template to ${to}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        })
      );

      await this.incrementUsage(storeId);

      return response.data as WhatsAppResponse;
    } catch (error: any) {
      this.logger.error('❌ WhatsApp Template Error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  private formatPhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }
    
    if (cleaned.startsWith('20')) {
      return cleaned;
    }
    if (cleaned.startsWith('0')) {
      return '20' + cleaned.substring(1);
    }
    if (cleaned.startsWith('1')) {
      return '20' + cleaned;
    }
    
    return '20' + cleaned;
  }

  private async incrementUsage(storeId: string) {
    await this.prisma.store.update({
      where: { id: storeId },
      data: { whatsappQuotaUsed: { increment: 1 } },
    });
  }

  private handleError(error: any): Error {
    const message = error.response?.data?.error?.message || error.message;
    return new Error('WhatsApp failed: ' + message);
  }

  async getQuotaStatus(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        whatsappEnabled: true,
        whatsappQuotaAllocated: true,
        whatsappQuotaUsed: true,
        whatsappQuotaResetDate: true,
      },
    });

    if (!store) {
      throw new Error('Store not found');
    }

    return {
      enabled: store.whatsappEnabled,
      allocated: store.whatsappQuotaAllocated,
      used: store.whatsappQuotaUsed,
      remaining: store.whatsappQuotaAllocated - store.whatsappQuotaUsed,
      resetDate: store.whatsappQuotaResetDate,
    };
  }

  async enableWhatsApp(storeId: string, quota: number = 50) {
    await this.prisma.store.update({
      where: { id: storeId },
      data: {
        whatsappEnabled: true,
        whatsappQuotaAllocated: quota,
        whatsappQuotaUsed: 0,
        whatsappQuotaResetDate: new Date(),
      },
    });
  }
}
