import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "payload"."article_authors" (
	    "id" serial PRIMARY KEY NOT NULL,
	    "display_name" varchar NOT NULL,
	    "slug" varchar NOT NULL,
	    "portrait_id" integer,
	    "translation_sync" boolean DEFAULT false,
	    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "payload"."article_authors_locales" (
	    "role" varchar,
	    "bio" varchar,
	    "id" serial PRIMARY KEY NOT NULL,
	    "_locale" "payload"."_locales" NOT NULL,
	    "_parent_id" integer NOT NULL
  );

  ALTER TABLE "payload"."articles" ADD COLUMN "article_author_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "article_authors_id" integer;
  ALTER TABLE "payload"."article_authors" ADD CONSTRAINT "article_authors_portrait_id_media_id_fk" FOREIGN KEY ("portrait_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."article_authors_locales" ADD CONSTRAINT "article_authors_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."article_authors"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "article_authors_slug_idx" ON "payload"."article_authors" USING btree ("slug");
  CREATE INDEX "article_authors_portrait_idx" ON "payload"."article_authors" USING btree ("portrait_id");
  CREATE INDEX "article_authors_updated_at_idx" ON "payload"."article_authors" USING btree ("updated_at");
  CREATE INDEX "article_authors_created_at_idx" ON "payload"."article_authors" USING btree ("created_at");
  CREATE UNIQUE INDEX "article_authors_locales_locale_parent_id_unique" ON "payload"."article_authors_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload"."articles" ADD CONSTRAINT "articles_article_author_id_article_authors_id_fk" FOREIGN KEY ("article_author_id") REFERENCES "payload"."article_authors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_article_authors_fk" FOREIGN KEY ("article_authors_id") REFERENCES "payload"."article_authors"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "articles_article_author_idx" ON "payload"."articles" USING btree ("article_author_id");
  CREATE INDEX "payload_locked_documents_rels_article_authors_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("article_authors_id");
  INSERT INTO "payload"."article_authors" ("display_name", "slug") VALUES ('Herbatika redakcia', 'herbatika-redakcia');
  UPDATE "payload"."articles" SET "article_author_id" = (SELECT "id" FROM "payload"."article_authors" WHERE "slug" = 'herbatika-redakcia') WHERE "article_author_id" IS NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."articles" DROP CONSTRAINT "articles_article_author_id_article_authors_id_fk";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_article_authors_fk";
  DROP INDEX "payload"."articles_article_author_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_article_authors_id_idx";
  ALTER TABLE "payload"."articles" DROP COLUMN "article_author_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "article_authors_id";
  DROP TABLE "payload"."article_authors_locales";
  DROP TABLE "payload"."article_authors";`)
}
