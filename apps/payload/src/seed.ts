import { createHash } from "node:crypto"

import { getPayload } from "payload"

import { getEnv } from "./lib/utils/env"
import type { Article } from "./payload-types"
import config from "./payload.config"

type SeedPayload = Awaited<ReturnType<typeof getPayload>>
type SeedRichText = Article["content"]

const SEED_ADMIN_EMAIL = getEnv("PAYLOAD_SSO_USER_EMAIL", true)
const SEED_ADMIN_API_KEY = getEnv("PAYLOAD_API_KEY", true)
const SSO_PRIVATE_KEY = getEnv("PAYLOAD_SSO_PRIVATE_KEY", true)

const normalizeKey = (value: string) => value.replaceAll("\\n", "\n").trim()

const deriveSeedPassword = (privateKey: string) =>
  createHash("sha256").update(normalizeKey(privateKey)).digest("hex")

const SEED_ADMIN_PASSWORD = deriveSeedPassword(SSO_PRIVATE_KEY)

const ARTICLES_COLLECTION = "articles"
const ARTICLE_CATEGORIES_COLLECTION = "article-categories"
const HERO_CAROUSELS_COLLECTION = "hero-carousels"
const MEDIA_COLLECTION = "media"
const PAGES_COLLECTION = "pages"
const PAGE_CATEGORIES_COLLECTION = "page-categories"

const {
  FEATURE_PAYLOAD_ARTICLES_ENABLED,
  FEATURE_PAYLOAD_HERO_CAROUSELS_ENABLED,
  FEATURE_PAYLOAD_PAGES_ENABLED,
} = process.env

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lNnJYQAAAABJRU5ErkJggg==",
  "base64",
)

const isEnabled = (value: string | undefined): boolean =>
  value === undefined ||
  ["1", "true", "yes", "on"].includes(value.toLowerCase())

const paragraph = (text: string): SeedRichText => ({
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text,
            type: "text",
            version: 1,
          },
        ],
        format: "",
        indent: 0,
        textFormat: 0,
        textStyle: "",
        type: "paragraph",
        version: 1,
      },
    ],
    direction: "ltr",
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
})

const hasDocs = async (
  payload: SeedPayload,
  collection: Parameters<SeedPayload["count"]>[0]["collection"],
): Promise<boolean> => {
  const result = await payload.count({
    collection,
    overrideAccess: true,
  })

  return result.totalDocs > 0
}

const findUserByEmail = async (payload: SeedPayload, email: string) => {
  const result = await payload.find({
    collection: "users",
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      email: {
        equals: email,
      },
    },
  })

  return result.docs.at(0)
}

const createSeedUser = async (payload: SeedPayload) => {
  const existingUser = await findUserByEmail(payload, SEED_ADMIN_EMAIL)
  if (existingUser !== undefined) {
    payload.logger.info(`Seed admin user already exists: ${SEED_ADMIN_EMAIL}`)
    await payload.update({
      collection: "users",
      data: {
        apiKey: SEED_ADMIN_API_KEY,
        enableAPIKey: true,
        password: SEED_ADMIN_PASSWORD,
      },
      id: existingUser.id,
      overrideAccess: true,
    })
    return existingUser
  }

  payload.logger.info(`Creating seed admin user: ${SEED_ADMIN_EMAIL}`)
  return await payload.create({
    collection: "users",
    data: {
      apiKey: SEED_ADMIN_API_KEY,
      email: SEED_ADMIN_EMAIL,
      enableAPIKey: true,
      firstName: "Payload",
      lastName: "Admin",
      password: SEED_ADMIN_PASSWORD,
    },
    overrideAccess: true,
  })
}

