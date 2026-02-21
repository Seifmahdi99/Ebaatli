import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MerchantService {
    constructor(private readonly prisma: PrismaService) { }

    async getStore(storeId: string) {
        const store = await this.prisma.store.findUnique({
            where: { id: storeId },
            include: {
                _count: {
                    select: {
                        customers: true,
                        orders: true,
                        messageJobs: true,
                    },
                },
                subscriptions: true,
            },
        });

        if (!store) throw new NotFoundException('Store not found');

        return {
            id: store.id,
            name: store.name,
            platform: store.platform,
            status: store.status,
            smsQuotaAllocated: store.smsQuotaAllocated,
            smsQuotaUsed: store.smsQuotaUsed,
            whatsappQuotaAllocated: store.whatsappQuotaAllocated,
            whatsappQuotaUsed: store.whatsappQuotaUsed,
            whatsappEnabled: store.whatsappEnabled,
            whatsappPhoneNumberId: store.whatsappPhoneNumberId,
            whatsappBusinessAccountId: store.whatsappBusinessAccountId,
            counts: store._count,
            subscription: store.subscriptions[0] || null,
        };
    }

    async getUsage(storeId: string) {
        const store = await this.prisma.store.findUnique({
            where: { id: storeId },
            select: {
                smsQuotaAllocated: true,
                smsQuotaUsed: true,
                whatsappQuotaAllocated: true,
                whatsappQuotaUsed: true,
            },
        });

        if (!store) throw new NotFoundException('Store not found');

        return store;
    }

    async getMessages(storeId: string) {
        return this.prisma.messageJob.findMany({
            where: { storeId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }

    async getCustomers(storeId: string) {
        return this.prisma.customer.findMany({
            where: { storeId },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }

    async getOrders(storeId: string) {
        return this.prisma.order.findMany({
            where: { storeId },
            include: { customer: true },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }

    async getStoreByShop(shop: string) {
        const store = await this.prisma.store.findFirst({
            where: { platformStoreId: shop, status: 'active' },
            include: {
                _count: {
                    select: {
                        customers: true,
                        orders: true,
                        messageJobs: true,
                    },
                },
            },
        });

        if (!store) throw new NotFoundException('Store not found');

        return {
            storeId: store.id,
            name: store.name,
            platform: store.platform,
            platformStoreId: store.platformStoreId,
            status: store.status,
            smsQuotaAllocated: store.smsQuotaAllocated,
            smsQuotaUsed: store.smsQuotaUsed,
            whatsappQuotaAllocated: store.whatsappQuotaAllocated,
            whatsappQuotaUsed: store.whatsappQuotaUsed,
            whatsappEnabled: store.whatsappEnabled,
            counts: store._count,
        };
    }

    async getWhatsAppStatus(storeId: string) {
        const connection = await this.prisma.whatsAppConnection.findUnique({
            where: { storeId },
        });

        return {
            connected: !!connection,
            connection,
        };
    }
}