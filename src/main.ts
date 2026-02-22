import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication, ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';

async function bootstrap() {
  // Create a raw Express instance and register the CSP middleware FIRST,
  // before NestJS initialises ServeStaticModule (which uses onModuleInit and
  // therefore registers express.static() during NestFactory.create()).
  // If we add app.use() after create() the static-file handler has already
  // been pushed onto the middleware stack and will send the response before
  // the CSP middleware ever runs — breaking Shopify's iframe embedding.
  const server = express();

  server.use((_req: any, res: any, next: any) => {
    res.setHeader(
      'Content-Security-Policy',
      `frame-ancestors https://*.myshopify.com https://admin.shopify.com https://partners.shopify.com;`,
    );
    res.removeHeader('X-Frame-Options');
    next();
  });

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
  );

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Platform running on port ${port}`);
  console.log('📡 Webhook endpoint: https://ebaatli.com/webhooks/shopify/orders/created');
  console.log('🛍️  Shopify install: https://ebaatli.com/shopify/install?shop=YOUR_SHOP.myshopify.com');
  console.log('📊 Admin panel: https://ebaatli.com/admin/');
}

bootstrap();
