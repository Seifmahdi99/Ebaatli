import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { TemplateService } from '../template/template.service';

interface FlowTrigger {
  type: 'order_created' | 'order_cancelled' | 'order_fulfilled' | 'cart_created' | 'cart_abandoned';
  storeId: string;
  data: any;
}

interface CreateFlowDto {
  storeId: string;
  name: string;
  trigger: string;
  steps: FlowStepDto[];
}

interface FlowStepDto {
  stepOrder: number;
  actionType: 'send_sms' | 'send_whatsapp' | 'send_email' | 'wait' | 'condition';
  config: {
    templateId?: string;
    channel?: string;
    delay?: number; // in minutes
    condition?: string;
  };
}

@Injectable()
export class FlowService {
  private readonly logger = new Logger(FlowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
    private readonly whatsappService: WhatsAppService,
    private readonly templateService: TemplateService,
  ) {}

  /**
   * Create a new automation flow
   */
  async createFlow(dto: CreateFlowDto) {
    const flow = await this.prisma.automationFlow.create({
      data: {
        storeId: dto.storeId,
        name: dto.name,
        trigger: dto.trigger,
        isActive: true,
        automationSteps: {
          create: dto.steps.map(step => ({
            stepOrder: step.stepOrder,
            actionType: step.actionType,
            config: step.config,
          })),
        },
      },
      include: {
        automationSteps: true,
      },
    });

    this.logger.log(`✅ Flow created: ${flow.name} (Trigger: ${flow.trigger})`);
    return flow;
  }

  /**
   * Get all flows for a store
   */
  async getStoreFlows(storeId: string, trigger?: string) {
    return await this.prisma.automationFlow.findMany({
      where: {
        storeId,
        ...(trigger && { trigger }),
        isActive: true,
      },
      include: {
        automationSteps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });
  }

  /**
   * Execute flows for a trigger
   */
  async executeTrigger(trigger: FlowTrigger) {
    const flows = await this.getStoreFlows(trigger.storeId, trigger.type);

    if (flows.length === 0) {
      this.logger.log(`No active flows for trigger: ${trigger.type}`);
      return;
    }

    this.logger.log(`🔄 Executing ${flows.length} flow(s) for trigger: ${trigger.type}`);

    for (const flow of flows) {
      try {
        await this.executeFlow(flow, trigger.data);
        
        // Update flow stats
        await this.prisma.automationFlow.update({
          where: { id: flow.id },
          data: {
            triggerCount: { increment: 1 },
            lastTriggeredAt: new Date(),
          },
        });
      } catch (error: any) {
        this.logger.error(`❌ Flow execution failed: ${flow.name} - ${error.message}`);
      }
    }
  }

  /**
   * Execute a single flow
   */
  private async executeFlow(flow: any, data: any) {
    this.logger.log(`▶️ Executing flow: ${flow.name}`);

    for (const step of flow.automationSteps) {
      try {
        await this.executeStep(step, data, flow.storeId);
      } catch (error: any) {
        this.logger.error(`❌ Step ${step.stepOrder} failed: ${error.message}`);
        throw error;
      }
    }

    this.logger.log(`✅ Flow completed: ${flow.name}`);
  }

  /**
   * Execute a single step
   */
  private async executeStep(step: any, data: any, storeId: string) {
    const config = step.config as any;

    switch (step.actionType) {
      case 'send_sms':
        await this.executeSendSms(storeId, config, data);
        break;

      case 'send_whatsapp':
        await this.executeSendWhatsApp(storeId, config, data);
        break;

      case 'wait':
        this.logger.log(`⏳ Wait step: ${config.delay} minutes (scheduled)`);
        // In production, this would schedule a job for later
        break;

      case 'condition':
        this.logger.log(`🔍 Condition step: ${config.condition}`);
        // Evaluate condition and skip/continue based on result
        break;

      default:
        this.logger.warn(`Unknown action type: ${step.actionType}`);
    }
  }

  /**
   * Execute send SMS step
   */
  private async executeSendSms(storeId: string, config: any, data: any) {
    if (!data.customerPhone) {
      this.logger.warn('No customer phone - skipping SMS');
      return;
    }

    let message = config.message || '';

    // If template is specified, use it
    if (config.templateId) {
      const template = await this.templateService.getTemplate(config.templateId);
      if (template) {
        message = this.templateService.replaceVariables(template.content, data);
      }
    }

    if (!message) {
      this.logger.warn('No message content - skipping SMS');
      return;
    }

    await this.smsService.sendSms(storeId, {
      to: data.customerPhone,
      message,
    });

    this.logger.log(`📱 SMS sent via flow`);
  }

  /**
   * Execute send WhatsApp step
   */
  private async executeSendWhatsApp(storeId: string, config: any, data: any) {
    if (!data.customerPhone) {
      this.logger.warn('No customer phone - skipping WhatsApp');
      return;
    }

    let message = config.message || '';

    if (config.templateId) {
      const template = await this.templateService.getTemplate(config.templateId);
      if (template) {
        message = this.templateService.replaceVariables(template.content, data);
      }
    }

    if (!message) {
      this.logger.warn('No message content - skipping WhatsApp');
      return;
    }

    await this.whatsappService.sendMessage(storeId, {
      to: data.customerPhone,
      message,
    });

    this.logger.log(`💬 WhatsApp sent via flow`);
  }

  /**
   * Seed default flows for a store
   */
  async seedDefaultFlows(storeId: string) {
    const templates = await this.templateService.getStoreTemplates(storeId);
    const smsTemplate = templates.find(t => t.channel === 'sms');
    const whatsappTemplate = templates.find(t => t.channel === 'whatsapp');

    const defaultFlows: CreateFlowDto[] = [
      {
        storeId,
        name: 'Order Confirmation Messages',
        trigger: 'order_created',
        steps: [
          {
            stepOrder: 1,
            actionType: 'send_sms',
            config: {
              templateId: smsTemplate?.id,
            },
          },
          {
            stepOrder: 2,
            actionType: 'send_whatsapp',
            config: {
              templateId: whatsappTemplate?.id,
            },
          },
        ],
      },
    ];

    const created: any[] = [];
    for (const flowDto of defaultFlows) {
      const existing = await this.prisma.automationFlow.findFirst({
        where: { storeId, name: flowDto.name },
      });

      if (!existing) {
        const flow = await this.createFlow(flowDto);
        created.push(flow);
      }
    }

    this.logger.log(`✅ Seeded ${created.length} default flow(s)`);
    return created;
  }
}
