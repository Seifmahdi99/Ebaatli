-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "cart_token" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "customer_id" TEXT,
    "total_amount" DOUBLE PRECISION,
    "currency" TEXT,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "converted_at" TIMESTAMP(3),
    "recovery_sent" BOOLEAN NOT NULL DEFAULT false,
    "recovery_at" TIMESTAMP(3),
    "raw_payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "carts_store_id_idx" ON "carts"("store_id");

-- CreateIndex
CREATE INDEX "carts_converted_recovery_sent_created_at_idx" ON "carts"("converted", "recovery_sent", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "carts_store_id_cart_token_key" ON "carts"("store_id", "cart_token");

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
