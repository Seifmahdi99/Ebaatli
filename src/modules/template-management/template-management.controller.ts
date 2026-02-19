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
