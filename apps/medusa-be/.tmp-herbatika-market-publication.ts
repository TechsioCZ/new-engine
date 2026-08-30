import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import {
  createTranslationsWorkflow,
  updateTranslationsWorkflow,
} from "@medusajs/core-flows"
import type {
  CreateTranslationDTO,
  ExecArgs,
  IProductModuleService,
  ISalesChannelModuleService,
  ITranslationModuleService,
  ProductDTO,
  Query,
  UpdateTranslationDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import {
  PRODUCT_PUBLICATION_METADATA_KEY,
  parseProductPublicationSnapshot,
} from "../modules/url-registry-outbox/product-publication-assignment"
import { PRODUCT_CONTENT_MODULE } from "../modules/product-content"
import type ProductContentModuleService from "../modules/product-content/service"

const MANIFEST_SHA256 =
  "e5755a4917401b9d7afc7875caae5ec5ab7e8697a5fe5929837b1bcf45b5133b"
const MARKETS = ["sk", "cz", "hu", "ro"] as const
const MARKET_CONFIG = {
  sk: { host: "www.herbatica.sk", locale: "sk-SK", channel: "Herbatica Storefront SK" },
  cz: { host: "www.herbatica.cz", locale: "cs-CZ", channel: "Herbatica Storefront CZ" },
  hu: { host: "www.herbatica.hu", locale: "hu-HU", channel: "Herbatica Storefront HU" },
  ro: { host: "www.herbatica.ro", locale: "ro-RO", channel: "Herbatica Storefront RO" },
} as const
const PAGE_SIZE = 100

type Market = (typeof MARKETS)[number]
type Entry = Readonly<{
  description: string
  product_id: string
  public_slug: string
  source_url: string
  subtitle: string
  title: string
}>
type Manifest = Readonly<{
  markets: Readonly<Record<Market, Readonly<Record<string, Entry>>>>
  schema_version: 1
  sha256: string
}>
type ExistingTranslation = Readonly<{
  id: string
  reference_id: string
  translations: Readonly<Record<string, unknown>>
}>
type RuntimeProduct = ProductDTO &
  Readonly<{ sales_channels?: readonly Readonly<{ id: string }>[] }>

const chunks = <Value>(values: readonly Value[], size = PAGE_SIZE) => {
  const result: Value[][] = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }
  return result
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const requiredString = (value: unknown, label: string) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is invalid`)
  }
  return value
}

const parseManifest = (value: unknown): Manifest => {
  if (!isRecord(value) || value.schema_version !== 1 || !isRecord(value.markets)) {
    throw new Error("Manifest shape is invalid")
  }
  const markets = {} as Record<Market, Record<string, Entry>>
  for (const market of MARKETS) {
    const source = value.markets[market]
    if (!isRecord(source)) {
      throw new Error(`Manifest market ${market} is invalid`)
    }
    const entries: Record<string, Entry> = {}
    for (const [productId, raw] of Object.entries(source)) {
      if (!isRecord(raw) || raw.product_id !== productId) {
        throw new Error(`${market}.${productId} identity is invalid`)
      }
      const entry = {
        description: requiredString(raw.description, `${market}.${productId}.description`),
        product_id: productId,
        public_slug: requiredString(raw.public_slug, `${market}.${productId}.public_slug`),
        source_url: requiredString(raw.source_url, `${market}.${productId}.source_url`),
        subtitle: requiredString(raw.subtitle, `${market}.${productId}.subtitle`),
        title: requiredString(raw.title, `${market}.${productId}.title`),
      }
      const url = new URL(entry.source_url)
      if (
        url.hostname !== MARKET_CONFIG[market].host ||
        url.pathname.split("/").filter(Boolean).at(-1) !== entry.public_slug
      ) {
        throw new Error(`${market}.${productId} URL evidence is invalid`)
      }
      entries[productId] = entry
    }
    markets[market] = entries
  }
  return {
    markets,
    schema_version: 1,
    sha256: requiredString(value.sha256, "manifest.sha256"),
  }
}

const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right)

const listTranslations = async (
  service: ITranslationModuleService,
  referenceIds: readonly string[],
  localeCode: string,
  reference: "product" | "product_content"
) => {
  const result: ExistingTranslation[] = []
  for (const ids of chunks(referenceIds, 500)) {
    const rows = await service.listTranslations(
      { locale_code: localeCode, reference, reference_id: ids },
      { select: ["id", "reference_id", "translations"], take: ids.length + 1 }
    )
    result.push(
      ...rows.map((row) => ({
        id: row.id,
        reference_id: row.reference_id,
        translations: row.translations as Readonly<Record<string, unknown>>,
      }))
    )
  }
  return result
}

const upsertTranslations = async (
  container: ExecArgs["container"],
  service: ITranslationModuleService,
  manifest: Manifest,
  contentIdsByProductId: ReadonlyMap<string, string>
) => {
  for (const market of MARKETS) {
    const entries = Object.values(manifest.markets[market])
    const productIds = entries.map(({ product_id }) => product_id)
    const existingProducts = await listTranslations(
      service,
      productIds,
      MARKET_CONFIG[market].locale,
      "product"
    )
    const productByReference = new Map(
      existingProducts.map((translation) => [translation.reference_id, translation])
    )
    const productCreates: CreateTranslationDTO[] = []
    const productUpdates: UpdateTranslationDTO[] = []
    for (const entry of entries) {
      const translations = {
        description: entry.description,
        subtitle: entry.subtitle,
        title: entry.title,
      }
      const prior = productByReference.get(entry.product_id)
      if (!prior) {
        productCreates.push({
          locale_code: MARKET_CONFIG[market].locale,
          reference: "product",
          reference_id: entry.product_id,
          translations,
        })
      } else if (!same(prior.translations, translations)) {
        productUpdates.push({ id: prior.id, translations })
      }
    }
    for (const batch of chunks(productCreates, 500)) {
      await createTranslationsWorkflow(container).run({ input: { translations: batch } })
    }
    for (const batch of chunks(productUpdates, 500)) {
      await updateTranslationsWorkflow(container).run({ input: { translations: batch } })
    }

    const contentIds = productIds.map((productId) => {
      const contentId = contentIdsByProductId.get(productId)
      if (!contentId) {
        throw new Error(`Product ${productId} has no content record`)
      }
      return contentId
    })
    const existingContents = await listTranslations(
      service,
      contentIds,
      MARKET_CONFIG[market].locale,
      "product_content"
    )
    const contentByReference = new Map(
      existingContents.map((translation) => [translation.reference_id, translation])
    )
    const contentCreates: CreateTranslationDTO[] = []
    const contentUpdates: UpdateTranslationDTO[] = []
    for (const contentId of contentIds) {
      const prior = contentByReference.get(contentId)
      if (!prior) {
        contentCreates.push({
          locale_code: MARKET_CONFIG[market].locale,
          reference: "product_content",
          reference_id: contentId,
          translations: {},
        })
      } else if (!same(prior.translations, {})) {
        contentUpdates.push({ id: prior.id, translations: {} })
      }
    }
    for (const batch of chunks(contentCreates, 500)) {
      await createTranslationsWorkflow(container).run({ input: { translations: batch } })
    }
    for (const batch of chunks(contentUpdates, 500)) {
      await updateTranslationsWorkflow(container).run({ input: { translations: batch } })
    }
  }
}

const main = async ({ container, args }: ExecArgs) => {
  const normalized = args.flatMap((argument) => {
    const separator = argument.indexOf("=")
    return separator < 1
      ? [argument]
      : [`--${argument.slice(0, separator)}`, argument.slice(separator + 1)]
  })
  const manifestIndex = normalized.indexOf("--manifest")
  const confirmIndex = normalized.indexOf("--confirm-sha256")
  const apply = normalized.includes("apply") || normalized.includes("--apply")
  const manifestPath = normalized[manifestIndex + 1]
  const confirmation = normalized[confirmIndex + 1]
  if (!manifestPath) {
    throw new Error("manifest=<path> is required")
  }
  const raw = await readFile(manifestPath)
  const rawSha256 = createHash("sha256").update(raw).digest("hex")
  if (rawSha256 !== MANIFEST_SHA256) {
    throw new Error(`Manifest SHA differs: ${rawSha256}`)
  }
  const manifest = parseManifest(JSON.parse(raw.toString("utf8")))
  const expectedCounts = Object.fromEntries(
    MARKETS.map((market) => [market, Object.keys(manifest.markets[market]).length])
  )
  console.log(
    JSON.stringify({ apply, expectedCounts, manifestSha256: rawSha256 })
  )
  if (!apply) {
    return
  }
  if (confirmation !== rawSha256) {
    throw new Error("Apply confirmation SHA differs")
  }

  const productService = container.resolve<IProductModuleService>(Modules.PRODUCT)
  const contentService = container.resolve<ProductContentModuleService>(
    PRODUCT_CONTENT_MODULE
  )
  const translationService = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )
  const salesChannelService = container.resolve<ISalesChannelModuleService>(
    Modules.SALES_CHANNEL
  )
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const products = (await productService.listProducts(
    {},
    {
      relations: ["sales_channels"],
      select: [
        "id",
        "metadata",
        "title",
        "description",
        "subtitle",
        "updated_at",
        "sales_channels.id",
      ],
      take: 10_000,
    }
  )) as RuntimeProduct[]
  const productsById = new Map(products.map((product) => [product.id, product]))
  const publishedProductIds = new Set(
    MARKETS.flatMap((market) => Object.keys(manifest.markets[market]))
  )
  for (const productId of publishedProductIds) {
    if (!productsById.has(productId)) {
      throw new Error(`Manifest product ${productId} is missing`)
    }
  }

  const existingContents = await contentService.listProductContents(
    { product_id: [...publishedProductIds] },
    { take: publishedProductIds.size + 1 }
  )
  const contentIdsByProductId = new Map(
    existingContents.map((content) => [content.product_id, content.id])
  )
  const missingContents = [...publishedProductIds]
    .filter((productId) => !contentIdsByProductId.has(productId))
    .map((product_id) => ({ composition: "", other: "", product_id, usage: "", warning: "" }))
  for (const batch of chunks(missingContents, 500)) {
    const created = await contentService.createProductContents(batch)
    for (const content of created) {
      contentIdsByProductId.set(content.product_id, content.id)
    }
  }
  if (contentIdsByProductId.size !== publishedProductIds.size) {
    throw new Error("Product content state differs")
  }

  await upsertTranslations(
    container,
    translationService,
    manifest,
    contentIdsByProductId
  )

  const channels = await salesChannelService.listSalesChannels({}, { take: 100 })
  const channelIds = Object.fromEntries(
    MARKETS.map((market) => {
      const matches = channels.filter(
        ({ name }) => name === MARKET_CONFIG[market].channel
      )
      if (matches.length !== 1) {
        throw new Error(`Sales channel ${MARKET_CONFIG[market].channel} differs`)
      }
      return [market, matches[0]?.id]
    })
  ) as Record<Market, string>
  const defaultChannels = channels.filter(({ name }) => name === "Default Sales Channel")
  if (defaultChannels.length !== 1 || !defaultChannels[0]) {
    throw new Error("Default Sales Channel differs")
  }
  const defaultChannelId = defaultChannels[0].id

  const updates = products.map((product) => {
    const assignments = Object.fromEntries(
      MARKETS.map((market) => {
        const entry = manifest.markets[market][product.id]
        return [
          market,
          entry
            ? {
                publicationStatus: "published",
                publicSlug: entry.public_slug,
                salesChannelId: channelIds[market],
              }
            : null,
        ]
      })
    )
    const sk = manifest.markets.sk[product.id]
    return {
      ...(sk
        ? {
            description: sk.description,
            subtitle: sk.subtitle,
            title: sk.title,
          }
        : {}),
      id: product.id,
      metadata: {
        ...(product.metadata ?? {}),
        [PRODUCT_PUBLICATION_METADATA_KEY]: { markets: assignments, schemaVersion: 1 },
      },
      sales_channels: [
        { id: defaultChannelId },
        ...MARKETS.flatMap((market) =>
          manifest.markets[market][product.id]
            ? [{ id: channelIds[market] }]
            : []
        ),
      ],
    }
  })
  for (const batch of chunks(updates, 50)) {
    await updateProductsWorkflow(container).run({ input: { products: batch } })
  }

  const { data: freshProducts } = await query.graph({
    entity: "product",
    fields: ["id", "metadata", "updated_at", "sales_channels.id"],
    filters: { id: products.map(({ id }) => id) },
  })
  if (freshProducts.length !== products.length) {
    throw new Error("Fresh product state differs")
  }
  for (const product of freshProducts) {
    const expectedChannels = new Set([
      defaultChannelId,
      ...MARKETS.flatMap((market) =>
        manifest.markets[market][product.id] ? [channelIds[market]] : []
      ),
    ])
    const actualChannels = new Set(
      (product.sales_channels ?? []).flatMap((channel) =>
        channel?.id ? [channel.id] : []
      )
    )
    if (
      actualChannels.size !== expectedChannels.size ||
      [...expectedChannels].some((id) => !actualChannels.has(id))
    ) {
      throw new Error(`Product ${product.id} channel state differs`)
    }
    const snapshot = parseProductPublicationSnapshot({
      ...product,
      sales_channels: [...actualChannels].map((id) => ({ id })),
    })
    for (const market of MARKETS) {
      const entry = manifest.markets[market][product.id]
      const assignment = snapshot.assignments[market]
      if (
        entry
          ? assignment?.publicationStatus !== "published" ||
            assignment.publicSlug !== entry.public_slug ||
            assignment.salesChannelId !== channelIds[market]
          : assignment !== null
      ) {
        throw new Error(`Product ${product.id} ${market} publication differs`)
      }
    }
  }
  console.log(
    `Applied and verified market publication: ${JSON.stringify(expectedCounts)}`
  )
}

export default main
