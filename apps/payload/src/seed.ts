import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import {
  type CollectionSlug,
  getPayload,
  type RequiredDataFromCollectionSlug,
} from "payload"
import { resolveEnvLocales } from "./lib/utils/env"
import config from "./payload.config"
import type { Article } from "./payload-types"
import {
  type ArticleImportOptions,
  runImportFromFile,
} from "./scripts/import-articles"

type SeedPayload = Awaited<ReturnType<typeof getPayload>>
type PayloadId = number
type SeedRichText = Article["content"]
type SeedDoc = {
  id?: PayloadId
  title?: string | Record<string, string>
  heading?: string | Record<string, string>
}
type HerbaticaProductSeedItem = {
  title: string
  slug: string
  excerpt: string
  content: SeedRichText
  categoryTitle: string
  categorySlug: string
  tags: string[]
  publishedDate: string
}

const requireEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

const SEED_ADMIN_EMAIL = requireEnv("PAYLOAD_SSO_USER_EMAIL")
const SEED_ADMIN_API_KEY = requireEnv("PAYLOAD_API_KEY")
const SSO_PRIVATE_KEY = requireEnv("PAYLOAD_SSO_PRIVATE_KEY")

const normalizeKey = (value: string) => value.replace(/\\n/g, "\n").trim()

const deriveSeedPassword = (privateKey: string) =>
  createHash("sha256").update(normalizeKey(privateKey)).digest("hex")

const SEED_ADMIN_PASSWORD = deriveSeedPassword(SSO_PRIVATE_KEY)

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lNnJYQAAAABJRU5ErkJggg==",
  "base64"
)

const DEFAULT_HERBATICA_PRODUCTS_XML_PATH = fileURLToPath(
  new URL(
    "../../medusa-be/src/scripts/seed-files/productsComplete.xml",
    import.meta.url
  )
)
const HERBATICA_PRODUCTS_XML_ENV = "HERBATICA_XML_PATH"
const PAYLOAD_SEED_HERBATICA_PRODUCTS_ENABLED_ENV =
  "PAYLOAD_SEED_HERBATICA_PRODUCTS_ENABLED"
const PAYLOAD_SEED_HERBATICA_PRODUCTS_LIMIT_ENV =
  "PAYLOAD_SEED_HERBATICA_PRODUCTS_LIMIT"
const HERBATICA_BLOG_ARTICLES_XLSX_ENV = "HERBATICA_BLOG_ARTICLES_XLSX_PATH"
const PAYLOAD_SEED_ARTICLES_XLSX_ENV = "PAYLOAD_SEED_ARTICLES_XLSX_PATH"
const PAYLOAD_SEED_ARTICLES_SHEET_ENV = "PAYLOAD_SEED_ARTICLES_SHEET"
const PAYLOAD_SEED_ARTICLES_LOCALE_ENV = "PAYLOAD_SEED_ARTICLES_LOCALE"
const PAYLOAD_SEED_ARTICLES_STATUS_ENV = "PAYLOAD_SEED_ARTICLES_STATUS"
const PAYLOAD_SEED_ARTICLES_TRANSLATE_ENV = "PAYLOAD_SEED_ARTICLES_TRANSLATE"
const PAYLOAD_SEED_ARTICLES_OVERWRITE_ENV = "PAYLOAD_SEED_ARTICLES_OVERWRITE"
const DEFAULT_PAYLOAD_LOCALES = ["cs", "sk", "en"]
const HTTP_SOURCE_PATTERN = /^https?:\/\//i
const TAG_SEPARATOR_PATTERN = /[,;]+/
const HTML_TAG_PATTERN = /<[^>]+>/g
const LEADING_CATEGORY_SEPARATOR_PATTERN = /^>+/
const RICH_TEXT_PARAGRAPH_SEPARATOR_PATTERN = /\n{1,}/
const SEED_PUBLISHED_DATE = "2026-01-01T00:00:00.000Z"

const XML_ENTITY_MAP: Record<string, string> = {
  "&quot;": '"',
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&nbsp;": " ",
}

const isEnabled = (value: string | undefined): boolean =>
  value === undefined ||
  ["1", "true", "yes", "on"].includes(value.toLowerCase())

const isExplicitlyEnabled = (value: string | undefined): boolean =>
  value !== undefined &&
  ["1", "true", "yes", "on"].includes(value.toLowerCase())

const normalizeInlineText = (value: string | undefined) => {
  const normalized = value?.replace(/\r\n/g, "\n").trim()
  if (!normalized) {
    return
  }

  return normalized.replace(/\s+/g, " ").trim()
}

