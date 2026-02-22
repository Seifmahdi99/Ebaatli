import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Allow Shopify Admin to embed this app in an iframe
  // This must be before static assets
  app.use((req: any, res: any, next: any) => {
    const shop = req.query.shop || req.headers['x-shopify-shop-domain'] || '';
    
    // Set CSP header to allow Shopify iframe embedding
    res.setHeader(
      'Content-Security-Policy',
      `frame-ancestors https://*.myshopify.com https://admin.shopify.com https://partners.shopify.com;`
    );
    
    // Remove X-Frame-Options if set (it conflicts with CSP frame-ancestors)
    res.removeHeader('X-Frame-Options');
    
    next();
  });

  // Serve static files (admin panel)
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Platform running on port ${port}`);
  console.log('📡 Webhook endpoint: https://ebaatli.com/webhooks/shopify/orders/created');
  console.log('🛍️  Shopify install: https://ebaatli.com/shopify/install?shop=YOUR_SHOP.myshopify.com');
  console.log('📊 Admin panel: https://ebaatli.com/admin/');
}

bootstrap();