const createSeedMedia = async (payload: SeedPayload) => {
  if (await hasDocs(payload, MEDIA_COLLECTION)) {
    const result = await payload.find({
      collection: MEDIA_COLLECTION,
      limit: 1,
      overrideAccess: true,
      pagination: false,
    })
    const existingMedia = result.docs.at(0)
    if (existingMedia === undefined) {
      throw new Error("Seed media lookup returned no documents")
    }
    payload.logger.info("Seed media already exists")
    return existingMedia
  }

  payload.logger.info("Creating seed media")
  return await payload.create({
    collection: MEDIA_COLLECTION,
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

const createArticleSeed = async (
  payload: SeedPayload,
  userId: number,
  mediaId: number,
) => {
  if (!isEnabled(FEATURE_PAYLOAD_ARTICLES_ENABLED)) {
    return
  }

  let categoryId: number
  if (await hasDocs(payload, ARTICLE_CATEGORIES_COLLECTION)) {
    const result = await payload.find({
      collection: ARTICLE_CATEGORIES_COLLECTION,
      limit: 1,
      overrideAccess: true,
      pagination: false,
    })
    const category = result.docs.at(0)
    if (category === undefined) {
      throw new Error(
        "Article category count is non-zero but no document was returned",
      )
    }
    categoryId = category.id
    payload.logger.info("Seed article category already exists")
  } else {
    payload.logger.info("Creating seed article category")
    const category = await payload.create({
      collection: ARTICLE_CATEGORIES_COLLECTION,
      data: {
        slug: "news",
        title: "News",
        translationSync: false,
      },
      overrideAccess: true,
    })
    categoryId = category.id
  }

  if (await hasDocs(payload, ARTICLES_COLLECTION)) {
    payload.logger.info("Seed article already exists")
    return
  }

  payload.logger.info("Creating seed article")
  await payload.create({
    collection: ARTICLES_COLLECTION,
    data: {
      author: userId,
      category: categoryId,
      content: paragraph(
        "This starter article confirms Payload content is available.",
      ),
      excerpt: "A starter article created by the local seed script.",
      featuredImage: mediaId,
      publishedDate: new Date().toISOString(),
      slug: "welcome-to-payload-cms",
      status: "published",
      tags: ["seed"],
      title: "Welcome to Payload CMS",
      translationSync: false,
    },
    overrideAccess: true,
  })
}

const createPageSeed = async (payload: SeedPayload) => {
  if (!isEnabled(FEATURE_PAYLOAD_PAGES_ENABLED)) {
    return
  }

  let categoryId: number
  if (await hasDocs(payload, PAGE_CATEGORIES_COLLECTION)) {
    const result = await payload.find({
      collection: PAGE_CATEGORIES_COLLECTION,
      limit: 1,
      overrideAccess: true,
      pagination: false,
    })
    const category = result.docs.at(0)
    if (category === undefined) {
      throw new Error(
        "Page category count is non-zero but no document was returned",
      )
    }
    categoryId = category.id
    payload.logger.info("Seed page category already exists")
  } else {
    payload.logger.info("Creating seed page category")
    const category = await payload.create({
      collection: PAGE_CATEGORIES_COLLECTION,
      data: {
        slug: "information",
        title: "Information",
        translationSync: false,
      },
      overrideAccess: true,
    })
    categoryId = category.id
  }

  if (await hasDocs(payload, PAGES_COLLECTION)) {
    payload.logger.info("Seed page already exists")
    return
  }

  payload.logger.info("Creating seed page")
  await payload.create({
    collection: PAGES_COLLECTION,
    data: {
      category: categoryId,
      content: paragraph(
        "This starter page confirms Payload pages are available.",
      ),
      publishedDate: new Date().toISOString(),
      slug: "about-herbatica",
      status: "published",
      title: "About Herbatica",
      translationSync: false,
      visibility: "public",
    },
    overrideAccess: true,
  })
}

const createHeroCarouselSeed = async (
  payload: SeedPayload,
  mediaId: number,
) => {
  if (!isEnabled(FEATURE_PAYLOAD_HERO_CAROUSELS_ENABLED)) {
    return
  }

  if (await hasDocs(payload, HERO_CAROUSELS_COLLECTION)) {
    payload.logger.info("Seed hero carousel already exists")
    return
  }

  payload.logger.info("Creating seed hero carousel")
  await payload.create({
    collection: HERO_CAROUSELS_COLLECTION,
    data: {
      button: "Browse products",
      buttonHref: "/",
      heading: "Herbatica",
      image: mediaId,
      internalTitle: "Herbatica homepage hero",
      subheading: "Starter CMS content",
      translationSync: false,
    },
    overrideAccess: true,
  })
}

const seed = async () => {
  const payload = await getPayload({ config })

  try {
    const user = await createSeedUser(payload)
    const media = await createSeedMedia(payload)

    await createArticleSeed(payload, user.id, media.id)
    await createPageSeed(payload)
    await createHeroCarouselSeed(payload, media.id)

    payload.logger.info("Payload seed completed")
  } finally {
    await payload.destroy()
  }
}

await seed()
