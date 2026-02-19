import { Module } from '@nestjs/common';
import { TemplateManagementController } from './template-management.controller';
import { TemplateManagementService } from './template-management.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TemplateManagementController],
  providers: [TemplateManagementService],
})
export class TemplateManagementModule {}
