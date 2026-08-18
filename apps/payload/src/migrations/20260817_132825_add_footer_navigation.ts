import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_footer_navigation_blocks_cms_page_link_slot" AS ENUM('blog', 'about', 'faq', 'gift_voucher', 'brands', 'reviews', 'shipping_payment', 'claims_returns', 'terms', 'privacy', 'cookies', 'affiliate', 'wholesale', 'dropshipping', 'private_label');
  CREATE TYPE "payload"."enum_footer_navigation_blocks_app_route_link_slot" AS ENUM('blog', 'about', 'faq', 'gift_voucher', 'brands', 'reviews', 'shipping_payment', 'claims_returns', 'terms', 'privacy', 'cookies', 'affiliate', 'wholesale', 'dropshipping', 'private_label');
  CREATE TYPE "payload"."enum_footer_navigation_blocks_external_link_slot" AS ENUM('blog', 'about', 'faq', 'gift_voucher', 'brands', 'reviews', 'shipping_payment', 'claims_returns', 'terms', 'privacy', 'cookies', 'affiliate', 'wholesale', 'dropshipping', 'private_label');
  CREATE TYPE "payload"."enum_footer_navigation_columns_slot" AS ENUM('information', 'important', 'partners');
  CREATE TABLE "payload"."footer_navigation_blocks_cms_page_link" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "_path" text NOT NULL,
    "_locale" "payload"."_locales" NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "slot" "payload"."enum_footer_navigation_blocks_cms_page_link_slot" NOT NULL,
    "page_id" integer,
    "block_name" varchar
  );

  CREATE TABLE "payload"."footer_navigation_blocks_app_route_link" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "_path" text NOT NULL,
    "_locale" "payload"."_locales" NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "slot" "payload"."enum_footer_navigation_blocks_app_route_link_slot" NOT NULL,
    "path" varchar NOT NULL,
    "block_name" varchar
  );

  CREATE TABLE "payload"."footer_navigation_blocks_external_link" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "_path" text NOT NULL,
    "_locale" "payload"."_locales" NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "slot" "payload"."enum_footer_navigation_blocks_external_link_slot" NOT NULL,
    "url" varchar NOT NULL,
    "new_tab" boolean DEFAULT true,
    "block_name" varchar
  );

  CREATE TABLE "payload"."footer_navigation_columns" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "_locale" "payload"."_locales" NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "slot" "payload"."enum_footer_navigation_columns_slot" NOT NULL
  );

  CREATE TABLE "payload"."footer_navigation" (
    "id" serial PRIMARY KEY NOT NULL,
    "updated_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone
  );

  ALTER TABLE "payload"."footer_navigation_blocks_cms_page_link" ADD CONSTRAINT "footer_navigation_blocks_cms_page_link_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."footer_navigation_blocks_cms_page_link" ADD CONSTRAINT "footer_navigation_blocks_cms_page_link_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."footer_navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."footer_navigation_blocks_app_route_link" ADD CONSTRAINT "footer_navigation_blocks_app_route_link_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."footer_navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."footer_navigation_blocks_external_link" ADD CONSTRAINT "footer_navigation_blocks_external_link_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."footer_navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."footer_navigation_columns" ADD CONSTRAINT "footer_navigation_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."footer_navigation"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "footer_navigation_blocks_cms_page_link_order_idx" ON "payload"."footer_navigation_blocks_cms_page_link" USING btree ("_order");
  CREATE INDEX "footer_navigation_blocks_cms_page_link_parent_id_idx" ON "payload"."footer_navigation_blocks_cms_page_link" USING btree ("_parent_id");
  CREATE INDEX "footer_navigation_blocks_cms_page_link_path_idx" ON "payload"."footer_navigation_blocks_cms_page_link" USING btree ("_path");
  CREATE INDEX "footer_navigation_blocks_cms_page_link_locale_idx" ON "payload"."footer_navigation_blocks_cms_page_link" USING btree ("_locale");
  CREATE INDEX "footer_navigation_blocks_cms_page_link_page_idx" ON "payload"."footer_navigation_blocks_cms_page_link" USING btree ("page_id");
  CREATE INDEX "footer_navigation_blocks_app_route_link_order_idx" ON "payload"."footer_navigation_blocks_app_route_link" USING btree ("_order");
  CREATE INDEX "footer_navigation_blocks_app_route_link_parent_id_idx" ON "payload"."footer_navigation_blocks_app_route_link" USING btree ("_parent_id");
  CREATE INDEX "footer_navigation_blocks_app_route_link_path_idx" ON "payload"."footer_navigation_blocks_app_route_link" USING btree ("_path");
  CREATE INDEX "footer_navigation_blocks_app_route_link_locale_idx" ON "payload"."footer_navigation_blocks_app_route_link" USING btree ("_locale");
  CREATE INDEX "footer_navigation_blocks_external_link_order_idx" ON "payload"."footer_navigation_blocks_external_link" USING btree ("_order");
  CREATE INDEX "footer_navigation_blocks_external_link_parent_id_idx" ON "payload"."footer_navigation_blocks_external_link" USING btree ("_parent_id");
  CREATE INDEX "footer_navigation_blocks_external_link_path_idx" ON "payload"."footer_navigation_blocks_external_link" USING btree ("_path");
  CREATE INDEX "footer_navigation_blocks_external_link_locale_idx" ON "payload"."footer_navigation_blocks_external_link" USING btree ("_locale");
  CREATE INDEX "footer_navigation_columns_order_idx" ON "payload"."footer_navigation_columns" USING btree ("_order");
  CREATE INDEX "footer_navigation_columns_parent_id_idx" ON "payload"."footer_navigation_columns" USING btree ("_parent_id");
  CREATE INDEX "footer_navigation_columns_locale_idx" ON "payload"."footer_navigation_columns" USING btree ("_locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."footer_navigation_blocks_cms_page_link" CASCADE;
  DROP TABLE "payload"."footer_navigation_blocks_app_route_link" CASCADE;
  DROP TABLE "payload"."footer_navigation_blocks_external_link" CASCADE;
  DROP TABLE "payload"."footer_navigation_columns" CASCADE;
  DROP TABLE "payload"."footer_navigation" CASCADE;
  DROP TYPE "payload"."enum_footer_navigation_blocks_cms_page_link_slot";
  DROP TYPE "payload"."enum_footer_navigation_blocks_app_route_link_slot";
  DROP TYPE "payload"."enum_footer_navigation_blocks_external_link_slot";
  DROP TYPE "payload"."enum_footer_navigation_columns_slot";`)
}
