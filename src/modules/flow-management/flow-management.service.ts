import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FlowManagementService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireSubscription(storeId: string): Promise<void> {
    const sub = await this.prisma.subscription.findFirst({
      where: { storeId, status: { equals: 'active', mode: 'insensitive' } },
    });
    if (!sub) {
      throw new ForbiddenException(
        'An active subscription is required to create or enable automation flows.',
      );
    }
  }

  async getFlows(storeId: string) {
    return this.prisma.automationFlow.findMany({
      where: { storeId },
      include: {
        automationSteps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFlow(flowId: string) {
    return this.prisma.automationFlow.findUnique({
      where: { id: flowId },
      include: {
        automationSteps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });
  }

  async createFlow(data: any) {
    const { steps, storeId, ...flowData } = data;

    await this.requireSubscription(storeId);

    return this.prisma.automationFlow.create({
      data: {
        storeId,
        ...flowData,
        automationSteps: {
          create: steps || [],
        },
      },
      include: {
        automationSteps: true,
      },
    });
  }

  async updateFlow(flowId: string, data: any) {
    const { steps, ...flowData } = data;

    // If trying to enable a flow, verify subscription first
    if (flowData.isActive === true) {
      const flow = await this.prisma.automationFlow.findUnique({
        where: { id: flowId },
        select: { storeId: true },
      });
      if (flow) {
        await this.requireSubscription(flow.storeId);
      }
    }

    // Update flow
    await this.prisma.automationFlow.update({
      where: { id: flowId },
      data: flowData,
    });

    // If steps provided, delete old and create new
    if (steps) {
      await this.prisma.automationStep.deleteMany({
        where: { flowId },
      });

      await this.prisma.automationStep.createMany({
        data: steps.map((step: any, index: number) => ({
          flowId,
          stepOrder: step.stepOrder || index + 1,
          actionType: step.actionType,
          config: step.config,
        })),
      });
    }

    return this.getFlow(flowId);
  }

  async deleteFlow(flowId: string) {
    return this.prisma.automationFlow.delete({
      where: { id: flowId },
    });
  }
}
