import { Module } from '@nestjs/common';
import { FlowManagementController } from './flow-management.controller';
import { FlowManagementService } from './flow-management.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FlowManagementController],
  providers: [FlowManagementService],
})
export class FlowManagementModule {}
