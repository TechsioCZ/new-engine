import { randomUUID } from "node:crypto"
import pg from "pg"
import { mapSeedSources } from "../src/lib/url-registry/seed/mapping.mjs"

const MARKETS = ["sk", "cz", "hu", "ro"]
const DEFAULT_LOCALES = { sk: "sk", cz: "cs", hu: "hu", ro: "ro" }
const databaseUrl =
  process.env.URL_REGISTRY_DATABASE_URL ?? process.env.DATABASE_URL
const medusaUrl =
  process.env.URL_REGISTRY_MEDUSA_URL ??
  process.env.MEDUSA_BACKEND_URL ??
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

if (!(databaseUrl && medusaUrl)) {
  throw new Error(
    "URL_REGISTRY_DATABASE_URL and URL_REGISTRY_MEDUSA_URL are required"
  )
}

const readMarketConfig = () => {
  if (process.env.URL_REGISTRY_MARKETS_JSON) {
    return JSON.parse(process.env.URL_REGISTRY_MARKETS_JSON)
  }
  return Object.fromEntries(
    MARKETS.map((market) => [
      market,
      {
        publishableKey:
          process.env[`URL_REGISTRY_${market.toUpperCase()}_PUBLISHABLE_KEY`],
        salesChannelId:
          process.env[`URL_REGISTRY_${market.toUpperCase()}_SALES_CHANNEL_ID`],
        locale: DEFAULT_LOCALES[market],
      },
    ])
  )
}

const marketConfig = readMarketConfig()
for (const market of MARKETS) {
  const config = marketConfig[market]
  if (!(config?.publishableKey && config?.salesChannelId)) {
    throw new Error(
      `Missing publishableKey or salesChannelId configuration for ${market}`
    )
  }
}

const requestJson = async (path, market, params = {}) => {
  const config = marketConfig[market]
  const url = new URL(path, medusaUrl)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "x-publishable-api-key": config.publishableKey,
    },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    throw new Error(`${url.pathname} failed for ${market}: ${response.status}`)
  }
  return response.json()
}

const fetchPaginated = async (path, responseKey, market) => {
  const records = []
  const limit = 100
  for (let offset = 0; ; offset += limit) {
    const payload = await requestJson(path, market, {
      fields: "id,handle",
      limit,
      offset,
      sales_channel_id: marketConfig[market].salesChannelId,
    })
    const page = Array.isArray(payload[responseKey]) ? payload[responseKey] : []
    records.push(...page)
    if (
      page.length < limit ||
      records.length >= (payload.count ?? Number.POSITIVE_INFINITY)
    ) {
      return records
    }
  }
}

const fetchCms = async (market) => {
  const locale = marketConfig[market].locale ?? DEFAULT_LOCALES[market]
  const [articlePayload, pagePayload] = await Promise.all([
    requestJson("/store/cms/article-categories", market, { locale }),
    requestJson("/store/cms/page-categories", market, { locale }),
  ])
  return {
    articles: (articlePayload.articleCategories ?? []).flatMap(
      (category) => category.articles ?? []
    ),
    pages: (pagePayload.pageCategories ?? []).flatMap(
      (category) => category.pages ?? []
    ),
  }
}

const sources = await Promise.all(
  MARKETS.map(async (market) => {
    const [products, categories, collections, brands, cms] = await Promise.all([
      fetchPaginated("/store/products", "products", market),
      fetchPaginated("/store/product-categories", "product_categories", market),
      fetchPaginated("/store/collections", "collections", market),
      fetchPaginated("/store/brands", "brands", market),
      fetchCms(market),
    ])
    return {
      market,
      products,
      categories,
      collections,
      brands,
      ...cms,
    }
  })
)

const records = mapSeedSources(sources)
const pool = new pg.Pool({ connectionString: databaseUrl })
const client = await pool.connect()
let inserted = 0
let unchanged = 0

try {
  await client.query("BEGIN")
  for (const record of records) {
    const result = await client.query(
      `INSERT INTO url_registry.url_records
        (id, market, kind, slug, entity_id, equivalence_key, indexable, status, alias_of)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'current', NULL)
       ON CONFLICT (market, kind, slug) DO UPDATE
       SET updated_at = url_registry.url_records.updated_at
       WHERE url_registry.url_records.entity_id = EXCLUDED.entity_id
         AND url_registry.url_records.equivalence_key = EXCLUDED.equivalence_key
         AND url_registry.url_records.indexable = EXCLUDED.indexable
         AND url_registry.url_records.status = 'current'
         AND url_registry.url_records.alias_of IS NULL
       RETURNING (xmax = 0) AS inserted`,
      [
        randomUUID(),
        record.market,
        record.kind,
        record.slug,
        record.entityId,
        record.equivalenceKey,
        record.indexable,
      ]
    )
    if (!result.rows[0]) {
      throw new Error(
        `Seed conflict at ${record.market}/${record.kind}/${record.slug}`
      )
    }
    if (result.rows[0].inserted) {
      inserted += 1
    } else {
      unchanged += 1
    }
  }
  await client.query("COMMIT")
} catch (error) {
  await client.query("ROLLBACK")
  throw error
} finally {
  client.release()
  await pool.end()
}

console.log(
  `URL registry seed complete: ${inserted} inserted, ${unchanged} unchanged`
)
console.log(
  "Brands were seeded from the repository's custom /store/brands entity. Campaigns were skipped because no campaign entity or CMS campaign collection exists."
)
