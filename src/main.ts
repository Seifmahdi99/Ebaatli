import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication, ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

async function bootstrap() {
  const server = express();

  // Capture raw body for Shopify webhook HMAC verification (must be before NestJS body parser)
  server.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  server.use(express.urlencoded({ extended: true }));

  // CSP middleware for Shopify iframe embedding
  server.use((_req: any, res: any, next: any) => {
    res.setHeader(
      'Content-Security-Policy',
      `frame-ancestors https://*.myshopify.com https://admin.shopify.com https://partners.shopify.com;`,
    );
    res.removeHeader('X-Frame-Options');
    next();
  });

  // Redirect /app/ to OAuth if store not installed
  server.get('/app/', async (req: any, res: any, next: any) => {
    const shop = req.query.shop;
    if (!shop) {
      return next(); // Let static files handle it
    }
    
    try {
      // Check if store exists in database
      const checkUrl = `http://localhost:${process.env.PORT || 3000}/merchant/by-shop?shop=${encodeURIComponent(shop)}`;
      const response = await fetch(checkUrl);
      
      if (response.status === 404) {
        // Store not found - redirect to install
        return res.redirect(`/shopify/install?shop=${encodeURIComponent(shop)}`);
      }
    } catch (e) {
      // If check fails, continue to app (it will handle the error)
    }
    
    next();
  });

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
    { bodyParser: false }, // We handle body parsing above with raw body capture
  );

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
