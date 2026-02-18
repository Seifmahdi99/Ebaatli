import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TemplateService } from './modules/template/template.service';
import { PrismaClient } from '@prisma/client';

async function testTemplates() {
  console.log('🎨 Testing Template System...\n');
  
  const app = await NestFactory.createApplicationContext(AppModule);
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

  console.log('📝 Seeding default templates...');
  await templateService.seedDefaultTemplates(store.id);

  const templates = await templateService.getStoreTemplates(store.id);
  console.log(`\n✅ ${templates.length} templates available:\n`);

  templates.forEach(t => {
    console.log(`📄 ${t.name} (${t.channel})`);
    console.log(`   Variables: ${(t.variables as string[]).join(', ')}`);
    console.log(`   Content: ${t.content.substring(0, 80)}...\n`);
  });

  console.log('🎉 Template system working!\n');

  await prisma.$disconnect();
  await app.close();
}

testTemplates();
