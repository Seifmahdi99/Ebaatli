import { Controller, Get, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

@Controller()
export class AppController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  root(@Res() res: Response) {
    res.sendFile(join(process.cwd(), 'public', 'index.html'));
  }

  /**
   * Serve the Shopify embedded app at both the legacy path Shopify Partner
   * Dashboard has registered (/app, /app/index.html) and the canonical new
   * path (/shopify/embedded-app).  All three must return the same HTML with
   * the real API key injected — the __SHOPIFY_API_KEY__ placeholder in the
   * static template is replaced here so App Bridge initialises correctly and
   * can decode the `host` parameter to reach admin.shopify.com via postMessage.
   */
  @Get('app')
  @Get('app/index.html')
  shopifyEmbedded(@Res() res: Response) {
    const apiKey = this.config.get<string>('SHOPIFY_API_KEY') || '';
    const templatePath = join(process.cwd(), 'public', 'shopify', '_app-template.html');
    const html = readFileSync(templatePath, 'utf8').replace('__SHOPIFY_API_KEY__', apiKey);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}
