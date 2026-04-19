CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" varchar(32) NOT NULL,
	"mimetype" varchar(128) NOT NULL,
	"filename" varchar(255) NOT NULL,
	"extension" varchar(32) NOT NULL,
	"size" bigint DEFAULT 0 NOT NULL,
	"storage_key" text,
	"public_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "attachments_tenant_id_idx" ON "attachments" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "attachments_tenant_deleted_idx" ON "attachments" USING btree ("tenant_id","deleted_at");
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "attachment_entity_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attachment_id" uuid NOT NULL,
	"entity_type" varchar(64) NOT NULL,
	"entity_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachment_entity_links" ADD CONSTRAINT "attachment_entity_links_attachment_id_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."attachments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "attachment_entity_links_entity_attachment_uidx" ON "attachment_entity_links" USING btree ("entity_type","entity_id","attachment_id");
--> statement-breakpoint
CREATE INDEX "attachment_entity_links_entity_idx" ON "attachment_entity_links" USING btree ("entity_type","entity_id");
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cover_attachment_id" uuid;
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_cover_attachment_id_attachments_id_fk" FOREIGN KEY ("cover_attachment_id") REFERENCES "public"."attachments"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
DO $migrate$
DECLARE
	pr record;
	rec record;
	aid uuid;
BEGIN
	FOR pr IN
		SELECT
			"id" AS product_id,
			"tenant_id",
			"image_urls"
		FROM "products"
		WHERE "image_urls" IS NOT NULL
			AND jsonb_typeof("image_urls") = 'array'
			AND jsonb_array_length("image_urls") > 0
	LOOP
		FOR rec IN
			SELECT "value", "ord"
			FROM jsonb_array_elements_text(pr."image_urls") WITH ORDINALITY AS t("value", "ord")
		LOOP
			INSERT INTO "attachments" (
				"id",
				"tenant_id",
				"type",
				"mimetype",
				"filename",
				"extension",
				"size",
				"storage_key",
				"public_url",
				"created_at",
				"updated_at",
				"deleted_at"
			) VALUES (
				gen_random_uuid(),
				pr."tenant_id",
				'image',
				'application/octet-stream',
				left(rec."value", 255),
				'url',
				0::bigint,
				NULL,
				left(rec."value", 2000),
				now(),
				now(),
				NULL
			) RETURNING "id" INTO aid;

			IF rec."ord" = 1 THEN
				UPDATE "products"
				SET "cover_attachment_id" = aid
				WHERE "id" = pr.product_id;
			ELSE
				INSERT INTO "attachment_entity_links" (
					"id",
					"attachment_id",
					"entity_type",
					"entity_id",
					"sort_order",
					"created_at"
				) VALUES (
					gen_random_uuid(),
					aid,
					'product',
					pr.product_id,
					(rec."ord" - 2)::integer,
					now()
				);
			END IF;
		END LOOP;
	END LOOP;
END;
$migrate$;
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "image_urls";
--> statement-breakpoint
CREATE OR REPLACE FUNCTION delete_product_attachment_entity_links()
RETURNS trigger AS $$
BEGIN
	DELETE FROM "attachment_entity_links"
	WHERE "entity_type" = 'product' AND "entity_id" = OLD."id";
	RETURN OLD;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_products_delete_attachment_links
BEFORE DELETE ON "products"
FOR EACH ROW EXECUTE PROCEDURE delete_product_attachment_entity_links();
