import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WhatsAppOAuthService {
  private readonly logger = new Logger(WhatsAppOAuthService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  getAuthUrl(storeId: string): string {
    const appId = this.config.get<string>('META_APP_ID') || '';
    const redirectUri = this.config.get<string>('META_REDIRECT_URI') || '';
    
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state: storeId,
      response_type: 'code',
      scope: 'whatsapp_business_messaging,whatsapp_business_management',
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

async handleCallback(code: string, storeId: string) {
  // Use the System User token instead of exchanging the code
  const systemToken = this.config.get<string>('WHATSAPP_SYSTEM_USER_TOKEN') || '';
  
  if (!systemToken) {
    throw new Error('System User token not configured');
  }

  const wabaDetails = await this.getWABADetails(systemToken);
  
  await this.prisma.store.update({
    where: { id: storeId },
    data: {
      whatsappAccessToken: systemToken,
      whatsappPhoneNumberId: wabaDetails.phoneNumberId,
      whatsappBusinessAccountId: wabaDetails.businessAccountId,
      whatsappEnabled: true,
      whatsappQuotaAllocated: 1000,
    },
  });

  return {
    success: true,
    phoneNumberId: wabaDetails.phoneNumberId,
    businessAccountId: wabaDetails.businessAccountId,
  };
}




  private async exchangeCodeForToken(code: string) {
    const appId = this.config.get<string>('META_APP_ID') || '';
    const appSecret = this.config.get<string>('META_APP_SECRET') || '';
    const redirectUri = this.config.get<string>('META_REDIRECT_URI') || '';

    const url = 'https://graph.facebook.com/v18.0/oauth/access_token';
    
    const params = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      code: code,
      redirect_uri: redirectUri,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${url}?${params.toString()}`)
      );
      return response.data;
    } catch (error: any) {
      this.logger.error('Token exchange failed:', error.response?.data);
      throw new Error('Failed to exchange code for token');
    }
  }

private async getWABADetails(accessToken: string) {
  try {
    // Hardcoded WABA ID - System User doesn't have business_management to discover it
    const wabaId = '2143319519832175';
    
    const phoneResponse = await firstValueFrom(
      this.httpService.get(
        `https://graph.facebook.com/v18.0/${wabaId}/phone_numbers`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )
    );

    this.logger.log('✅ Phone Response:', JSON.stringify(phoneResponse.data, null, 2));

    const phones = phoneResponse.data.data || [];
    
    if (phones.length === 0) {
      throw new Error('No phone number found in WhatsApp Business Account');
    }

    return {
      businessAccountId: wabaId,
      phoneNumberId: phones[0].id,
      phoneNumber: phones[0].display_phone_number,
    };
  } catch (error: any) {
    this.logger.error('WABA details error:', error.response?.data || error.message);
    throw new Error('Failed to get WhatsApp Business Account details');
  }
}



  async getConnectionStatus(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        whatsappEnabled: true,
        whatsappPhoneNumberId: true,
        whatsappBusinessAccountId: true,
      },
    });

    return {
      connected: store?.whatsappEnabled || false,
      phoneNumberId: store?.whatsappPhoneNumberId,
      businessAccountId: store?.whatsappBusinessAccountId,
    };
  }

  async disconnectWhatsApp(storeId: string) {
    await this.prisma.store.update({
      where: { id: storeId },
      data: {
        whatsappEnabled: false,
        whatsappAccessToken: null,
        whatsappPhoneNumberId: null,
        whatsappBusinessAccountId: null,
      },
    });
  }
}
