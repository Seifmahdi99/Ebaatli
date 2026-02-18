/*
  Warnings:

  - You are about to drop the column `net_balance` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the `sms_configurations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "sms_configurations" DROP CONSTRAINT "sms_configurations_store_id_fkey";

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "net_balance";

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "sms_quota_allocated" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sms_quota_reset_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "sms_quota_used" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sms_sender_id" TEXT;

-- DropTable
DROP TABLE "sms_configurations";
