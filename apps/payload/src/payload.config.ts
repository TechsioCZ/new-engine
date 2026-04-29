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
import { healthEndpoint } from "./lib/endpoints/health"
import { medusaSsoPostEndpoint } from "./lib/endpoints/medusa-sso"
import { pageCategoriesWithPagesEndpoint } from "./lib/endpoints/page-categories-with-pages"
import { getDocString, getEnv, isEnabled, parseEnvList } from "./lib/utils/env"

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const secret = getEnv("PAYLOAD_SECRET", true)
const databaseUrl = getEnv("DATABASE_URL", true)
const envLocales = parseEnvList("PAYLOAD_LOCALES")
const defaultLocale = envLocales[0]
const isArticlesEnabled = isEnabled("FEATURE_PAYLOAD_ARTICLES_ENABLED")
const isPagesEnabled = isEnabled("FEATURE_PAYLOAD_PAGES_ENABLED")
const isHeroCarouselsEnabled = isEnabled(
  "FEATURE_PAYLOAD_HERO_CAROUSELS_ENABLED"
)
const isAutoTranslateConfigured = Boolean(getEnv("OPENAI_API_KEY"))

const s3Bucket = getEnv("S3_BUCKET", true)
const s3Endpoint = getEnv("S3_ENDPOINT", true)
const s3Region = getEnv("S3_REGION", true)
const s3AccessKeyId = getEnv("S3_ACCESS_KEY_ID", true)
const s3SecretAccessKey = getEnv("S3_SECRET_ACCESS_KEY", true)

/** Payload CMS configuration for the Medusa integration. */
export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  endpoints: [
    healthEndpoint,
    medusaSsoPostEndpoint,
    ...(isPagesEnabled ? [pageCategoriesWithPagesEndpoint] : []),
    ...(isArticlesEnabled ? [articleCategoriesWithArticlesEndpoint] : []),
  ],
  routes: {
    admin: "/",
  },
  i18n: {
    fallbackLanguage: "en",
    supportedLanguages: { en, cs, sk, pl, hu, ro, sl, de, fr, es },
  },
  localization: {
    locales: envLocales ?? ["en"],
    defaultLocale: defaultLocale ?? "en",
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
    schemaName: process.env.PAYLOAD_SCHEMA_NAME,
    push: false,
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
