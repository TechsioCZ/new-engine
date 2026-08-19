import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_hero_carousels_button_target_target_type" AS ENUM('entity', 'static');
  CREATE TYPE "payload"."enum_hero_carousels_button_target_source_system" AS ENUM('medusa', 'payload');
  CREATE TYPE "payload"."enum_hero_carousels_button_target_source_type" AS ENUM('article', 'brand', 'category', 'collection', 'page', 'product');
  CREATE TYPE "payload"."enum_hero_carousels_button_target_static_route_key" AS ENUM('root:about', 'root:contact', 'root:faq', 'root:shipping', 'root:returns', 'root:terms', 'root:privacy', 'root:cookies');
  ALTER TABLE "payload"."hero_carousels" ADD COLUMN "button_target_target_type" "payload"."enum_hero_carousels_button_target_target_type";
  ALTER TABLE "payload"."hero_carousels" ADD COLUMN "button_target_source_system" "payload"."enum_hero_carousels_button_target_source_system";
  ALTER TABLE "payload"."hero_carousels" ADD COLUMN "button_target_source_type" "payload"."enum_hero_carousels_button_target_source_type";
  ALTER TABLE "payload"."hero_carousels" ADD COLUMN "button_target_source_id" varchar;
  ALTER TABLE "payload"."hero_carousels" ADD COLUMN "button_target_static_route_key" "payload"."enum_hero_carousels_button_target_static_route_key";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."hero_carousels" DROP COLUMN "button_target_target_type";
  ALTER TABLE "payload"."hero_carousels" DROP COLUMN "button_target_source_system";
  ALTER TABLE "payload"."hero_carousels" DROP COLUMN "button_target_source_type";
  ALTER TABLE "payload"."hero_carousels" DROP COLUMN "button_target_source_id";
  ALTER TABLE "payload"."hero_carousels" DROP COLUMN "button_target_static_route_key";
  DROP TYPE "payload"."enum_hero_carousels_button_target_target_type";
  DROP TYPE "payload"."enum_hero_carousels_button_target_source_system";
  DROP TYPE "payload"."enum_hero_carousels_button_target_source_type";
  DROP TYPE "payload"."enum_hero_carousels_button_target_static_route_key";`)
}