const decodeXml = (value: string) =>
  value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
      const parsed = Number.parseInt(hex, 16)
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : match
    })
    .replace(/&#([0-9]+);/g, (match, num) => {
      const parsed = Number.parseInt(num, 10)
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : match
    })
    .replace(
      /&quot;|&apos;|&lt;|&gt;|&amp;|&nbsp;/g,
      (entity) => XML_ENTITY_MAP[entity] ?? entity
    )

const decodeText = (value: string | undefined) => {
  if (value === undefined) {
    return
  }

  return normalizeInlineText(decodeXml(value))
}

const decodeHtmlToText = (value: string | undefined) => {
  if (value === undefined) {
    return
  }

  return decodeXml(value)
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(HTML_TAG_PATTERN, " ")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim()
}

const parseAttributes = (value: string | undefined) => {
  const attributes: Record<string, string> = {}
  if (!value) {
    return attributes
  }

  for (const match of value.matchAll(/([:\w-]+)\s*=\s*"([^"]*)"/g)) {
    const key = normalizeInlineText(match[1])
    if (key) {
      attributes[key] = decodeXml(match[2] ?? "")
    }
  }

  return attributes
}

const extractXmlElements = (source: string, tag: string) => {
  const regex = new RegExp(`<${tag}(\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "g")
  return [...source.matchAll(regex)].map((match) => ({
    attributes: parseAttributes(match[1]),
    inner: match[2] ?? "",
  }))
}

const extractFirstElementContent = (source: string, tag: string) => {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`)
  return source.match(regex)?.[1]
}

const extractFirstText = (source: string, tag: string) =>
  decodeText(extractFirstElementContent(source, tag))

const splitCategoryPath = (value: string | undefined) =>
  (value ?? "")
    .split(">")
    .map((part) =>
      normalizeInlineText(part.replace(LEADING_CATEGORY_SEPARATOR_PATTERN, ""))
    )
    .filter((part): part is string => Boolean(part))

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const truncateWithHash = (value: string, maxLength = 90) => {
  if (value.length <= maxLength) {
    return value
  }

  const hash = createHash("sha1").update(value).digest("hex").slice(0, 8)
  return `${value.slice(0, maxLength - hash.length - 1).replace(/-+$/g, "")}-${hash}`
}

const buildSlug = (value: string, fallback: string) =>
  truncateWithHash(slugify(value) || fallback)

