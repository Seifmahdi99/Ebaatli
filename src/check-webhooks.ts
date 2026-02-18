import { PrismaClient } from '@prisma/client';

async function checkWebhooks() {
  const prisma = new PrismaClient();
  const store = await prisma.store.findFirst({
    where: { platformStoreId: '3m0rxv-wn.myshopify.com' }
  });

  if (!store) {
    console.log('❌ Store not found!');
    process.exit(1);
  }

  console.log(`✅ Store found: ${store.name}`);
  console.log(`   Token: ${store.accessToken.substring(0, 20)}...`);

  const response = await fetch(
    'https://3m0rxv-wn.myshopify.com/admin/api/2024-01/webhooks.json',
    {
      headers: {
        'X-Shopify-Access-Token': store.accessToken,
      }
    }
  );

  const data = await response.json() as any;
  
  console.log('\n📋 Registered webhooks:');
  if (data.webhooks?.length === 0) {
    console.log('❌ NO WEBHOOKS REGISTERED!');
  } else {
    data.webhooks?.forEach((w: any) => {
      console.log(`   ✅ ${w.topic} → ${w.address}`);
    });
  }

  await prisma.$disconnect();
}

checkWebhooks();
