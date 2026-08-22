import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres"

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload"."articles" DROP CONSTRAINT "articles_featured_image_id_media_id_fk";
    DROP INDEX "payload"."articles_featured_image_idx";

    ALTER TABLE "payload"."articles_locales" ADD COLUMN "featured_image_id" integer;
    ALTER TABLE "payload"."articles_locales" ADD COLUMN "published_date" timestamp(3) with time zone;
    ALTER TABLE "payload"."articles_locales" ADD COLUMN "reading_time" numeric;

    UPDATE "payload"."articles_locales" AS localized
    SET
      "featured_image_id" = article."featured_image_id",
      "published_date" = article."published_date",
      "reading_time" = article."reading_time"
    FROM "payload"."articles" AS article
    WHERE localized."_parent_id" = article."id";

    ALTER TABLE "payload"."articles_locales" ALTER COLUMN "featured_image_id" SET NOT NULL;
    ALTER TABLE "payload"."articles_locales" ALTER COLUMN "published_date" SET NOT NULL;
    ALTER TABLE "payload"."articles_locales" ADD CONSTRAINT "articles_locales_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
    CREATE INDEX "articles_featured_image_idx" ON "payload"."articles_locales" USING btree ("featured_image_id", "_locale");

    ALTER TABLE "payload"."articles" DROP COLUMN "featured_image_id";
    ALTER TABLE "payload"."articles" DROP COLUMN "published_date";
    ALTER TABLE "payload"."articles" DROP COLUMN "reading_time";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload"."articles" ADD COLUMN "featured_image_id" integer;
    ALTER TABLE "payload"."articles" ADD COLUMN "published_date" timestamp(3) with time zone;
    ALTER TABLE "payload"."articles" ADD COLUMN "reading_time" numeric;

    UPDATE "payload"."articles" AS article
    SET
      "featured_image_id" = (
        SELECT localized."featured_image_id"
        FROM "payload"."articles_locales" AS localized
        WHERE localized."_parent_id" = article."id"
        ORDER BY CASE localized."_locale"
          WHEN 'sk' THEN 1
          WHEN 'cs' THEN 2
          WHEN 'hu' THEN 3
          WHEN 'ro' THEN 4
          ELSE 5
        END
        LIMIT 1
      ),
      "published_date" = (
        SELECT localized."published_date"
        FROM "payload"."articles_locales" AS localized
        WHERE localized."_parent_id" = article."id"
        ORDER BY CASE localized."_locale"
          WHEN 'sk' THEN 1
          WHEN 'cs' THEN 2
          WHEN 'hu' THEN 3
          WHEN 'ro' THEN 4
          ELSE 5
        END
        LIMIT 1
      ),
      "reading_time" = (
        SELECT localized."reading_time"
        FROM "payload"."articles_locales" AS localized
        WHERE localized."_parent_id" = article."id"
        ORDER BY CASE localized."_locale"
          WHEN 'sk' THEN 1
          WHEN 'cs' THEN 2
          WHEN 'hu' THEN 3
          WHEN 'ro' THEN 4
          ELSE 5
        END
        LIMIT 1
      );

    ALTER TABLE "payload"."articles" ALTER COLUMN "featured_image_id" SET NOT NULL;
    ALTER TABLE "payload"."articles" ALTER COLUMN "published_date" SET NOT NULL;

    ALTER TABLE "payload"."articles_locales" DROP CONSTRAINT "articles_locales_featured_image_id_media_id_fk";
    DROP INDEX "payload"."articles_featured_image_idx";
    ALTER TABLE "payload"."articles" ADD CONSTRAINT "articles_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
    CREATE INDEX "articles_featured_image_idx" ON "payload"."articles" USING btree ("featured_image_id");

    ALTER TABLE "payload"."articles_locales" DROP COLUMN "featured_image_id";
    ALTER TABLE "payload"."articles_locales" DROP COLUMN "published_date";
    ALTER TABLE "payload"."articles_locales" DROP COLUMN "reading_time";
  `)
}
