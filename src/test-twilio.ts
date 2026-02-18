import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TwilioSmsService } from './modules/sms/twilio.service';
import { PrismaClient } from '@prisma/client';

async function testTwilio() {
  console.log('🚀 Starting Twilio SMS Test...\n');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const smsService = app.get(TwilioSmsService);
  
  const prisma = new PrismaClient();
  await prisma.$connect();
  console.log('✅ Database connected\n');

  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.error('❌ ERROR: Twilio credentials missing in .env');
      console.error('Please add:');
      console.error('  TWILIO_ACCOUNT_SID=ACxxxxx');
      console.error('  TWILIO_AUTH_TOKEN=your_token');
      console.error('  TWILIO_PHONE_NUMBER=+1234567890');
      process.exit(1);
    }

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
        smsSenderId: 'TestShop',
      },
    });
    console.log(`✅ Test store created: ${testStore.id}\n`);

    console.log('📱 Sending SMS via Twilio to 01027434904 (Seif)...\n');
    const result = await smsService.sendSms(testStore.id, {
      to: '01027434904',
      message: 'Hello Seif! 🎉 Your Shopify Automation Platform works! This SMS was sent via Twilio FREE trial credits!',
    });

    console.log('✅ SMS SENT SUCCESSFULLY VIA TWILIO!');
    console.log(`   Message SID: ${result.sid}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Price: ${result.price} (FREE trial credits!)\n`);

    console.log('💰 Checking quota status...');
    const quota = await smsService.getQuotaStatus(testStore.id);
    console.log(`✅ Store Quota:`);
    console.log(`   Allocated: ${quota.allocated}`);
    console.log(`   Used: ${quota.used}`);
    console.log(`   Remaining: ${quota.remaining}\n`);

    console.log('🎉 ALL TESTS PASSED!\n');
    console.log('📱 CHECK YOUR PHONE NOW! You should receive the SMS!\n');

    console.log('🧹 Cleaning up test data...');
    await prisma.store.delete({ where: { id: testStore.id } });
    console.log('✅ Cleanup complete\n');

  } catch (error: any) {
    console.error('❌ TEST FAILED:', error.message);
    if (error.response?.data) {
      console.error('Twilio Error Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await app.close();
  }
}

testTwilio();
