-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platform_store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Cairo',
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "access_token" TEXT NOT NULL,
    "scope" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "webhook_secret" TEXT,
    "installed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'shopify',
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "billing_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "platform_customer_id" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "opted_in" BOOLEAN NOT NULL DEFAULT true,
    "language_preference" TEXT NOT NULL DEFAULT 'ar',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "platform_order_id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fulfillment_status" TEXT,
    "financial_status" TEXT,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "raw_payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_flows" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_triggered_at" TIMESTAMP(3),
    "trigger_count" INTEGER NOT NULL DEFAULT 0,
    "success_rate" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_steps" (
    "id" TEXT NOT NULL,
    "flow_id" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "order_id" TEXT,
    "type" TEXT NOT NULL,
    "reference_id" TEXT,
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_jobs" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "order_id" TEXT,
    "customer_id" TEXT,
    "flow_id" TEXT,
    "step_id" TEXT,
    "channel" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "retry_config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "to_number" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "template_id" TEXT,
    "status" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "epush_msg_id" TEXT,
    "transaction_price" DECIMAL(10,4),
    "net_balance" DECIMAL(10,2),
    "sender_id" TEXT,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_connections" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "phone_number_id" TEXT NOT NULL,
    "business_account_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'connected',
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_configurations" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "sender_id" TEXT,
    "sender_status" TEXT NOT NULL DEFAULT 'pending',
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "last_balance_check" TIMESTAMP(3),
    "low_balance_threshold" DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    "low_balance_alert_sent" BOOLEAN NOT NULL DEFAULT false,
    "whitelisted_ip" TEXT,
    "default_language" TEXT NOT NULL DEFAULT 'ar',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "template_id" TEXT,
    "content" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "language" TEXT NOT NULL DEFAULT 'ar',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stores_platform_platform_store_id_idx" ON "stores"("platform", "platform_store_id");

-- CreateIndex
CREATE INDEX "stores_status_idx" ON "stores"("status");

-- CreateIndex
CREATE UNIQUE INDEX "stores_platform_platform_store_id_key" ON "stores"("platform", "platform_store_id");

-- CreateIndex
CREATE INDEX "subscriptions_store_id_idx" ON "subscriptions"("store_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "customers_store_id_phone_idx" ON "customers"("store_id", "phone");

-- CreateIndex
CREATE INDEX "customers_store_id_email_idx" ON "customers"("store_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_store_id_platform_customer_id_key" ON "customers"("store_id", "platform_customer_id");

-- CreateIndex
CREATE INDEX "orders_store_id_status_idx" ON "orders"("store_id", "status");

-- CreateIndex
CREATE INDEX "orders_store_id_customer_id_idx" ON "orders"("store_id", "customer_id");

-- CreateIndex
CREATE INDEX "orders_order_number_idx" ON "orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "orders_store_id_platform_order_id_key" ON "orders"("store_id", "platform_order_id");

-- CreateIndex
CREATE INDEX "automation_flows_store_id_is_active_idx" ON "automation_flows"("store_id", "is_active");

-- CreateIndex
CREATE INDEX "automation_flows_trigger_idx" ON "automation_flows"("trigger");

-- CreateIndex
CREATE INDEX "automation_steps_flow_id_step_order_idx" ON "automation_steps"("flow_id", "step_order");

-- CreateIndex
CREATE INDEX "events_store_id_status_idx" ON "events"("store_id", "status");

-- CreateIndex
CREATE INDEX "events_type_processed_at_idx" ON "events"("type", "processed_at");

-- CreateIndex
CREATE INDEX "message_jobs_store_id_status_idx" ON "message_jobs"("store_id", "status");

-- CreateIndex
CREATE INDEX "message_jobs_status_scheduled_at_idx" ON "message_jobs"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "message_jobs_channel_idx" ON "message_jobs"("channel");

-- CreateIndex
CREATE INDEX "messages_job_id_idx" ON "messages"("job_id");

-- CreateIndex
CREATE INDEX "messages_provider_provider_message_id_idx" ON "messages"("provider", "provider_message_id");

-- CreateIndex
CREATE INDEX "messages_epush_msg_id_idx" ON "messages"("epush_msg_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_connections_store_id_key" ON "whatsapp_connections"("store_id");

-- CreateIndex
CREATE INDEX "whatsapp_connections_store_id_idx" ON "whatsapp_connections"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "sms_configurations_store_id_key" ON "sms_configurations"("store_id");

-- CreateIndex
CREATE INDEX "sms_configurations_store_id_idx" ON "sms_configurations"("store_id");

-- CreateIndex
CREATE INDEX "message_templates_store_id_channel_idx" ON "message_templates"("store_id", "channel");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_flows" ADD CONSTRAINT "automation_flows_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_steps" ADD CONSTRAINT "automation_steps_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "automation_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_jobs" ADD CONSTRAINT "message_jobs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_jobs" ADD CONSTRAINT "message_jobs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_jobs" ADD CONSTRAINT "message_jobs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_jobs" ADD CONSTRAINT "message_jobs_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "automation_flows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_jobs" ADD CONSTRAINT "message_jobs_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "automation_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "message_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "whatsapp_connections_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_configurations" ADD CONSTRAINT "sms_configurations_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
