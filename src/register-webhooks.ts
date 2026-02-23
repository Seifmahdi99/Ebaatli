import { PrismaClient } from '@prisma/client';

async function registerWebhooks() {
  const prisma = new PrismaClient();
  
  // Get the store access token
  const store = await prisma.store.findFirst({
    where: { platformStoreId: '3m0rxv-wn.myshopify.com' }
  });

  if (!store) {
    console.log('❌ Store not found! Run the OAuth flow first.');
    process.exit(1);
  }

  console.log(`✅ Found store: ${store.name}`);
  console.log(`   Access Token: ${store.accessToken.substring(0, 10)}...`);

  const appUrl = 'https://ebaatli.com';
  const webhooks = [
    { topic: 'orders/create', address: `${appUrl}/webhooks/shopify/orders/created` },
    { topic: 'orders/updated', address: `${appUrl}/webhooks/shopify/orders/updated` },
    { topic: 'app/uninstalled', address: `${appUrl}/webhooks/shopify/uninstalled` },
  ];

  for (const webhook of webhooks) {
    const response = await fetch(
      `https://3m0rxv-wn.myshopify.com/admin/api/2024-01/webhooks.json`,
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
      console.log(`✅ Webhook registered: ${webhook.topic} → ${webhook.address}`);
    } else {
      console.log(`❌ Failed: ${webhook.topic}`, JSON.stringify(data));
    }
  }

  await prisma.$disconnect();
  console.log('\n🎉 Webhooks registered! Create a new order to test!');
}

registerWebhooks();
