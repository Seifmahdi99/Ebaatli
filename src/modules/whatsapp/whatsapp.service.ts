import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

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
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
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

    const to = this.formatPhone(params.to);

    // Use store credentials first, fall back to global
    let accessToken = store.whatsappAccessToken;
    let phoneNumberId = store.whatsappPhoneNumberId;

    if (!accessToken || !phoneNumberId) {
      const config = this.getGlobalConfig();
      accessToken = accessToken || config.accessToken;
      phoneNumberId = phoneNumberId || config.phoneNumberId;
    }

    if (!accessToken || !phoneNumberId) {
      throw new Error('WhatsApp credentials not configured for this store');
    }

    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    // Use template for test accounts - custom text requires production
    const payload = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { body: params.message },
    };

    this.logger.log(`Sending WhatsApp message to ${to}`);

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

    const to = this.formatPhone(params.to);

    // Use store credentials first, fall back to global
    let accessToken = store.whatsappAccessToken;
    let phoneNumberId = store.whatsappPhoneNumberId;

    if (!accessToken || !phoneNumberId) {
      const config = this.getGlobalConfig();
      accessToken = accessToken || config.accessToken;
      phoneNumberId = phoneNumberId || config.phoneNumberId;
    }

    if (!accessToken || !phoneNumberId) {
      throw new Error('WhatsApp credentials not configured for this store');
    }

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
    return phone.replace(/\D/g, '');
  }

  private async incrementUsage(storeId: string): Promise<void> {
    await this.prisma.store.update({
      where: { id: storeId },
      data: { whatsappQuotaUsed: { increment: 1 } },
    });
  }

  private handleError(error: any): Error {
    const message = error.response?.data?.error?.message || error.message || 'WhatsApp API error';
    return new Error(message);
  }
}
