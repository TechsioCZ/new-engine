import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'deliver-medusa-cms-invalidation');
  CREATE TYPE "payload"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "payload"."enum_payload_jobs_task_slug" AS ENUM('inline', 'deliver-medusa-cms-invalidation');
  CREATE TABLE "payload"."payload_jobs_log" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "executed_at" timestamp(3) with time zone NOT NULL,
    "completed_at" timestamp(3) with time zone NOT NULL,
    "task_slug" "payload"."enum_payload_jobs_log_task_slug" NOT NULL,
    "task_i_d" varchar NOT NULL,
    "input" jsonb,
    "output" jsonb,
    "state" "payload"."enum_payload_jobs_log_state" NOT NULL,
    "error" jsonb
  );

  CREATE TABLE "payload"."payload_jobs" (
    "id" serial PRIMARY KEY NOT NULL,
    "input" jsonb,
    "completed_at" timestamp(3) with time zone,
    "total_tried" numeric DEFAULT 0,
    "has_error" boolean DEFAULT false,
    "error" jsonb,
    "task_slug" "payload"."enum_payload_jobs_task_slug",
    "queue" varchar DEFAULT 'default',
    "wait_until" timestamp(3) with time zone,
    "processing" boolean DEFAULT false,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM (
        SELECT "_locale"::text AS locale FROM "payload"."article_authors_locales"
        UNION ALL SELECT "_locale"::text FROM "payload"."article_categories_locales"
        UNION ALL SELECT "_locale"::text FROM "payload"."articles_locales"
        UNION ALL SELECT "locale"::text FROM "payload"."articles_texts"
        UNION ALL SELECT "locale"::text FROM "payload"."articles_rels"
        UNION ALL SELECT "_locale"::text FROM "payload"."page_categories_locales"
        UNION ALL SELECT "_locale"::text FROM "payload"."pages_locales"
        UNION ALL SELECT "_locale"::text FROM "payload"."hero_carousels_locales"
      ) localized_content
      WHERE locale IS NOT NULL AND locale NOT IN ('sk', 'cs', 'hu', 'ro')
    ) THEN
      RAISE EXCEPTION 'Unsupported Payload locale rows must be migrated before URL architecture cutover; allowed locales: sk, cs, hu, ro';
    END IF;
  END $$;

  ALTER TABLE "payload"."article_authors_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."article_categories_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."articles_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."articles_texts" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "payload"."articles_rels" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "payload"."page_categories_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."hero_carousels_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  DROP TYPE "payload"."_locales";
  CREATE TYPE "payload"."_locales" AS ENUM('sk', 'cs', 'hu', 'ro');
  ALTER TABLE "payload"."article_authors_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."article_categories_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."articles_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."articles_texts" ALTER COLUMN "locale" SET DATA TYPE "payload"."_locales" USING "locale"::"payload"."_locales";
  ALTER TABLE "payload"."articles_rels" ALTER COLUMN "locale" SET DATA TYPE "payload"."_locales" USING "locale"::"payload"."_locales";
  ALTER TABLE "payload"."page_categories_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."pages_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."hero_carousels_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload"."payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload"."payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload"."payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload"."payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload"."payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload"."payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload"."payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload"."payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload"."payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload"."payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload"."payload_jobs" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."payload_jobs_log" CASCADE;
  DROP TABLE "payload"."payload_jobs" CASCADE;
  ALTER TABLE "payload"."article_authors_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."article_categories_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."articles_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."articles_texts" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "payload"."articles_rels" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "payload"."page_categories_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."hero_carousels_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  DROP TYPE "payload"."_locales";
  CREATE TYPE "payload"."_locales" AS ENUM('cs', 'en', 'sk', 'pl', 'hu', 'ro', 'sl');
  ALTER TABLE "payload"."article_authors_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."article_categories_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."articles_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."articles_texts" ALTER COLUMN "locale" SET DATA TYPE "payload"."_locales" USING "locale"::"payload"."_locales";
  ALTER TABLE "payload"."articles_rels" ALTER COLUMN "locale" SET DATA TYPE "payload"."_locales" USING "locale"::"payload"."_locales";
  ALTER TABLE "payload"."page_categories_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."pages_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."hero_carousels_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  DROP TYPE "payload"."enum_payload_jobs_log_task_slug";
  DROP TYPE "payload"."enum_payload_jobs_log_state";
  DROP TYPE "payload"."enum_payload_jobs_task_slug";`)
}
