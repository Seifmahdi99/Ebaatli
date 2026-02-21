import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TemplateService } from '../template/template.service';
import { SmsService } from '../sms/sms.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface FlowTrigger {
  type: 'order_created' | 'order_cancelled' | 'order_fulfilled' | 'cart_created' | 'cart_abandoned';
  storeId: string;
  data: any;
}

export interface CreateFlowDto {
  storeId: string;
  name: string;
  trigger: string;
  steps: FlowStepDto[];
}

export interface FlowStepDto {
  stepOrder: number;
  actionType: 'send_sms' | 'send_whatsapp' | 'send_email' | 'wait' | 'condition';
  config: {
    templateId?: string;
    channel?: string;
    delay?: number; // in minutes
    message?: string;
    condition?: string;
  };
}

@Injectable()
export class FlowService {
  private readonly logger = new Logger(FlowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templateService: TemplateService,
    private readonly smsService: SmsService,
    private readonly whatsAppService: WhatsAppService,
  ) { }

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
   * Get all active flows for a store
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
      await this.executeStep(step, data, flow.storeId);
    }

    this.logger.log(`✅ Flow scheduled: ${flow.name}`);
  }

  /**
   * Execute a single step (SCHEDULE ONLY)
   */
  private async executeStep(step: any, data: any, storeId: string) {
    const config = step.config as any;

    if (!data.customerId) {
      this.logger.warn('No customerId provided - skipping step');
      return;
    }

    switch (step.actionType) {
      case 'send_sms':
      case 'send_whatsapp':
        await this.scheduleMessage(storeId, step.actionType, config, data);
        break;

      case 'wait':
        this.logger.log(`⏳ Wait step defined (${config.delay} minutes)`);
        break;

      case 'condition':
        this.logger.log(`🔍 Condition step: ${config.condition}`);
        break;

      default:
        this.logger.warn(`Unknown action type: ${step.actionType}`);
    }
  }

  /**
   * Create MessageJob instead of sending immediately
   */
  private async scheduleMessage(
    storeId: string,
    actionType: string,
    config: any,
    data: any,
  ) {
    const delayMinutes = config.delay || 0;

    const scheduledAt = new Date(
      Date.now() + delayMinutes * 60 * 1000
    );

    let message = config.message || '';

    if (config.templateId) {
      const template = await this.templateService.getTemplate(config.templateId);
      if (template) {
        message = this.templateService.replaceVariables(template.content, data);
      }
    }

    if (!message) {
      this.logger.warn('No message content - skipping scheduling');
      return;
    }

    await this.prisma.messageJob.create({
      data: {
        storeId,
        customerId: data.customerId,
        channel: actionType === 'send_sms' ? 'sms' : 'whatsapp',
        content: message,
        scheduledAt,
        status: 'pending',
      },
    });

    this.logger.log(
      `📌 MessageJob created (${actionType}) - scheduled in ${delayMinutes} min`
    );
  }

  /**
   * CRON JOB: Process pending messages
   * Runs every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processPendingJobs() {
    this.logger.log('⏰ Checking for pending message jobs...');

    const pendingJobs = await this.prisma.messageJob.findMany({
      where: {
        status: 'pending',
        scheduledAt: {
          lte: new Date(),
        },
      },
      include: {
        customer: true,
      },
      take: 50, // Process batch of 50
    });

    if (pendingJobs.length === 0) {
      return;
    }

    this.logger.log(`🚀 Processing ${pendingJobs.length} pending jobs...`);

    for (const job of pendingJobs) {
      try {
        if (!job.customer || !job.customer.phone) {
          throw new Error('Customer phone missing');
        }

        const phone = job.customer.phone;
        const content = job.content || '';

        if (job.channel === 'sms') {
          await this.smsService.sendSms(job.storeId, { to: phone, message: content });
        } else if (job.channel === 'whatsapp') {
          await this.whatsAppService.sendMessage(job.storeId, { to: phone, message: content });
        }

        await this.prisma.messageJob.update({
          where: { id: job.id },
          data: { status: 'processed', sentAt: new Date() },
        });

        this.logger.log(`✅ Job ${job.id} processed successfully`);

      } catch (error: any) {
        this.logger.error(`❌ Failed to process job ${job.id}: ${error.message}`);

        await this.prisma.messageJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            lastError: error.message,
            attempts: { increment: 1 }
          },
        });
      }
    }
  }

  /**
   * CRON JOB: Check for abandoned carts
   * Runs every 5 minutes — finds carts older than 60 min, not converted, not yet messaged
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkAbandonedCarts() {
    this.logger.log('🛒 Checking for abandoned carts...');

    const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    const abandonedCarts = await (this.prisma as any).cart.findMany({
      where: {
        converted: false,
        recoverySent: false,
        createdAt: { lte: cutoff },
        phone: { not: null },
      },
      include: { customer: true },
    });

    if (abandonedCarts.length === 0) {
      return;
    }

    this.logger.log(`🚀 Found ${abandonedCarts.length} abandoned cart(s)`);

    for (const cart of abandonedCarts) {
      try {
        const triggerData: any = {
          customerPhone: cart.phone,
          total_amount: String(cart.totalAmount ?? '0'),
          currency: cart.currency ?? '',
        };

        if (cart.customerId) {
          triggerData.customerId = cart.customerId;
        } else if (cart.customer) {
          triggerData.customerId = cart.customer.id;
          triggerData.customer_name = `${cart.customer.firstName ?? ''} ${cart.customer.lastName ?? ''}`.trim();
        }

        if (triggerData.customerId) {
          await this.executeTrigger({
            type: 'cart_abandoned',
            storeId: cart.storeId,
            data: triggerData,
          });
        } else {
          this.logger.warn(`Abandoned cart ${cart.id} has no linked customer — skipping flow`);
        }

        await (this.prisma as any).cart.update({
          where: { id: cart.id },
          data: { recoverySent: true, recoveryAt: new Date() },
        });
      } catch (error: any) {
        this.logger.error(`❌ Failed to process abandoned cart ${cart.id}: ${error.message}`);
      }
    }
  }

  /**
   * Seed default order confirmation flow
   */
  async seedDefaultFlows(storeId: string) {
    const templates = await this.templateService.getStoreTemplates(storeId);
    const smsTemplate = templates.find(t => t.channel === 'sms');
    const whatsappTemplate = templates.find(t => t.channel === 'whatsapp');

    const defaultFlow: CreateFlowDto = {
      storeId,
      name: 'Order Confirmation Messages',
      trigger: 'order_created',
      steps: [
        {
          stepOrder: 1,
          actionType: 'send_sms',
          config: {
            templateId: smsTemplate?.id,
            delay: 0,
          },
        },
        {
          stepOrder: 2,
          actionType: 'send_whatsapp',
          config: {
            templateId: whatsappTemplate?.id,
            delay: 0,
          },
        },
      ],
    };

    const existing = await this.prisma.automationFlow.findFirst({
      where: { storeId, name: defaultFlow.name },
    });

    if (!existing) {
      await this.createFlow(defaultFlow);
      this.logger.log(`✅ Default flow seeded`);
    }
  }
}