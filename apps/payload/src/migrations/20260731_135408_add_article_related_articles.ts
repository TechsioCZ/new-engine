import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "payload"."articles_rels_article_categories_id_idx";
  ALTER TABLE "payload"."articles_rels" ADD COLUMN "locale" "payload"."_locales";
  ALTER TABLE "payload"."articles_rels" ADD COLUMN "articles_id" integer;
  ALTER TABLE "payload"."articles_rels" ADD CONSTRAINT "articles_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "payload"."articles"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "articles_rels_locale_idx" ON "payload"."articles_rels" USING btree ("locale");
  CREATE INDEX "articles_rels_articles_id_idx" ON "payload"."articles_rels" USING btree ("articles_id","locale");
  CREATE INDEX "articles_rels_article_categories_id_idx" ON "payload"."articles_rels" USING btree ("article_categories_id","locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."articles_rels" DROP CONSTRAINT "articles_rels_articles_fk";

  DROP INDEX "payload"."articles_rels_locale_idx";
  DROP INDEX "payload"."articles_rels_articles_id_idx";
  DROP INDEX "payload"."articles_rels_article_categories_id_idx";
  CREATE INDEX "articles_rels_article_categories_id_idx" ON "payload"."articles_rels" USING btree ("article_categories_id");
  ALTER TABLE "payload"."articles_rels" DROP COLUMN "locale";
  ALTER TABLE "payload"."articles_rels" DROP COLUMN "articles_id";`)
}
