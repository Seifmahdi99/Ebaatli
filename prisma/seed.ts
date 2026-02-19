import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create Store
    const store = await prisma.store.create({
        data: {
            platform: 'shopify',
            platformStoreId: 'dummy-shop.myshopify.com',
            name: 'Demo Store',
            accessToken: 'dummy-access-token',
            status: 'active',

            smsQuotaAllocated: 100,
            smsQuotaUsed: 25,

            whatsappEnabled: true,
            whatsappAccessToken: 'dummy-wa-token',
            whatsappPhoneNumberId: '123456789',
            whatsappBusinessAccountId: '987654321',
            whatsappQuotaAllocated: 200,
            whatsappQuotaUsed: 50,
        },
    });

    console.log('✅ Store created:', store.id);

    // Create Customers
    const customer = await prisma.customer.create({
        data: {
            storeId: store.id,
            platformCustomerId: 'cust-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '+201234567890',
        },
    });

    console.log('✅ Customer created');

    // Create Order
    const order = await prisma.order.create({
        data: {
            storeId: store.id,
            customerId: customer.id,
            platformOrderId: 'order-1',
            orderNumber: '1001',
            status: 'paid',
            totalAmount: 250,
            currency: 'EGP',
            rawPayload: {},
        },
    });

    console.log('✅ Order created');

    // Create Message Job
    await prisma.messageJob.create({
        data: {
            storeId: store.id,
            orderId: order.id,
            customerId: customer.id,
            channel: 'sms',
            scheduledAt: new Date(),
            status: 'sent',
        },
    });

    console.log('✅ Message job created');

    console.log('🎉 Seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });