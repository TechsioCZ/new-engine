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
  ALTER TABLE "payload"."hero_carousels" ADD COLUMN "button_target_static_route_key" "payload"."enum_hero_carousels_button_target_static_route_key";

  UPDATE "payload"."hero_carousels"
  SET
    "button_target_target_type" = 'static',
    "button_target_static_route_key" = CASE regexp_replace(
      split_part(split_part(lower(trim("button_href")), '#', 1), '?', 1),
      '/+$',
      ''
    )
      WHEN '/o-nas' THEN 'root:about'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/rolunk' THEN 'root:about'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/despre-noi' THEN 'root:about'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/kontakt' THEN 'root:contact'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/kapcsolat' THEN 'root:contact'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/contact' THEN 'root:contact'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/casto-kladene-otazky' THEN 'root:faq'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/caste-dotazy' THEN 'root:faq'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/gyakori-kerdesek' THEN 'root:faq'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/intrebari-frecvente' THEN 'root:faq'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/doprava' THEN 'root:shipping'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/szallitas' THEN 'root:shipping'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/livrare' THEN 'root:shipping'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/vratenie-tovaru' THEN 'root:returns'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/vraceni-zbozi' THEN 'root:returns'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/visszakuldes' THEN 'root:returns'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/retururi' THEN 'root:returns'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/obchodne-podmienky' THEN 'root:terms'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/obchodni-podminky' THEN 'root:terms'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/altalanos-szerzodesi-feltetelek' THEN 'root:terms'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/termeni-si-conditii' THEN 'root:terms'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/ochrana-osobnych-udajov' THEN 'root:privacy'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/ochrana-osobnich-udaju' THEN 'root:privacy'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/adatvedelmi-tajekoztato' THEN 'root:privacy'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/politica-de-confidentialitate' THEN 'root:privacy'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/cookies' THEN 'root:cookies'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/cookie-tajekoztato' THEN 'root:cookies'::"payload"."enum_hero_carousels_button_target_static_route_key"
      WHEN '/politica-cookies' THEN 'root:cookies'::"payload"."enum_hero_carousels_button_target_static_route_key"
    END
  WHERE "button_href" IS NOT NULL
    AND regexp_replace(
      split_part(split_part(lower(trim("button_href")), '#', 1), '?', 1),
      '/+$',
      ''
    ) IN (
      '/o-nas', '/rolunk', '/despre-noi',
      '/kontakt', '/kapcsolat', '/contact',
      '/casto-kladene-otazky', '/caste-dotazy', '/gyakori-kerdesek', '/intrebari-frecvente',
      '/doprava', '/szallitas', '/livrare',
      '/vratenie-tovaru', '/vraceni-zbozi', '/visszakuldes', '/retururi',
      '/obchodne-podmienky', '/obchodni-podminky', '/altalanos-szerzodesi-feltetelek', '/termeni-si-conditii',
      '/ochrana-osobnych-udajov', '/ochrana-osobnich-udaju', '/adatvedelmi-tajekoztato', '/politica-de-confidentialitate',
      '/cookies', '/cookie-tajekoztato', '/politica-cookies'
    );`)
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
