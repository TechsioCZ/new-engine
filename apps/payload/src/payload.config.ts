import path from "node:path"
import { fileURLToPath } from "node:url"

import { postgresAdapter } from "@payloadcms/db-postgres"
import { seoPlugin } from "@payloadcms/plugin-seo"
import { lexicalEditor } from "@payloadcms/richtext-lexical"
import { s3Storage } from "@payloadcms/storage-s3"
import { cs } from "@payloadcms/translations/languages/cs"
import { de } from "@payloadcms/translations/languages/de"
import { en } from "@payloadcms/translations/languages/en"
import { es } from "@payloadcms/translations/languages/es"
import { fr } from "@payloadcms/translations/languages/fr"
import { hu } from "@payloadcms/translations/languages/hu"
import { pl } from "@payloadcms/translations/languages/pl"
import { ro } from "@payloadcms/translations/languages/ro"
import { sk } from "@payloadcms/translations/languages/sk"
import { sl } from "@payloadcms/translations/languages/sl"
import { autoTranslate } from "@pigment/auto-translate"
import { buildConfig } from "payload"
import sharp from "sharp"

import { ArticleCategories } from "./collections/article-categories"
import { Articles } from "./collections/articles"
import { HeroCarousels } from "./collections/hero-carousels"
import { Media } from "./collections/media"
import { PageCategories } from "./collections/page-categories"
import { Pages } from "./collections/pages"
import { Users } from "./collections/users"
import { articleCategoriesWithArticlesEndpoint } from "./lib/endpoints/article-categories-with-articles"
import { articleImportEndpoint } from "./lib/endpoints/article-import"
import { healthEndpoint } from "./lib/endpoints/health"
import { medusaSsoPostEndpoint } from "./lib/endpoints/medusa-sso"
import { pageCategoriesWithPagesEndpoint } from "./lib/endpoints/page-categories-with-pages"
import {
  getDocString,
  getEnv,
  isEnabled,
  resolveEnvLocales,
} from "./lib/utils/env"
import { migrations } from "./migrations"

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const isProductionBuild = getEnv("PAYLOAD_PRODUCTION_BUILD") === "1"
const getRuntimeEnv = (name: string, buildFallback: string): string => {
  const value = getEnv(name)
  if (value?.trim()) {
    return value
  }
  if (isProductionBuild) {
    return buildFallback
  }
  throw new Error(`Missing required environment variable: ${name}`)
}

const secret = getRuntimeEnv(
  "PAYLOAD_SECRET",
  "payload-production-build-placeholder-secret"
)
const databaseUrl = getRuntimeEnv(
  "DATABASE_URL",
  "postgresql://payload:payload@127.0.0.1:5432/payload"
)
const { locales, defaultLocale } = resolveEnvLocales("PAYLOAD_LOCALES", ["en"])
const isArticlesEnabled = isEnabled("FEATURE_PAYLOAD_ARTICLES_ENABLED")
const isPagesEnabled = isEnabled("FEATURE_PAYLOAD_PAGES_ENABLED")
const isHeroCarouselsEnabled = isEnabled(
  "FEATURE_PAYLOAD_HERO_CAROUSELS_ENABLED"
)
const isAutoTranslateConfigured = Boolean(getEnv("OPENAI_API_KEY"))

const s3Bucket = getRuntimeEnv("S3_BUCKET", "payload-build")
const s3Endpoint = getRuntimeEnv("S3_ENDPOINT", "http://127.0.0.1:9000")
const s3Region = getRuntimeEnv("S3_REGION", "us-east-1")
const s3AccessKeyId = getRuntimeEnv("S3_ACCESS_KEY_ID", "payload-build")
const s3SecretAccessKey = getRuntimeEnv(
  "S3_SECRET_ACCESS_KEY",
  "payload-build-secret"
)

/** Payload CMS configuration for the Medusa integration. */
export default buildConfig({
  admin: {
    user: Users.slug,
    theme: "dark",
    importMap: {
      baseDir: path.resolve(dirname),
    },
    ...(isArticlesEnabled
      ? {
          components: {
            beforeNavLinks: ["/components/admin/payload-import-nav"],
          },
        }
      : {}),
  },
  endpoints: [
    healthEndpoint,
    medusaSsoPostEndpoint,
    ...(isPagesEnabled ? [pageCategoriesWithPagesEndpoint] : []),
    ...(isArticlesEnabled ? [articleCategoriesWithArticlesEndpoint] : []),
    ...(isArticlesEnabled ? [articleImportEndpoint] : []),
  ],
  routes: {
    admin: "/",
  },
  i18n: {
    fallbackLanguage: "en",
    supportedLanguages: { en, cs, sk, pl, hu, ro, sl, de, fr, es },
  },
  localization: {
    locales,
    defaultLocale,
  },
  collections: [
    Users,
    Media,
    ...(isArticlesEnabled ? [ArticleCategories, Articles] : []),
    ...(isPagesEnabled ? [PageCategories, Pages] : []),
    ...(isHeroCarouselsEnabled ? [HeroCarousels] : []),
  ],
  editor: lexicalEditor(),
  secret,
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    pool: {
      connectionString: databaseUrl,
    },
    ...(process.env["PAYLOAD_SCHEMA_NAME"]
      ? { schemaName: process.env["PAYLOAD_SCHEMA_NAME"] }
      : {}),
    push: false,
    prodMigrations: migrations,
  }),
  sharp,
  plugins: [
    seoPlugin({
      collections: [
        ...(isArticlesEnabled ? ["articles"] : []),
        ...(isPagesEnabled ? ["pages"] : []),
      ],
      uploadsCollection: "media",
      tabbedUI: true,
      generateTitle: ({ doc }) => getDocString(doc?.title),
      generateDescription: ({ doc }) =>
        getDocString(doc?.excerpt) || getDocString(doc?.description),
    }),
    autoTranslate({
      excludeFields: [
        "id",
        "_id",
        "createdAt",
        "updatedAt",
        "status",
        "author",
        "featuredImage",
        "readingTime",
        "analytics",
        "image",
      ],
      collections: {
        articles: isArticlesEnabled,
        pages: isPagesEnabled,
        "article-categories": isArticlesEnabled,
        "page-categories": isPagesEnabled,
        "hero-carousels": isHeroCarouselsEnabled,
      },
      enableTranslationSyncByDefault: isAutoTranslateConfigured,
      translationExclusionsSlug: "translation-exclusions",
      enableExclusions: true,
    }),
    s3Storage({
      collections: {
        media: true,
      },
      bucket: s3Bucket,
      config: {
        endpoint: s3Endpoint,
        region: s3Region,
        credentials: {
          accessKeyId: s3AccessKeyId,
          secretAccessKey: s3SecretAccessKey,
        },
        forcePathStyle: true,
      },
    }),
  ],
})
