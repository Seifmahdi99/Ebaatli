import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

interface EPushResponse {
  new_msg_id: string;
  transaction_price: number;
  net_balance: number;
}

interface SendSmsParams {
  to: string | string[];
  message: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly baseUrl = 'https://api.epusheg.com/api/v2';
  private readonly httpsAgent = new https.Agent({ rejectUnauthorized: false });

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private getGlobalConfig() {
    const username = this.config.get<string>('EPUSH_USERNAME');
    const password = this.config.get<string>('EPUSH_PASSWORD');
    const apiKey = this.config.get<string>('EPUSH_API_KEY');
    const senderId = this.config.get<string>('EPUSH_SENDER_ID') || 'E PUSH';

    if (!username || !password || !apiKey) {
      throw new Error('E-Push credentials not configured');
    }

    return { username, password, apiKey, senderId };
  }

  async sendSms(storeId: string, params: SendSmsParams): Promise<EPushResponse> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new Error('Store not found');
    }

    if (store.smsQuotaUsed >= store.smsQuotaAllocated) {
      throw new ForbiddenException(
        `SMS quota exceeded. Used: ${store.smsQuotaUsed}/${store.smsQuotaAllocated}`
      );
    }

    const config = this.getGlobalConfig();
    const to = Array.isArray(params.to)
      ? params.to.map(this.formatPhone).join(',')
      : this.formatPhone(params.to);

    const senderId = store.smsSenderId || config.senderId;

    // Build URL manually to handle special characters in sender ID
    const url = `${this.baseUrl}/send_bulk` +
      `?username=${encodeURIComponent(config.username)}` +
      `&password=${encodeURIComponent(config.password)}` +
      `&api_key=${encodeURIComponent(config.apiKey)}` +
      `&message=${encodeURIComponent(params.message)}` +
      `&from=${encodeURIComponent(senderId)}` +
      `&to=${encodeURIComponent(to)}`;

    this.logger.log(`Sending SMS to ${to} via E-Push (Store: ${store.name}, Sender: ${senderId})`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          timeout: 10000,
          httpsAgent: this.httpsAgent,
        })
      );

      const data = response.data;

      await this.incrementUsage(storeId);

      this.logger.log(
        `✅ SMS sent! MsgID: ${data.new_msg_id}, Balance: ${data.net_balance} EGP, Store: ${store.name} (${store.smsQuotaUsed + 1}/${store.smsQuotaAllocated})`
      );

      return {
        new_msg_id: data.new_msg_id,
        transaction_price: parseFloat(data.transaction_price),
        net_balance: parseFloat(data.net_balance),
      };
    } catch (error: any) {
      this.logger.error('❌ E-Push Error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  private formatPhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('20')) return cleaned;
    if (cleaned.startsWith('0')) return '20' + cleaned.substring(1);
    if (cleaned.startsWith('1')) return '20' + cleaned;
    return '20' + cleaned;
  }

  private async incrementUsage(storeId: string) {
    await this.prisma.store.update({
      where: { id: storeId },
      data: { smsQuotaUsed: { increment: 1 } },
    });
  }

  private handleError(error: any): Error {
    const message = error.response?.data || error.message;
    if (typeof message === 'string') {
      if (message.includes('Invalid user name or password')) return new Error('Invalid E-Push credentials');
      if (message.includes('Invalid API Key')) return new Error('Invalid API key');
      if (message.includes('Invalid Sender ID') || message.includes('invalid sender')) return new Error('Invalid sender ID');
      if (message.includes('not activated towards')) return new Error('Sender not activated');
      if (message.includes('permission to use API')) return new Error('No API permission');
      if (message.includes('Invalid IP Address')) return new Error('IP not whitelisted');
    }
    return new Error('SMS failed: ' + message);
  }

  async allocateQuota(storeId: string, quota: number) {
    await this.prisma.store.update({
      where: { id: storeId },
      data: {
        smsQuotaAllocated: quota,
        smsQuotaResetDate: new Date(),
      },
    });
  }

  async resetQuota(storeId: string) {
    await this.prisma.store.update({
      where: { id: storeId },
      data: {
        smsQuotaUsed: 0,
        smsQuotaResetDate: new Date(),
      },
    });
  }

  async getQuotaStatus(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        smsQuotaAllocated: true,
        smsQuotaUsed: true,
        smsQuotaResetDate: true,
      },
    });

    if (!store) {
      throw new Error('Store not found');
    }

    return {
      allocated: store.smsQuotaAllocated,
      used: store.smsQuotaUsed,
      remaining: store.smsQuotaAllocated - store.smsQuotaUsed,
      resetDate: store.smsQuotaResetDate,
    };
  }

  async setSenderId(storeId: string, senderId: string) {
    await this.prisma.store.update({
      where: { id: storeId },
      data: { smsSenderId: senderId },
    });
  }
}
