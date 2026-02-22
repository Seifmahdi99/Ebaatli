import { Module } from '@nestjs/common';
import { FlowManagementController } from './flow-management.controller';
import { FlowManagementService } from './flow-management.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopifySessionGuard } from '../../guards/shopify-session.guard';

@Module({
  imports: [PrismaModule],
  controllers: [FlowManagementController],
  providers: [FlowManagementService, ShopifySessionGuard],
})
export class FlowManagementModule {}
