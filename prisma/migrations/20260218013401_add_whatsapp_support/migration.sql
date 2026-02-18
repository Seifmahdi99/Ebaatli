-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "whatsappAccessToken" TEXT,
ADD COLUMN     "whatsappBusinessAccountId" TEXT,
ADD COLUMN     "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappPhoneNumberId" TEXT,
ADD COLUMN     "whatsappQuotaAllocated" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "whatsappQuotaResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "whatsappQuotaUsed" INTEGER NOT NULL DEFAULT 0;
