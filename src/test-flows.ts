import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FlowService } from './modules/flow/flow.service';
import { TemplateService } from './modules/template/template.service';
import { PrismaClient } from '@prisma/client';

async function testFlows() {
  console.log('🔄 Testing Flow System...\n');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const flowService = app.get(FlowService);
  const templateService = app.get(TemplateService);
  const prisma = new PrismaClient();

  const store = await prisma.store.findFirst({
    where: { platformStoreId: '3m0rxv-wn.myshopify.com' }
  });

  if (!store) {
    console.log('❌ Store not found!');
    process.exit(1);
  }

  console.log(`✅ Store: ${store.name}\n`);

  // Seed templates first
  console.log('📝 Seeding templates...');
  await templateService.seedDefaultTemplates(store.id);

  // Seed flows
  console.log('\n🔄 Seeding default flows...');
  await flowService.seedDefaultFlows(store.id);

  // Get all flows
  const flows = await flowService.getStoreFlows(store.id);
  console.log(`\n✅ ${flows.length} flow(s) available:\n`);

  flows.forEach(f => {
    console.log(`⚡ ${f.name}`);
    console.log(`   Trigger: ${f.trigger}`);
    console.log(`   Steps: ${f.automationSteps.length}`);
    f.automationSteps.forEach(s => {
      console.log(`   ${s.stepOrder}. ${s.actionType}`);
    });
    console.log('');
  });

  console.log('🎉 Flow system working!\n');

  await prisma.$disconnect();
  await app.close();
}

testFlows();
