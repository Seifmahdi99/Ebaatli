import { PrismaClient } from '@prisma/client';

async function fixWebhooks() {
  const prisma = new PrismaClient();
  const store = await prisma.store.findFirst({
    where: { platformStoreId: '3m0rxv-wn.myshopify.com' }
  });

  if (!store) {
    console.log('❌ Store not found!');
    process.exit(1);
  }

  console.log(`✅ Store found: ${store.name}`);

  const appUrl = 'https://woundless-unrenewable-stan.ngrok-free.dev';
  const webhooks = [
    { topic: 'orders/create', address: `${appUrl}/webhooks/shopify/orders/created` },
    { topic: 'orders/updated', address: `${appUrl}/webhooks/shopify/orders/updated` },
    { topic: 'checkouts/create', address: `${appUrl}/webhooks/shopify/checkouts/created` },
  ];

  for (const webhook of webhooks) {
    const response = await fetch(
      'https://3m0rxv-wn.myshopify.com/admin/api/2024-01/webhooks.json',
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': store.accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ webhook }),
      }
    );

    const data = await response.json() as any;
    if (data.webhook) {
      console.log(`✅ Registered: ${webhook.topic} → ${webhook.address}`);
    } else {
      console.log(`❌ Failed: ${webhook.topic}`, JSON.stringify(data.errors));
    }
  }

  await prisma.$disconnect();
  console.log('\n🎉 Done! Now create a new order and watch the SMS!');
}

fixWebhooks();
