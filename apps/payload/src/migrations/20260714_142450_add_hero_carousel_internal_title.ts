import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."article_categories" ALTER COLUMN "translation_sync" SET DEFAULT false;
  ALTER TABLE "payload"."articles" ALTER COLUMN "translation_sync" SET DEFAULT false;
  ALTER TABLE "payload"."page_categories" ALTER COLUMN "translation_sync" SET DEFAULT false;
  ALTER TABLE "payload"."pages" ALTER COLUMN "translation_sync" SET DEFAULT false;
  ALTER TABLE "payload"."pages_locales" ALTER COLUMN "content" SET NOT NULL;
  ALTER TABLE "payload"."hero_carousels" ALTER COLUMN "translation_sync" SET DEFAULT false;
  ALTER TABLE "payload"."hero_carousels" ADD COLUMN "internal_title" varchar;
  UPDATE "payload"."hero_carousels" AS "hero"
  SET "internal_title" = COALESCE(
    (
      SELECT NULLIF(BTRIM("localized"."heading"), '')
      FROM "payload"."hero_carousels_locales" AS "localized"
      WHERE "localized"."_parent_id" = "hero"."id"
        AND NULLIF(BTRIM("localized"."heading"), '') IS NOT NULL
      ORDER BY
        CASE "localized"."_locale"::text
          WHEN 'en' THEN 0
          WHEN 'sk' THEN 1
          WHEN 'cs' THEN 2
          ELSE 3
        END,
        "localized"."id"
      LIMIT 1
    ),
    (
      SELECT NULLIF(BTRIM("localized"."button"), '')
      FROM "payload"."hero_carousels_locales" AS "localized"
      WHERE "localized"."_parent_id" = "hero"."id"
        AND NULLIF(BTRIM("localized"."button"), '') IS NOT NULL
      ORDER BY
        CASE "localized"."_locale"::text
          WHEN 'en' THEN 0
          WHEN 'sk' THEN 1
          WHEN 'cs' THEN 2
          ELSE 3
        END,
        "localized"."id"
      LIMIT 1
    ),
    NULLIF(BTRIM("hero"."button_href"), ''),
    'Hero banner'
  );
  ALTER TABLE "payload"."hero_carousels" ALTER COLUMN "internal_title" SET NOT NULL;`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."article_categories" ALTER COLUMN "translation_sync" SET DEFAULT true;
  ALTER TABLE "payload"."articles" ALTER COLUMN "translation_sync" SET DEFAULT true;
  ALTER TABLE "payload"."page_categories" ALTER COLUMN "translation_sync" SET DEFAULT true;
  ALTER TABLE "payload"."pages" ALTER COLUMN "translation_sync" SET DEFAULT true;
  ALTER TABLE "payload"."pages_locales" ALTER COLUMN "content" DROP NOT NULL;
  ALTER TABLE "payload"."hero_carousels" ALTER COLUMN "translation_sync" SET DEFAULT true;
  ALTER TABLE "payload"."hero_carousels" DROP COLUMN "internal_title";`)
}
