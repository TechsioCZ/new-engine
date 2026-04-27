import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."_locales" AS ENUM('cs', 'en', 'sk', 'pl', 'hu', 'ro', 'sl');
  CREATE TYPE "payload"."enum_articles_status" AS ENUM('draft', 'published', 'archived');
  CREATE TYPE "payload"."enum_pages_visibility" AS ENUM('public', 'customers-only');
  CREATE TYPE "payload"."enum_pages_status" AS ENUM('draft', 'published', 'archived');
  CREATE TABLE "payload"."users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload"."users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"first_name" varchar,
  	"last_name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"enable_a_p_i_key" boolean,
  	"api_key" varchar,
  	"api_key_index" varchar,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "payload"."article_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"translation_sync" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."article_categories_locales" (
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."articles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"content_h_t_m_l" varchar,
  	"featured_image_id" integer NOT NULL,
  	"category_id" integer NOT NULL,
  	"author_id" integer,
  	"published_date" timestamp(3) with time zone NOT NULL,
  	"status" "payload"."enum_articles_status" DEFAULT 'draft' NOT NULL,
  	"reading_time" numeric,
  	"analytics_views" numeric DEFAULT 0,
  	"analytics_shares" numeric DEFAULT 0,
  	"analytics_last_viewed" timestamp(3) with time zone,
  	"translation_sync" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."articles_locales" (
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"excerpt" varchar NOT NULL,
  	"content" jsonb NOT NULL,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."articles_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "payload"."_locales"
  );
  
  CREATE TABLE "payload"."page_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"translation_sync" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."page_categories_locales" (
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"category_id" integer,
  	"content_h_t_m_l" varchar,
  	"visibility" "payload"."enum_pages_visibility" DEFAULT 'public' NOT NULL,
  	"status" "payload"."enum_pages_status" DEFAULT 'draft' NOT NULL,
  	"published_date" timestamp(3) with time zone NOT NULL,
  	"translation_sync" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."pages_locales" (
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"content" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."hero_carousels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL,
  	"button_href" varchar,
  	"translation_sync" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."hero_carousels_locales" (
  	"heading" varchar,
  	"subheading" varchar,
  	"button" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."translation_exclusions_excluded_paths" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"path" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."translation_exclusions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"collection_slug" varchar NOT NULL,
  	"document_id" varchar NOT NULL,
  	"locale" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"article_categories_id" integer,
  	"articles_id" integer,
  	"page_categories_id" integer,
  	"pages_id" integer,
  	"hero_carousels_id" integer,
  	"translation_exclusions_id" integer
  );
  
  CREATE TABLE "payload"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."translation_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"lock_translation_settings" boolean DEFAULT true,
  	"system_prompt" varchar DEFAULT 'You are a professional translator. Translate the JSON object values from {fromLocale} to {toLocale}.' NOT NULL,
  	"translation_rules" varchar DEFAULT 'Rules:
  - Only translate the values, never the keys
  - Preserve the exact JSON structure
  - Do not translate field names like ''id'', ''createdAt'', ''updatedAt'', etc.
  - Maintain formatting, HTML tags, and special characters
  - Return only valid JSON without any markdown formatting or code blocks
  - If a value is already in the target language or is a proper noun, keep it as is' NOT NULL,
  	"model" varchar DEFAULT 'gpt-4o' NOT NULL,
  	"temperature" numeric DEFAULT 0.3 NOT NULL,
  	"max_tokens" numeric,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload"."users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."article_categories_locales" ADD CONSTRAINT "article_categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."article_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."articles" ADD CONSTRAINT "articles_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."articles" ADD CONSTRAINT "articles_category_id_article_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "payload"."article_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."articles" ADD CONSTRAINT "articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."articles_locales" ADD CONSTRAINT "articles_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."articles_locales" ADD CONSTRAINT "articles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."articles_texts" ADD CONSTRAINT "articles_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."page_categories_locales" ADD CONSTRAINT "page_categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."page_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages" ADD CONSTRAINT "pages_category_id_page_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "payload"."page_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_locales" ADD CONSTRAINT "pages_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_locales" ADD CONSTRAINT "pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."hero_carousels" ADD CONSTRAINT "hero_carousels_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."hero_carousels_locales" ADD CONSTRAINT "hero_carousels_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."hero_carousels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."translation_exclusions_excluded_paths" ADD CONSTRAINT "translation_exclusions_excluded_paths_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."translation_exclusions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_article_categories_fk" FOREIGN KEY ("article_categories_id") REFERENCES "payload"."article_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "payload"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_page_categories_fk" FOREIGN KEY ("page_categories_id") REFERENCES "payload"."page_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_hero_carousels_fk" FOREIGN KEY ("hero_carousels_id") REFERENCES "payload"."hero_carousels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_translation_exclusions_fk" FOREIGN KEY ("translation_exclusions_id") REFERENCES "payload"."translation_exclusions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "payload"."users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "payload"."users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "payload"."users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "payload"."users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "payload"."users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "payload"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "payload"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "payload"."media" USING btree ("filename");
  CREATE INDEX "article_categories_updated_at_idx" ON "payload"."article_categories" USING btree ("updated_at");
  CREATE INDEX "article_categories_created_at_idx" ON "payload"."article_categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "article_categories_slug_idx" ON "payload"."article_categories_locales" USING btree ("slug","_locale");
  CREATE UNIQUE INDEX "article_categories_locales_locale_parent_id_unique" ON "payload"."article_categories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "articles_featured_image_idx" ON "payload"."articles" USING btree ("featured_image_id");
  CREATE INDEX "articles_category_idx" ON "payload"."articles" USING btree ("category_id");
  CREATE INDEX "articles_author_idx" ON "payload"."articles" USING btree ("author_id");
  CREATE INDEX "articles_updated_at_idx" ON "payload"."articles" USING btree ("updated_at");
  CREATE INDEX "articles_created_at_idx" ON "payload"."articles" USING btree ("created_at");
  CREATE UNIQUE INDEX "articles_slug_idx" ON "payload"."articles_locales" USING btree ("slug","_locale");
  CREATE INDEX "articles_meta_meta_image_idx" ON "payload"."articles_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "articles_locales_locale_parent_id_unique" ON "payload"."articles_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "articles_texts_order_parent" ON "payload"."articles_texts" USING btree ("order","parent_id");
  CREATE INDEX "articles_texts_locale_parent" ON "payload"."articles_texts" USING btree ("locale","parent_id");
  CREATE INDEX "page_categories_updated_at_idx" ON "payload"."page_categories" USING btree ("updated_at");
  CREATE INDEX "page_categories_created_at_idx" ON "payload"."page_categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "page_categories_slug_idx" ON "payload"."page_categories_locales" USING btree ("slug","_locale");
  CREATE UNIQUE INDEX "page_categories_locales_locale_parent_id_unique" ON "payload"."page_categories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_category_idx" ON "payload"."pages" USING btree ("category_id");
  CREATE INDEX "pages_updated_at_idx" ON "payload"."pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "payload"."pages" USING btree ("created_at");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "payload"."pages_locales" USING btree ("slug","_locale");
  CREATE INDEX "pages_meta_meta_image_idx" ON "payload"."pages_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "pages_locales_locale_parent_id_unique" ON "payload"."pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "hero_carousels_image_idx" ON "payload"."hero_carousels" USING btree ("image_id");
  CREATE INDEX "hero_carousels_updated_at_idx" ON "payload"."hero_carousels" USING btree ("updated_at");
  CREATE INDEX "hero_carousels_created_at_idx" ON "payload"."hero_carousels" USING btree ("created_at");
  CREATE UNIQUE INDEX "hero_carousels_locales_locale_parent_id_unique" ON "payload"."hero_carousels_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "translation_exclusions_excluded_paths_order_idx" ON "payload"."translation_exclusions_excluded_paths" USING btree ("_order");
  CREATE INDEX "translation_exclusions_excluded_paths_parent_id_idx" ON "payload"."translation_exclusions_excluded_paths" USING btree ("_parent_id");
  CREATE INDEX "translation_exclusions_collection_slug_idx" ON "payload"."translation_exclusions" USING btree ("collection_slug");
  CREATE INDEX "translation_exclusions_document_id_idx" ON "payload"."translation_exclusions" USING btree ("document_id");
  CREATE INDEX "translation_exclusions_locale_idx" ON "payload"."translation_exclusions" USING btree ("locale");
  CREATE INDEX "translation_exclusions_updated_at_idx" ON "payload"."translation_exclusions" USING btree ("updated_at");
  CREATE INDEX "translation_exclusions_created_at_idx" ON "payload"."translation_exclusions" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload"."payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_article_categories_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("article_categories_id");
  CREATE INDEX "payload_locked_documents_rels_articles_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("articles_id");
  CREATE INDEX "payload_locked_documents_rels_page_categories_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("page_categories_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_hero_carousels_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("hero_carousels_id");
  CREATE INDEX "payload_locked_documents_rels_translation_exclusions_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("translation_exclusions_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload"."payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload"."payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."users_sessions" CASCADE;
  DROP TABLE "payload"."users" CASCADE;
  DROP TABLE "payload"."media" CASCADE;
  DROP TABLE "payload"."article_categories" CASCADE;
  DROP TABLE "payload"."article_categories_locales" CASCADE;
  DROP TABLE "payload"."articles" CASCADE;
  DROP TABLE "payload"."articles_locales" CASCADE;
  DROP TABLE "payload"."articles_texts" CASCADE;
  DROP TABLE "payload"."page_categories" CASCADE;
  DROP TABLE "payload"."page_categories_locales" CASCADE;
  DROP TABLE "payload"."pages" CASCADE;
  DROP TABLE "payload"."pages_locales" CASCADE;
  DROP TABLE "payload"."hero_carousels" CASCADE;
  DROP TABLE "payload"."hero_carousels_locales" CASCADE;
  DROP TABLE "payload"."translation_exclusions_excluded_paths" CASCADE;
  DROP TABLE "payload"."translation_exclusions" CASCADE;
  DROP TABLE "payload"."payload_kv" CASCADE;
  DROP TABLE "payload"."payload_locked_documents" CASCADE;
  DROP TABLE "payload"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload"."payload_preferences" CASCADE;
  DROP TABLE "payload"."payload_preferences_rels" CASCADE;
  DROP TABLE "payload"."payload_migrations" CASCADE;
  DROP TABLE "payload"."translation_settings" CASCADE;
  DROP TYPE "payload"."_locales";
  DROP TYPE "payload"."enum_articles_status";
  DROP TYPE "payload"."enum_pages_visibility";
  DROP TYPE "payload"."enum_pages_status";`)
}
