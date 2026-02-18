import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

interface TwilioResponse {
  sid: string;
  status: string;
  price: string;
}

interface SendSmsParams {
  to: string | string[];
  message: string;
}

@Injectable()
export class TwilioSmsService {
  private readonly logger = new Logger(TwilioSmsService.name);
  private readonly baseUrl = 'https://api.twilio.com/2010-04-01';

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private getConfig() {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    const fromNumber = this.config.get<string>('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio credentials not configured');
    }

    return { accountSid, authToken, fromNumber };
  }

  async sendSms(storeId: string, params: SendSmsParams): Promise<TwilioResponse> {
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

    const config = this.getConfig();
    const to = Array.isArray(params.to) ? params.to[0] : params.to;
    const formattedTo = this.formatPhone(to);
    
    const url = `${this.baseUrl}/Accounts/${config.accountSid}/Messages.json`;
    
    const body = new URLSearchParams({
      To: formattedTo,
      From: config.fromNumber,
      Body: params.message,
    });

    this.logger.log(`Sending SMS to ${formattedTo} via Twilio (Store: ${store.name})`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, body.toString(), {
          auth: {
            username: config.accountSid,
            password: config.authToken,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );
      
      const data = response.data;

      await this.prisma.store.update({
        where: { id: storeId },
        data: { smsQuotaUsed: { increment: 1 } }
      });

      this.logger.log(
        `✅ SMS sent via Twilio! SID: ${data.sid}, Status: ${data.status}`
      );
      
      return {
        sid: data.sid,
        status: data.status,
        price: data.price || '0',
      };
    } catch (error: any) {
      this.logger.error('❌ Twilio Error:', error.response?.data || error.message);
      throw new Error('SMS failed: ' + (error.response?.data?.message || error.message));
    }
  }

  private formatPhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('20')) return '+' + cleaned;
    if (cleaned.startsWith('0')) return '+20' + cleaned.substring(1);
    if (cleaned.startsWith('1')) return '+20' + cleaned;
    return '+20' + cleaned;
  }

  async getQuotaStatus(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        smsQuotaAllocated: true,
        smsQuotaUsed: true,
        smsQuotaResetDate: true,
      }
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
}
