#!/bin/bash

echo "Creating Template Management Module..."

# Controller
cat > src/modules/template-management/template-management.controller.ts << 'ENDCONTROLLER'
import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { TemplateManagementService } from './template-management.service';

@Controller('templates')
export class TemplateManagementController {
  constructor(private readonly templateService: TemplateManagementService) {}

  @Get()
  async getTemplates(@Query('storeId') storeId: string) {
    return this.templateService.getTemplates(storeId);
  }

  @Get(':templateId')
  async getTemplate(@Param('templateId') templateId: string) {
    return this.templateService.getTemplate(templateId);
  }

  @Post()
  async createTemplate(@Body() data: any) {
    return this.templateService.createTemplate(data);
  }

  @Patch(':templateId')
  async updateTemplate(@Param('templateId') templateId: string, @Body() data: any) {
    return this.templateService.updateTemplate(templateId, data);
  }

  @Delete(':templateId')
  async deleteTemplate(@Param('templateId') templateId: string) {
    return this.templateService.deleteTemplate(templateId);
  }
}
ENDCONTROLLER

# Service
cat > src/modules/template-management/template-management.service.ts << 'ENDSERVICE'
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TemplateManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async getTemplates(storeId: string) {
    return this.prisma.template.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTemplate(templateId: string) {
    return this.prisma.template.findUnique({
      where: { id: templateId },
    });
  }

  async createTemplate(data: any) {
    return this.prisma.template.create({
      data,
    });
  }

  async updateTemplate(templateId: string, data: any) {
    return this.prisma.template.update({
      where: { id: templateId },
      data,
    });
  }

  async deleteTemplate(templateId: string) {
    return this.prisma.template.delete({
      where: { id: templateId },
    });
  }
}
ENDSERVICE

# Module
cat > src/modules/template-management/template-management.module.ts << 'ENDMODULE'
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
ENDMODULE

echo "✅ Template Management Module created!"
echo "Now add TemplateManagementModule to app.module.ts imports"
