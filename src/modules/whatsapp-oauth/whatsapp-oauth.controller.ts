import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { WhatsAppOAuthService } from './whatsapp-oauth.service';

@Controller('whatsapp')
export class WhatsAppOAuthController {
  private readonly logger = new Logger(WhatsAppOAuthController.name);

  constructor(private readonly oauthService: WhatsAppOAuthService) {}

  @Get('connect')
  async initiateOAuth(
    @Query('storeId') storeId: string,
    @Res() res: Response,
  ) {
    this.logger.log(`Initiating WhatsApp OAuth for store: ${storeId}`);
    const authUrl = this.oauthService.getAuthUrl(storeId);
    return res.redirect(authUrl);
  }

  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') storeId: string,
    @Res() res: Response,
  ) {
    this.logger.log(`WhatsApp OAuth callback for store: ${storeId}`);

    try {
      const credentials = await this.oauthService.handleCallback(code, storeId);
      this.logger.log(`✅ WhatsApp connected for store: ${storeId}`);
      return res.send(`
        <html>
          <body>
            <h1>✅ WhatsApp Connected Successfully!</h1>
            <p>Phone Number ID: ${credentials.phoneNumberId}</p>
            <p>You can close this window.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      this.logger.error(`❌ WhatsApp OAuth failed: ${error.message}`);
      return res.send(`
        <html>
          <body>
            <h1>❌ WhatsApp Connection Failed</h1>
            <p>Error: ${error.message}</p>
          </body>
        </html>
      `);
    }
  }

  @Get('status')
  async getStatus(@Query('storeId') storeId: string) {
    return await this.oauthService.getConnectionStatus(storeId);
  }

  @Get('disconnect')
  async disconnect(@Query('storeId') storeId: string) {
    await this.oauthService.disconnectWhatsApp(storeId);
    return { message: 'WhatsApp disconnected successfully' };
  }
}
