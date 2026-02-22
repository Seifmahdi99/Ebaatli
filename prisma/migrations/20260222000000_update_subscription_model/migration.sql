-- AlterTable: make end_date nullable and add shopify_subscription_id
ALTER TABLE "subscriptions" ALTER COLUMN "end_date" DROP NOT NULL;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "shopify_subscription_id" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions"("status");
