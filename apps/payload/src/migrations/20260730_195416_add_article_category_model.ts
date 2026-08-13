import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres"

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE "payload"."articles_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "article_categories_id" integer
  );

  ALTER TABLE "payload"."articles" ADD COLUMN "primary_category_id" integer;
  ALTER TABLE "payload"."articles_rels" ADD CONSTRAINT "articles_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."articles_rels" ADD CONSTRAINT "articles_rels_article_categories_fk" FOREIGN KEY ("article_categories_id") REFERENCES "payload"."article_categories"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "articles_rels_order_idx" ON "payload"."articles_rels" USING btree ("order");
  CREATE INDEX "articles_rels_parent_idx" ON "payload"."articles_rels" USING btree ("parent_id");
  CREATE INDEX "articles_rels_path_idx" ON "payload"."articles_rels" USING btree ("path");
  CREATE INDEX "articles_rels_article_categories_id_idx" ON "payload"."articles_rels" USING btree ("article_categories_id");
  ALTER TABLE "payload"."articles" ADD CONSTRAINT "articles_primary_category_id_article_categories_id_fk" FOREIGN KEY ("primary_category_id") REFERENCES "payload"."article_categories"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "articles_primary_category_idx" ON "payload"."articles" USING btree ("primary_category_id");

  UPDATE "payload"."articles"
  SET "primary_category_id" = "category_id"
  WHERE "primary_category_id" IS NULL;

  INSERT INTO "payload"."articles_rels" ("order", "parent_id", "path", "article_categories_id")
  SELECT 1, "id", 'categories', "category_id"
  FROM "payload"."articles"
  WHERE "category_id" IS NOT NULL;

  ALTER TABLE "payload"."articles" ALTER COLUMN "primary_category_id" SET NOT NULL;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload"."articles_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."articles_rels" CASCADE;
  ALTER TABLE "payload"."articles" DROP CONSTRAINT "articles_primary_category_id_article_categories_id_fk";
  DROP INDEX "payload"."articles_primary_category_idx";
  ALTER TABLE "payload"."articles" DROP COLUMN "primary_category_id";
  `)
}
