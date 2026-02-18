import { PrismaClient } from '@prisma/client';

async function seedTestStore() {
  const prisma = new PrismaClient();
  await prisma.$connect();

  console.log('🌱 Creating test store...');

  // Clean up first
  await prisma.store.deleteMany({
    where: { platformStoreId: 'test-store.myshopify.com' }
  });

  // Create test store
  const store = await prisma.store.create({
    data: {
      platform: 'shopify',
      platformStoreId: 'test-store.myshopify.com',
      name: 'Ahmed Electronics',
      timezone: 'Africa/Cairo',
      currency: 'EGP',
      accessToken: 'test-access-token',
      status: 'active',
      smsQuotaAllocated: 100,
      smsQuotaUsed: 0,
      smsSenderId: null,
    },
  });

  console.log(`✅ Test store created: ${store.id}`);
  console.log(`   Name: ${store.name}`);
  console.log(`   SMS Quota: ${store.smsQuotaUsed}/${store.smsQuotaAllocated}`);

  await prisma.$disconnect();
  console.log('\n✅ Done! Now send the webhook again.');
  console.log('Run this in another terminal:');
  console.log(`
curl -X POST http://localhost:3000/webhooks/shopify/orders/created \\
  -H "Content-Type: application/json" \\
  -H "x-shopify-shop-domain: test-store.myshopify.com" \\
  -H "x-shopify-hmac-sha256: test" \\
  -d '{"id":123456789,"order_number":1001,"total_price":"500.00","currency":"EGP","customer":{"id":999,"first_name":"Ahmed","last_name":"Mohamed","phone":"01027434904","email":"ahmed@test.com"},"financial_status":"paid","fulfillment_status":null}'
  `);
}

seedTestStore();
