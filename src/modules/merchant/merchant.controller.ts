import { Controller, Get, Param, Query } from '@nestjs/common';
import { MerchantService } from './merchant.service';

@Controller('merchant')
export class MerchantController {
    constructor(private readonly merchantService: MerchantService) { }

    @Get('by-shop')
    getStoreByShop(@Query('shop') shop: string) {
        return this.merchantService.getStoreByShop(shop);
    }

    @Get('store/:storeId')
    getStore(@Param('storeId') storeId: string) {
        return this.merchantService.getStore(storeId);
    }

    @Get('usage/:storeId')
    getUsage(@Param('storeId') storeId: string) {
        return this.merchantService.getUsage(storeId);
    }

    @Get('messages/:storeId')
    getMessages(@Param('storeId') storeId: string) {
        return this.merchantService.getMessages(storeId);
    }

    @Get('customers/:storeId')
    getCustomers(@Param('storeId') storeId: string) {
        return this.merchantService.getCustomers(storeId);
    }

    @Get('orders/:storeId')
    getOrders(@Param('storeId') storeId: string) {
        return this.merchantService.getOrders(storeId);
    }

    @Get('subscription/:storeId')
    getSubscriptionStatus(@Param('storeId') storeId: string) {
        return this.merchantService.getSubscriptionStatus(storeId);
    }

    @Get('whatsapp/:storeId')
    getWhatsAppStatus(@Param('storeId') storeId: string) {
        return this.merchantService.getWhatsAppStatus(storeId);
    }
}