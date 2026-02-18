/*
  Warnings:

  - You are about to drop the column `description` on the `automation_flows` table. All the data in the column will be lost.
  - You are about to drop the column `success_rate` on the `automation_flows` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `automation_steps` table. All the data in the column will be lost.
  - You are about to drop the column `language_preference` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `opted_in` on the `customers` table. All the data in the column will be lost.
  - The `tags` column on the `customers` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `processed_at` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `received_at` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `flow_id` on the `message_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `retry_config` on the `message_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `step_id` on the `message_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `read_at` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `sender_id` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `template_id` on the `messages` table. All the data in the column will be lost.
  - You are about to alter the column `transaction_price` on the `messages` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,4)` to `DoublePrecision`.
  - You are about to drop the column `tags` on the `orders` table. All the data in the column will be lost.
  - You are about to alter the column `total_amount` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to drop the column `billing_id` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `ended_at` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `plan` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `started_at` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `verified_at` on the `whatsapp_connections` table. All the data in the column will be lost.
  - You are about to drop the `message_templates` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `action_type` to the `automation_steps` table without a default value. This is not possible if the table is not empty.
  - Made the column `customer_id` on table `orders` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `end_date` to the `subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tier` to the `subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `display_phone_number` to the `whatsapp_connections` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone_number` to the `whatsapp_connections` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_order_id_fkey";

-- DropForeignKey
ALTER TABLE "message_jobs" DROP CONSTRAINT "message_jobs_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "message_jobs" DROP CONSTRAINT "message_jobs_flow_id_fkey";

-- DropForeignKey
ALTER TABLE "message_jobs" DROP CONSTRAINT "message_jobs_order_id_fkey";

-- DropForeignKey
ALTER TABLE "message_jobs" DROP CONSTRAINT "message_jobs_step_id_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_customer_id_fkey";

-- DropIndex
DROP INDEX "automation_flows_store_id_is_active_idx";

-- DropIndex
DROP INDEX "automation_steps_flow_id_step_order_idx";

-- DropIndex
DROP INDEX "customers_store_id_email_idx";

-- DropIndex
DROP INDEX "customers_store_id_phone_idx";

-- DropIndex
DROP INDEX "events_store_id_status_idx";

-- DropIndex
DROP INDEX "events_type_processed_at_idx";

-- DropIndex
DROP INDEX "message_jobs_channel_idx";

-- DropIndex
DROP INDEX "message_jobs_status_scheduled_at_idx";

-- DropIndex
DROP INDEX "message_jobs_store_id_status_idx";

-- DropIndex
DROP INDEX "messages_epush_msg_id_idx";

-- DropIndex
DROP INDEX "messages_provider_provider_message_id_idx";

-- DropIndex
DROP INDEX "orders_order_number_idx";

-- DropIndex
DROP INDEX "orders_store_id_customer_id_idx";

-- DropIndex
DROP INDEX "orders_store_id_status_idx";

-- DropIndex
DROP INDEX "subscriptions_status_idx";

-- AlterTable
ALTER TABLE "automation_flows" DROP COLUMN "description",
DROP COLUMN "success_rate";

-- AlterTable
ALTER TABLE "automation_steps" DROP COLUMN "type",
ADD COLUMN     "action_type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "language_preference",
DROP COLUMN "opted_in",
ADD COLUMN     "accepts_marketing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "tags",
ADD COLUMN     "tags" JSONB;

-- AlterTable
ALTER TABLE "events" DROP COLUMN "processed_at",
DROP COLUMN "received_at",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "message_jobs" DROP COLUMN "flow_id",
DROP COLUMN "retry_config",
DROP COLUMN "step_id",
ADD COLUMN     "last_error" TEXT,
ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "read_at",
DROP COLUMN "sender_id",
DROP COLUMN "template_id",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "failed_at" TIMESTAMP(3),
ALTER COLUMN "transaction_price" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "tags",
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "customer_id" SET NOT NULL,
ALTER COLUMN "total_amount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "billing_id",
DROP COLUMN "ended_at",
DROP COLUMN "plan",
DROP COLUMN "provider",
DROP COLUMN "started_at",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "end_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "tier" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "whatsapp_connections" DROP COLUMN "verified_at",
ADD COLUMN     "display_phone_number" TEXT NOT NULL,
ADD COLUMN     "is_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone_number" TEXT NOT NULL,
ADD COLUMN     "quality_rating" TEXT,
ALTER COLUMN "status" SET DEFAULT 'active';

-- DropTable
DROP TABLE "message_templates";

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageTemplate_storeId_idx" ON "MessageTemplate"("storeId");

-- CreateIndex
CREATE INDEX "MessageTemplate_channel_idx" ON "MessageTemplate"("channel");

-- CreateIndex
CREATE INDEX "automation_flows_store_id_idx" ON "automation_flows"("store_id");

-- CreateIndex
CREATE INDEX "automation_steps_flow_id_idx" ON "automation_steps"("flow_id");

-- CreateIndex
CREATE INDEX "customers_store_id_idx" ON "customers"("store_id");

-- CreateIndex
CREATE INDEX "customers_email_idx" ON "customers"("email");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "events_store_id_idx" ON "events"("store_id");

-- CreateIndex
CREATE INDEX "events_type_idx" ON "events"("type");

-- CreateIndex
CREATE INDEX "events_created_at_idx" ON "events"("created_at");

-- CreateIndex
CREATE INDEX "message_jobs_store_id_idx" ON "message_jobs"("store_id");

-- CreateIndex
CREATE INDEX "message_jobs_status_idx" ON "message_jobs"("status");

-- CreateIndex
CREATE INDEX "message_jobs_scheduled_at_idx" ON "message_jobs"("scheduled_at");

-- CreateIndex
CREATE INDEX "messages_status_idx" ON "messages"("status");

-- CreateIndex
CREATE INDEX "orders_store_id_idx" ON "orders"("store_id");

-- CreateIndex
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_jobs" ADD CONSTRAINT "message_jobs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_jobs" ADD CONSTRAINT "message_jobs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
