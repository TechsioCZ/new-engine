import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."articles_locales" ADD COLUMN "sidebar_promo_image_id" integer;
  ALTER TABLE "payload"."articles_locales" ADD COLUMN "sidebar_product_external_id" varchar;
  ALTER TABLE "payload"."articles_locales" ADD CONSTRAINT "articles_locales_sidebar_promo_image_id_media_id_fk" FOREIGN KEY ("sidebar_promo_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "articles_sidebar_sidebar_promo_image_idx" ON "payload"."articles_locales" USING btree ("sidebar_promo_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."articles_locales" DROP CONSTRAINT "articles_locales_sidebar_promo_image_id_media_id_fk";
  DROP INDEX "payload"."articles_sidebar_sidebar_promo_image_idx";
  ALTER TABLE "payload"."articles_locales" DROP COLUMN "sidebar_promo_image_id";
  ALTER TABLE "payload"."articles_locales" DROP COLUMN "sidebar_product_external_id";`)
}
