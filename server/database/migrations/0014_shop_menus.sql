CREATE TABLE "shop_menus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"link_type" varchar(16) DEFAULT 'custom' NOT NULL,
	"page_id" uuid,
	"custom_url" text,
	"target" varchar(16) DEFAULT '_self' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shop_menus" ADD CONSTRAINT "shop_menus_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shop_menus" ADD CONSTRAINT "shop_menus_parent_id_shop_menus_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."shop_menus"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shop_menus" ADD CONSTRAINT "shop_menus_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shop_menus" ADD CONSTRAINT "shop_menus_link_type_check" CHECK ("shop_menus"."link_type" IN ('page', 'custom'));
--> statement-breakpoint
ALTER TABLE "shop_menus" ADD CONSTRAINT "shop_menus_target_check" CHECK ("shop_menus"."target" IN ('_self', '_blank'));
--> statement-breakpoint
ALTER TABLE "shop_menus" ADD CONSTRAINT "shop_menus_link_reference_check" CHECK (
  ("shop_menus"."link_type" = 'page' AND "shop_menus"."page_id" IS NOT NULL)
  OR
  ("shop_menus"."link_type" = 'custom' AND "shop_menus"."custom_url" IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX "shop_menus_tenant_parent_sort_idx" ON "shop_menus" USING btree ("tenant_id","parent_id","sort_order");
--> statement-breakpoint
CREATE INDEX "shop_menus_tenant_visible_idx" ON "shop_menus" USING btree ("tenant_id","is_visible");
--> statement-breakpoint
CREATE INDEX "shop_menus_tenant_page_idx" ON "shop_menus" USING btree ("tenant_id","page_id");
