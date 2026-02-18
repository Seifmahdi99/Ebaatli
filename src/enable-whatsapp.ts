import { PrismaClient } from '@prisma/client';

async function enableWhatsApp() {
  const prisma = new PrismaClient();
  await prisma.$connect();

  const store = await prisma.store.updateMany({
    where: {
      platformStoreId: '3m0rxv-wn.myshopify.com',
    },
    data: {
      whatsappEnabled: true,
      whatsappQuotaAllocated: 100,
      whatsappQuotaUsed: 0,
      whatsappQuotaResetDate: new Date(),
    },
  });

  const updated = await prisma.store.findFirst({
    where: { platformStoreId: '3m0rxv-wn.myshopify.com' }
  });

  console.log('✅ WhatsApp enabled for store:', updated?.name);
  console.log(`   SMS Quota: ${updated?.smsQuotaUsed}/${updated?.smsQuotaAllocated}`);
  console.log(`   WhatsApp Quota: ${updated?.whatsappQuotaUsed}/${updated?.whatsappQuotaAllocated}`);

  await prisma.$disconnect();
}

enableWhatsApp();
