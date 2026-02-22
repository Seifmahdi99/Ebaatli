import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { FlowManagementService } from './flow-management.service';
import { ShopifySessionGuard } from '../../guards/shopify-session.guard';

@UseGuards(ShopifySessionGuard)
@Controller('flows')
export class FlowManagementController {
  constructor(private readonly flowService: FlowManagementService) {}

  @Get()
  async getFlows(@Query('storeId') storeId: string) {
    return this.flowService.getFlows(storeId);
  }

  @Get(':flowId')
  async getFlow(@Param('flowId') flowId: string) {
    return this.flowService.getFlow(flowId);
  }

  @Post()
  async createFlow(@Body() data: any) {
    return this.flowService.createFlow(data);
  }

  @Patch(':flowId')
  async updateFlow(@Param('flowId') flowId: string, @Body() data: any) {
    return this.flowService.updateFlow(flowId, data);
  }

  @Delete(':flowId')
  async deleteFlow(@Param('flowId') flowId: string) {
    return this.flowService.deleteFlow(flowId);
  }
}
