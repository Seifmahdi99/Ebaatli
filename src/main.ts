import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Required for webhook signature verification
  });

  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Platform running on port ${port}`);
  console.log(`📡 Webhook endpoint: http://localhost:${port}/webhooks/shopify/orders/created`);
  console.log(`🛍️  Shopify install: http://localhost:${port}/shopify/install?shop=YOUR_SHOP.myshopify.com`);
}

bootstrap();