const truncateText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`
}

const richText = (paragraphs: string[]): SeedRichText => ({
  root: {
    type: "root",
    format: "",
    indent: 0,
    version: 1,
    direction: "ltr",
    children: paragraphs
      .map((text) => normalizeInlineText(text))
      .filter((text): text is string => Boolean(text))
      .map((text) => ({
        type: "paragraph",
        format: "",
        indent: 0,
        version: 1,
        textFormat: 0,
        textStyle: "",
        children: [
          {
            type: "text",
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text,
            version: 1,
          },
        ],
      })),
  },
})

const paragraph = (text: string): SeedRichText => richText([text])

const textToRichText = (text: string): SeedRichText => {
  const paragraphs = text
    .split(RICH_TEXT_PARAGRAPH_SEPARATOR_PATTERN)
    .map((line) => line.trim())
    .filter(Boolean)

  return richText(paragraphs.length > 0 ? paragraphs : [text])
}

const findOne = async (
  payload: SeedPayload,
  collection: CollectionSlug,
  where: Record<string, unknown>
) => {
  const result = await payload.find({
    collection,
    where: where as never,
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })

  return result.docs[0] as SeedDoc | undefined
}

const findBySlug = (
  payload: SeedPayload,
  collection: CollectionSlug,
  slug: string
) =>
  findOne(payload, collection, {
    slug: {
      equals: slug,
    },
  })

const upsertBySlug = async <TCollection extends CollectionSlug>(
  payload: SeedPayload,
  collection: TCollection,
  slug: string,
  data: RequiredDataFromCollectionSlug<TCollection>
) => {
  const existing = await findBySlug(payload, collection, slug)
  if (existing?.id !== undefined) {
    await payload.update({
      collection,
      id: existing.id,
      data: data as never,
      overrideAccess: true,
    })

    return existing
  }

  return payload.create({
    collection,
    data,
    overrideAccess: true,
  })
}

const findUserByEmail = async (payload: SeedPayload, email: string) => {
  const result = await payload.find({
    collection: "users",
    where: {
      email: {
        equals: email,
      },
    },
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })

  return result.docs[0]
}

const createSeedUser = async (payload: SeedPayload) => {
  const existingUser = await findUserByEmail(payload, SEED_ADMIN_EMAIL)
  if (existingUser) {
    payload.logger.info(`Seed admin user already exists: ${SEED_ADMIN_EMAIL}`)
    await payload.update({
      collection: "users",
      id: existingUser.id,
      data: {
        apiKey: SEED_ADMIN_API_KEY,
        enableAPIKey: true,
        password: SEED_ADMIN_PASSWORD,
      },
      overrideAccess: true,
    })
    return existingUser
  }

  payload.logger.info(`Creating seed admin user: ${SEED_ADMIN_EMAIL}`)
  return payload.create({
    collection: "users",
    data: {
      email: SEED_ADMIN_EMAIL,
      apiKey: SEED_ADMIN_API_KEY,
      enableAPIKey: true,
      password: SEED_ADMIN_PASSWORD,
      firstName: "Payload",
      lastName: "Admin",
    },
    overrideAccess: true,
  })
}

const findSeedMedia = async (payload: SeedPayload) => {
  const result = await payload.find({
    collection: "media",
    where: {
      alt: {
        equals: "Seed placeholder image",
      },
    },
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })

  return result.docs[0]
}

const createSeedMedia = async (payload: SeedPayload) => {
  const existingMedia = await findSeedMedia(payload)
  if (existingMedia) {
    payload.logger.info("Seed media already exists")
    return existingMedia
  }

  payload.logger.info("Creating seed media")
  return payload.create({
    collection: "media",
    data: {
      alt: "Seed placeholder image",
    },
    file: {
      data: ONE_PIXEL_PNG,
      mimetype: "image/png",
      name: "payload-seed-placeholder.png",
      size: ONE_PIXEL_PNG.length,
    },
    overrideAccess: true,
  })
}

const upsertArticleCategory = async (
  payload: SeedPayload,
  title: string,
  slug: string
) => {
  const category = await upsertBySlug(payload, "article-categories", slug, {
    title,
    slug,
    translationSync: false,
  })

  return category.id as PayloadId
}

const upsertPageCategory = async (
  payload: SeedPayload,
  title: string,
  slug: string
) => {
  const category = await upsertBySlug(payload, "page-categories", slug, {
    title,
    slug,
    translationSync: false,
  })

  return category.id as PayloadId
}

const createArticleSeed = async (
  payload: SeedPayload,
  userId: PayloadId,
  mediaId: PayloadId
) => {
  if (!isEnabled(process.env.FEATURE_PAYLOAD_ARTICLES_ENABLED)) {
    return
  }

  const categoryId = await upsertArticleCategory(payload, "News", "news")

  payload.logger.info("Upserting seed article")
  await upsertBySlug(payload, "articles", "welcome-to-payload-cms", {
    title: "Welcome to Payload CMS",
    slug: "welcome-to-payload-cms",
    excerpt: "A starter article created by the local seed script.",
    content: paragraph(
      "This starter article confirms Payload content is available."
    ),
    featuredImage: mediaId,
    category: categoryId,
    tags: ["seed"],
    author: userId,
    status: "published",
    publishedDate: SEED_PUBLISHED_DATE,
    translationSync: false,
  })
}

const createPageSeed = async (payload: SeedPayload) => {
  if (!isEnabled(process.env.FEATURE_PAYLOAD_PAGES_ENABLED)) {
    return
  }

  const categoryId = await upsertPageCategory(
    payload,
    "Information",
    "information"
  )

  payload.logger.info("Upserting seed page")
  await upsertBySlug(payload, "pages", "about-herbatica", {
    title: "About Herbatica",
    slug: "about-herbatica",
    category: categoryId,
    content: paragraph(
      "This starter page confirms Payload pages are available."
    ),
    visibility: "public",
    status: "published",
    publishedDate: SEED_PUBLISHED_DATE,
    translationSync: false,
  })
}

const createHeroCarouselSeed = async (
  payload: SeedPayload,
  mediaId: PayloadId
) => {
  if (!isEnabled(process.env.FEATURE_PAYLOAD_HERO_CAROUSELS_ENABLED)) {
    return
  }

  const data = {
    image: mediaId,
    heading: "Herbatica",
    subheading: "Starter CMS content",
    button: "Browse products",
    buttonHref: "/",
    translationSync: false,
  }
  const existing = await findOne(payload, "hero-carousels", {
    heading: {
      equals: data.heading,
    },
  })

  if (existing?.id !== undefined) {
    payload.logger.info("Updating seed hero carousel")
    await payload.update({
      collection: "hero-carousels",
      id: existing.id,
      data: data as never,
      overrideAccess: true,
    })
    return
  }

  payload.logger.info("Creating seed hero carousel")
  await payload.create({
    collection: "hero-carousels",
    data: data as never,
    overrideAccess: true,
  })
}

const resolveHerbaticaProductsXmlSource = () => {
  const envPath = normalizeInlineText(process.env[HERBATICA_PRODUCTS_XML_ENV])
  if (envPath) {
    return envPath
  }

  return existsSync(DEFAULT_HERBATICA_PRODUCTS_XML_PATH)
    ? DEFAULT_HERBATICA_PRODUCTS_XML_PATH
    : undefined
}

const readXmlSource = async (source: string) => {
  if (!HTTP_SOURCE_PATTERN.test(source)) {
    return readFile(source, "utf8")
  }

  const response = await fetch(source)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch XML source ${source}: ${response.status} ${response.statusText}`
    )
  }

  return response.text()
}

