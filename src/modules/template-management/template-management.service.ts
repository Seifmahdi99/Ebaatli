import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TemplateManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async getTemplates(storeId: string) {
    return this.prisma.messageTemplate.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTemplate(templateId: string) {
    return this.prisma.messageTemplate.findUnique({
      where: { id: templateId },
    });
  }

  async createTemplate(data: any) {
    return this.prisma.messageTemplate.create({
      data,
    });
  }

  async updateTemplate(templateId: string, data: any) {
    return this.prisma.messageTemplate.update({
      where: { id: templateId },
      data,
    });
  }

  async deleteTemplate(templateId: string) {
    return this.prisma.messageTemplate.delete({
      where: { id: templateId },
    });
  }
}
