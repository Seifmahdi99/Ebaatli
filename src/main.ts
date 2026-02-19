import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  app.enableCors();
  
  // Serve static files (admin panel)
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/',
  });

  await app.listen(3000);
  console.log('🚀 Platform running on port 3000');
  console.log('📡 Webhook endpoint: http://localhost:3000/webhooks/shopify/orders/created');
  console.log('🛍️  Shopify install: http://localhost:3000/shopify/install?shop=YOUR_SHOP.myshopify.com');
  console.log('📊 Admin panel: http://localhost:3000/admin/');
  console.log('🔑 Admin key: admin123');
}
bootstrap();