const resolveHerbaticaProductSeedLimit = () => {
  const raw = normalizeInlineText(
    process.env[PAYLOAD_SEED_HERBATICA_PRODUCTS_LIMIT_ENV]
  )
  if (!raw) {
    return
  }

  const value = Number.parseInt(raw, 10)
  return Number.isFinite(value) && value > 0 ? value : undefined
}

const getProductDescription = (shopItem: string) => {
  const description = decodeHtmlToText(
    extractFirstElementContent(shopItem, "DESCRIPTION")
  )
  if (description) {
    return description
  }

  return (
    decodeHtmlToText(
      extractFirstElementContent(shopItem, "SHORT_DESCRIPTION")
    ) ?? ""
  )
}

const getProductExcerpt = (shopItem: string, content: string) => {
  const shortDescription = decodeHtmlToText(
    extractFirstElementContent(shopItem, "SHORT_DESCRIPTION")
  )
  const source = shortDescription || content
  return source.length > 300 ? `${source.slice(0, 297).trim()}...` : source
}

const getProductCategory = (shopItem: string) => {
  const categorySource =
    extractFirstElementContent(shopItem, "DEFAULT_CATEGORY") ??
    extractFirstElementContent(shopItem, "CATEGORY")
  const path = splitCategoryPath(decodeXml(categorySource ?? ""))
  const title = path.at(-1) ?? "Herbatica produkty"

  return {
    title,
    slug: buildSlug(path.join(" ") || title, "herbatica-products"),
  }
}

const getProductTags = (shopItem: string, categoryTitle: string) => {
  const manufacturer = extractFirstText(shopItem, "MANUFACTURER")
  const rawTags = ["Herbatica", categoryTitle, manufacturer].filter(
    (tag): tag is string => Boolean(tag)
  )

  return [
    ...new Set(rawTags.flatMap((tag) => tag.split(TAG_SEPARATOR_PATTERN))),
  ]
    .map((tag) => normalizeInlineText(tag))
    .filter((tag): tag is string => Boolean(tag))
    .slice(0, 10)
}

const parseHerbaticaProductSeedItems = (
  xml: string,
  limit?: number
): HerbaticaProductSeedItem[] => {
  const items: HerbaticaProductSeedItem[] = []

  for (const shopItem of extractXmlElements(xml, "SHOPITEM")) {
    const title = extractFirstText(shopItem.inner, "NAME")
    const content = getProductDescription(shopItem.inner)
    if (!(title && content)) {
      continue
    }

    const sourceId = shopItem.attributes.id
    const importCode = shopItem.attributes["import-code"]
    const guid = extractFirstText(shopItem.inner, "GUID")
    const slug = buildSlug(
      sourceId || guid || importCode || title || `product-${items.length + 1}`,
      "product"
    )
    const category = getProductCategory(shopItem.inner)

    items.push({
      title: truncateText(title, 100),
      slug: `produkt-${slug}`,
      excerpt: getProductExcerpt(shopItem.inner, content),
      content: textToRichText(content),
      categoryTitle: category.title,
      categorySlug: category.slug,
      tags: getProductTags(shopItem.inner, category.title),
      publishedDate: SEED_PUBLISHED_DATE,
    })

    if (limit !== undefined && items.length >= limit) {
      break
    }
  }

  return items
}

const resolveBlogArticlesXlsxPath = () =>
  normalizeInlineText(process.env[PAYLOAD_SEED_ARTICLES_XLSX_ENV]) ??
  normalizeInlineText(process.env[HERBATICA_BLOG_ARTICLES_XLSX_ENV])

