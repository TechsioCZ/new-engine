import type { ExecArgs, Logger, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { MARKET_VARIANT_AUTHORITY_MODULE } from "../modules/market-variant-authority"
import type {
  MarketVariantAuthorityProvenance,
  MarketVariantAuthorityRecord,
} from "../modules/market-variant-authority/contracts"
import type MarketVariantAuthorityModuleService from "../modules/market-variant-authority/service"

const DRY_RUN_PREFIX = /^--/
const PRODUCT_BATCH_SIZE = 200
const AUTHORITY_PAGE_SIZE = 1000
const UPSERT_PRODUCT_CHUNK = 100

type PublishedProduct = {
  productId: string
  variantIds: string[]
}

type MarketAuthorityIdentity = {
  approvalProvenance: MarketVariantAuthorityProvenance
  authoritySha256: string
  coveredVariantIds: Set<string>
  sourceProvenance: MarketVariantAuthorityProvenance
  sourceVersion: string
}

const failClosed = (message: string): never => {
  throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, message)
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined

const asRecords = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.flatMap((entry) => {
        const record = asRecord(entry)
        return record ? [record] : []
      })
    : []

const getId = (value: Record<string, unknown>): string | undefined =>
  typeof value.id === "string" && value.id.trim() ? value.id : undefined

const marketPublicationStatus = (
  product: Record<string, unknown>,
  market: string
): string | undefined => {
  const markets = asRecord(
    asRecord(asRecord(product.metadata)?.url_registry_publication)?.markets
  )
  const assignment = asRecord(markets?.[market])
  return typeof assignment?.publicationStatus === "string"
    ? assignment.publicationStatus
    : undefined
}

const readMarketCodes = async (
  service: MarketVariantAuthorityModuleService
): Promise<string[]> => {
  const markets = new Set<string>()
  for (let skip = 0; ; skip += AUTHORITY_PAGE_SIZE) {
    const page = (await service.listMarketVariantAuthorities(
      {},
      { order: { id: "ASC" }, skip, take: AUTHORITY_PAGE_SIZE }
    )) as MarketVariantAuthorityRecord[]
    for (const row of page) {
      markets.add(row.market_code)
    }
    if (page.length < AUTHORITY_PAGE_SIZE) {
      break
    }
  }
  if (markets.size === 0) {
    failClosed(
      "No current market variant authority exists; this backfill only extends an approved authority set"
    )
  }
  return [...markets].sort()
}

const readMarketIdentity = async (
  service: MarketVariantAuthorityModuleService,
  market: string
): Promise<MarketAuthorityIdentity> => {
  const hashes = new Set<string>()
  const versions = new Set<string>()
  const approvals = new Set<string>()
  const sources = new Set<string>()
  const coveredVariantIds = new Set<string>()
  let sample: MarketVariantAuthorityRecord | undefined

  for (let skip = 0; ; skip += AUTHORITY_PAGE_SIZE) {
    const page = (await service.listMarketVariantAuthorities(
      { market_code: market },
      {
        order: { product_id: "ASC", variant_id: "ASC" },
        skip,
        take: AUTHORITY_PAGE_SIZE,
      }
    )) as MarketVariantAuthorityRecord[]
    for (const row of page) {
      hashes.add(row.authority_sha256)
      versions.add(row.source_version)
      approvals.add(JSON.stringify(row.approval_provenance))
      sources.add(JSON.stringify(row.source_provenance))
      coveredVariantIds.add(row.variant_id)
      sample ??= row
    }
    if (page.length < AUTHORITY_PAGE_SIZE) {
      break
    }
  }

  if (
    !sample ||
    hashes.size !== 1 ||
    versions.size !== 1 ||
    approvals.size !== 1 ||
    sources.size !== 1
  ) {
    return failClosed(
      `Market "${market}" has no single approved authority identity to extend (hashes=${hashes.size}, versions=${versions.size}, approvals=${approvals.size}, sources=${sources.size})`
    )
  }

  return {
    approvalProvenance: sample.approval_provenance,
    authoritySha256: sample.authority_sha256,
    coveredVariantIds,
    sourceProvenance: sample.source_provenance,
    sourceVersion: sample.source_version,
  }
}

const readPublishedProducts = async (
  query: Query,
  market: string
): Promise<PublishedProduct[]> => {
  const products: PublishedProduct[] = []
  for (let skip = 0; ; skip += PRODUCT_BATCH_SIZE) {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "metadata", "variants.id"],
      filters: { status: "published" },
      pagination: { skip, take: PRODUCT_BATCH_SIZE },
    })
    const records = asRecords(data)
    for (const record of records) {
      if (marketPublicationStatus(record, market) !== "published") {
        continue
      }
      const productId = getId(record)
      if (!productId) {
        failClosed("Published product without an ID cannot be authorized")
        continue
      }
      const variantIds = asRecords(record.variants).flatMap((variant) => {
        const variantId = getId(variant)
        return variantId ? [variantId] : []
      })
      if (variantIds.length === 0) {
        continue
      }
      products.push({ productId, variantIds })
    }
    if (records.length < PRODUCT_BATCH_SIZE) {
      break
    }
  }
  return products
}

const chunk = <T>(values: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

export default async function backfillMarketVariantAuthority({
  args,
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const service = container.resolve<MarketVariantAuthorityModuleService>(
    MARKET_VARIANT_AUTHORITY_MODULE
  )
  const dryRun = args.some(
    (arg) => arg.replace(DRY_RUN_PREFIX, "") === "dry-run"
  )
  const markets = await readMarketCodes(service)

  for (const market of markets) {
    const identity = await readMarketIdentity(service, market)
    const published = await readPublishedProducts(query, market)
    const touched = published.filter((product) =>
      product.variantIds.some(
        (variantId) => !identity.coveredVariantIds.has(variantId)
      )
    )
    const missingVariants = touched.reduce(
      (count, product) =>
        count +
        product.variantIds.filter(
          (variantId) => !identity.coveredVariantIds.has(variantId)
        ).length,
      0
    )

    logger.info(
      `market_variant_authority backfill ${market}: published_products=${published.length}` +
        `, products_missing_authority=${touched.length}` +
        `, variants_missing_authority=${missingVariants}`
    )

    if (touched.length === 0 || dryRun) {
      continue
    }

    for (const productChunk of chunk(touched, UPSERT_PRODUCT_CHUNK)) {
      await service.upsertMarketVariantAuthorities({
        authoritySha256: identity.authoritySha256,
        entries: productChunk.flatMap((product) =>
          product.variantIds.map((variantId) => ({
            approvalProvenance: identity.approvalProvenance,
            availability: "sellable" as const,
            productId: product.productId,
            sourceProvenance: identity.sourceProvenance,
            variantId,
          }))
        ),
        marketCode: market,
        sourceVersion: identity.sourceVersion,
      })
    }

    for (const product of touched) {
      await service.resolveExactMarketVariantAuthority({
        authoritySha256: identity.authoritySha256,
        marketCode: market,
        productId: product.productId,
        sourceVersion: identity.sourceVersion,
        variantIds: product.variantIds,
      })
    }

    logger.info(
      `market_variant_authority backfill ${market}: verified ${touched.length} products against the approved authority identity`
    )
  }
}
