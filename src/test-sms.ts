import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SmsService } from './modules/sms/sms.service';
import { PrismaClient } from '@prisma/client';

async function testSms() {
  console.log('🚀 Starting SMS Test (Managed Model)...\n');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const smsService = app.get(SmsService);
  
  const prisma = new PrismaClient();
  await prisma.$connect();
  console.log('✅ Database connected\n');

  try {
    console.log('🧹 Cleaning up old test data...');
    await prisma.store.deleteMany({
      where: { platformStoreId: 'test-store.myshopify.com' }
    });
    console.log('✅ Cleanup complete\n');

    console.log('📦 Creating test store...');
    const testStore = await prisma.store.create({
      data: {
        platform: 'shopify',
        platformStoreId: 'test-store.myshopify.com',
        name: 'Test Store',
        timezone: 'Africa/Cairo',
        currency: 'EGP',
        accessToken: 'test-token',
        status: 'active',
        smsQuotaAllocated: 100,
        smsQuotaUsed: 0,
        smsSenderId: null,
      },
    });
    console.log(`✅ Test store created: ${testStore.id}\n`);

    console.log('📱 Sending SMS to client numbers...\n');
    const result = await smsService.sendSms(testStore.id, {
      to: ['201070024500', '201223046062'],
      message: 'Your Shopify automation platform is LIVE! 🚀 Orders will now automatically trigger WhatsApp & SMS messages to your customers. Powered by our platform 💪',
    });

    console.log('✅ SMS SENT SUCCESSFULLY TO CLIENT!');
    console.log(`   Message ID: ${result.new_msg_id}`);
    console.log(`   Cost: ${result.transaction_price} EGP`);
    console.log(`   Platform Balance: ${result.net_balance} EGP\n`);

    console.log('🎉 CLIENT IS HYPED! 🎉\n');

    console.log('🧹 Cleaning up test data...');
    await prisma.store.delete({ where: { id: testStore.id } });
    console.log('✅ Cleanup complete\n');

  } catch (error: any) {
    console.error('❌ TEST FAILED:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await app.close();
  }
}

testSms();
