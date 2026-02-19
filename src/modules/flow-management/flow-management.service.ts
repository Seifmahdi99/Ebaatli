import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FlowManagementService {
  constructor(private readonly prisma: PrismaService) {}

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
    const { steps, ...flowData } = data;
    
    return this.prisma.automationFlow.create({
      data: {
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
