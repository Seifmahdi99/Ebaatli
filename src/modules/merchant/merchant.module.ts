import { Module } from '@nestjs/common';
import { MerchantController } from './merchant.controller';
import { MerchantService } from './merchant.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopifySessionGuard } from '../../guards/shopify-session.guard';

@Module({
    imports: [PrismaModule],
    controllers: [MerchantController],
    providers: [MerchantService, ShopifySessionGuard],
})
export class MerchantModule { }