const parseImportStatus = (
  value: string | undefined
): ArticleImportOptions["status"] => {
  const normalized = normalizeInlineText(value)?.toLowerCase()
  if (!normalized) {
    return
  }

  return ["draft", "published", "archived"].includes(normalized)
    ? (normalized as ArticleImportOptions["status"])
    : undefined
}

const resolveSeedArticlesLocale = () =>
  normalizeInlineText(process.env[PAYLOAD_SEED_ARTICLES_LOCALE_ENV]) ??
  resolveEnvLocales("PAYLOAD_LOCALES", DEFAULT_PAYLOAD_LOCALES).defaultLocale

const createBlogArticlesXlsxSeed = async (payload: SeedPayload) => {
  if (!isEnabled(process.env.FEATURE_PAYLOAD_ARTICLES_ENABLED)) {
    return
  }

  const filePath = resolveBlogArticlesXlsxPath()
  if (!filePath) {
    payload.logger.info(
      `Payload blog article XLSX seed disabled; set ${PAYLOAD_SEED_ARTICLES_XLSX_ENV} or ${HERBATICA_BLOG_ARTICLES_XLSX_ENV} to enable`
    )
    return
  }

  if (!existsSync(filePath)) {
    payload.logger.warn(
      `Payload blog article XLSX seed file not found: ${filePath}`
    )
    return
  }

  payload.logger.info(`Seeding Payload blog articles from ${filePath}`)
  const result = await runImportFromFile({
    filePath,
    sheetName: normalizeInlineText(
      process.env[PAYLOAD_SEED_ARTICLES_SHEET_ENV]
    ),
    locale: resolveSeedArticlesLocale(),
    status: parseImportStatus(process.env[PAYLOAD_SEED_ARTICLES_STATUS_ENV]),
    translate: isExplicitlyEnabled(
      process.env[PAYLOAD_SEED_ARTICLES_TRANSLATE_ENV]
    ),
    overwrite: isExplicitlyEnabled(
      process.env[PAYLOAD_SEED_ARTICLES_OVERWRITE_ENV]
    ),
    payload,
  })

  payload.logger.info(
    `Payload blog article XLSX seed complete: imported ${result.imported}, skipped ${result.skipped} from ${result.total}`
  )
}

const createHerbaticaProductArticleSeed = async (
  payload: SeedPayload,
  userId: PayloadId,
  mediaId: PayloadId
) => {
  if (!isEnabled(process.env.FEATURE_PAYLOAD_ARTICLES_ENABLED)) {
    return
  }

  if (
    !isExplicitlyEnabled(
      process.env[PAYLOAD_SEED_HERBATICA_PRODUCTS_ENABLED_ENV]
    )
  ) {
    payload.logger.info(
      `Herbatica Payload product article seed disabled; set ${PAYLOAD_SEED_HERBATICA_PRODUCTS_ENABLED_ENV}=1 to enable`
    )
    return
  }

  const source = resolveHerbaticaProductsXmlSource()
  if (!source) {
    payload.logger.warn(
      "Herbatica products XML source not found, skipping Payload product article seed"
    )
    return
  }

  payload.logger.info(`Seeding Payload product articles from ${source}`)
  const xml = await readXmlSource(source)
  const items = parseHerbaticaProductSeedItems(
    xml,
    resolveHerbaticaProductSeedLimit()
  )
  let upserted = 0

  for (const item of items) {
    const categoryId = await upsertArticleCategory(
      payload,
      item.categoryTitle,
      item.categorySlug
    )

    await upsertBySlug(payload, "articles", item.slug, {
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt,
      content: item.content,
      featuredImage: mediaId,
      category: categoryId,
      tags: item.tags,
      author: userId,
      status: "published",
      publishedDate: item.publishedDate,
      translationSync: false,
    })
    upserted += 1
  }

  payload.logger.info(
    `Payload product article seed complete: upserted ${upserted}`
  )
}

const seed = async () => {
  const payload = await getPayload({ config })

  try {
    const user = await createSeedUser(payload)
    const media = await createSeedMedia(payload)

    await createArticleSeed(payload, user.id, media.id)
    await createPageSeed(payload)
    await createHeroCarouselSeed(payload, media.id)
    await createHerbaticaProductArticleSeed(payload, user.id, media.id)
    await createBlogArticlesXlsxSeed(payload)

    payload.logger.info("Payload seed completed")
  } finally {
    await payload.destroy()
  }
}

await seed()
