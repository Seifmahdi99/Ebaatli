import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateTemplateDto {
  storeId: string;
  name: string;
  channel: 'sms' | 'whatsapp' | 'email';
  content: string;
  language?: string;
  subject?: string;
  variables?: string[];
}

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createTemplate(dto: CreateTemplateDto) {
    const template = await this.prisma.messageTemplate.create({
      data: {
        storeId: dto.storeId,
        name: dto.name,
        channel: dto.channel,
        content: dto.content,
        language: dto.language || 'en',
        subject: dto.subject,
        variables: dto.variables || this.extractVariables(dto.content),
        isActive: true,
      },
    });

    this.logger.log(`✅ Template created: ${template.name} (${template.channel})`);
    return template;
  }

  async getStoreTemplates(storeId: string, channel?: string) {
    return await this.prisma.messageTemplate.findMany({
      where: {
        storeId,
        ...(channel && { channel }),
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

/**
 * Get template by ID
 */
async getTemplate(templateId: string) {
  return await this.prisma.messageTemplate.findUnique({
    where: { id: templateId },
  });
}

  replaceVariables(content: string, variables: Record<string, string>): string {
    let rendered = content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, value);
    }
    return rendered.replace(/{{.*?}}/g, '');
  }

  extractVariables(content: string): string[] {
    const regex = /{{(.*?)}}/g;
    const matches = content.matchAll(regex);
    const variables = new Set<string>();
    for (const match of matches) {
      variables.add(match[1].trim());
    }
    return Array.from(variables);
  }

  getDefaultTemplates() {
    return {
      order_confirmation_sms: {
        name: 'Order Confirmation (SMS)',
        channel: 'sms' as const,
        content: 'Hi {{customer_name}}! Your order #{{order_number}} for {{total_amount}} {{currency}} has been confirmed. Thank you! 🎉',
        variables: ['customer_name', 'order_number', 'total_amount', 'currency'],
      },
      order_confirmation_whatsapp: {
        name: 'Order Confirmation (WhatsApp)',
        channel: 'whatsapp' as const,
        content: 'Hello {{customer_name}}! 👋\n\nYour order #{{order_number}} has been confirmed!\n\nTotal: {{total_amount}} {{currency}}\n\nThank you! 🛍️',
        variables: ['customer_name', 'order_number', 'total_amount', 'currency'],
      },
    };
  }

  async seedDefaultTemplates(storeId: string) {
    const defaults = this.getDefaultTemplates();
    const created: any[] = [];

    for (const template of Object.values(defaults)) {
      const existing = await this.prisma.messageTemplate.findFirst({
        where: { storeId, name: template.name },
      });

      if (!existing) {
        const newTemplate = await this.createTemplate({
          storeId,
          name: template.name,
          channel: template.channel,
          content: template.content,
          variables: template.variables,
        });
        created.push(newTemplate);
      }
    }

    this.logger.log(`✅ Seeded ${created.length} default templates`);
    return created;
  }
}
