CREATE TABLE "shop_order_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "event_type" varchar(64) NOT NULL,
  "actor_type" varchar(32) DEFAULT 'system' NOT NULL,
  "actor_id" uuid,
  "source" varchar(32) DEFAULT 'api' NOT NULL,
  "note" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "event_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_order_change_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "actor_type" varchar(32) DEFAULT 'system' NOT NULL,
  "actor_id" uuid,
  "reason" text,
  "field_name" varchar(128) NOT NULL,
  "old_value" text,
  "new_value" text,
  "changed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shop_order_events"
ADD CONSTRAINT "shop_order_events_tenant_id_tenants_id_fk"
FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shop_order_events"
ADD CONSTRAINT "shop_order_events_order_id_shop_orders_id_fk"
FOREIGN KEY ("order_id") REFERENCES "public"."shop_orders"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shop_order_change_logs"
ADD CONSTRAINT "shop_order_change_logs_tenant_id_tenants_id_fk"
FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shop_order_change_logs"
ADD CONSTRAINT "shop_order_change_logs_order_id_shop_orders_id_fk"
FOREIGN KEY ("order_id") REFERENCES "public"."shop_orders"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "shop_order_events_tenant_order_event_at_idx"
ON "shop_order_events" USING btree ("tenant_id","order_id","event_at");
--> statement-breakpoint
CREATE INDEX "shop_order_events_order_id_idx"
ON "shop_order_events" USING btree ("order_id");
--> statement-breakpoint
CREATE INDEX "shop_order_change_logs_tenant_order_changed_at_idx"
ON "shop_order_change_logs" USING btree ("tenant_id","order_id","changed_at");
--> statement-breakpoint
CREATE INDEX "shop_order_change_logs_order_id_idx"
ON "shop_order_change_logs" USING btree ("order_id");
