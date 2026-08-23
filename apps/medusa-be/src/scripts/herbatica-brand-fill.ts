import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import path from "node:path"
import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type { Context, ExecArgs, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/medusa"
import { ProductBrandLink } from "../links/product-brand"
import { BRAND_MODULE } from "../modules/brand"
import type BrandModuleService from "../modules/brand/service"
import { enqueueCatalogAssignmentLifecycle } from "../modules/storefront-url-assignment/catalog-lifecycle"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../modules/storefront-url-assignment"
import type { StorefrontUrlAssignmentRecord } from "../modules/storefront-url-assignment/models/storefront-url-assignment"
import type StorefrontUrlAssignmentModuleService from "../modules/storefront-url-assignment/service"
import { URL_REGISTRY_OUTBOX_MODULE } from "../modules/url-registry-outbox"
import type UrlRegistryOutboxModuleService from "../modules/url-registry-outbox/service"
import {
  batchLinkProductsToBrandWorkflow,
  createBrandsWorkflow,
} from "../workflows/brand/workflows"
import { dispatchUrlRegistryOutboxWorkflow } from "../workflows/url-registry-outbox/dispatch-workflow"

// Herbatika four-market brand landing-page publisher.
// Default = DRY RUN. `--apply` guards every write.

const MARKETS = ["sk", "cz", "hu", "ro"] as const
type Market = (typeof MARKETS)[number]

const SALES_CHANNELS: Readonly<Record<Market, string>> = {
  sk: "sc_01M0J13TWTKC82JH6TX7VDMC7B",
  cz: "sc_01M0J13TWT6GDNSZC9MV31AT44",
  hu: "sc_01M0J13TWT4R7JN01KKXKRZKVV",
  ro: "sc_01M0J13TWT0KGBEB3ASSQJS1RE",
}

// Consolidated slugs that are naming variants of brand entities that already
// exist in Medusa under a different handle. These resolve to the EXISTING
// entity (no duplicate is created). See README / dry-run notes for provenance.
const REMAP_TO_EXISTING: Readonly<Record<string, string>> = {
  eliksir: "elixir",
  "fito-kosmetik": "fitokosmetik",
  fitosila: "fito-sila",
  krokmed: "krok-med",
  mamaflow: "mama-flow",
  swissmedicus: "swiss-medicus",
  therabeast: "thera-beast",
}

const PUBLIC_SLUG_PATTERN = /^(?=.*[a-z0-9])[a-z0-9-]+$/
const DEFAULT_DATA_DIR = "/tmp/branddata"
const CHUNK = 400
const CREATE_CHUNK = 50
// Store-branch page flagged for operator review; still published per instructions.
const STORE_BRANCH_SLUGS = new Set(["predajna-cadca"])

type ConsolidatedBrand = Readonly<{
  slug: string
  title: string
  markets: Market[]
  productSlugs: string[]
  productCount: number
}>

type CliOptions = Readonly<{
  apply: boolean
  dataDir: string
  limit: number | null
}>

type ProductLinkRow = Readonly<{ brand_id?: string; product_id?: string }>

const parseArgs = (args: string[]): CliOptions => {
  // `medusa exec` can swallow a bare `--apply`; env var is an unambiguous fallback.
  let apply = process.env.HERBATICA_BRAND_FILL_APPLY === "1"
  let dataDir = DEFAULT_DATA_DIR
  let limit: number | null = null
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === "--apply") {
      apply = true
    } else if (arg === "--data-dir") {
      const next = args[index + 1]
      if (!next) {
        throw new Error("--data-dir requires a path")
      }
      dataDir = next
      index += 1
    } else if (arg === "--limit") {
      const next = args[index + 1]
      const parsed = Number(next)
      if (!Number.isSafeInteger(parsed) || parsed < 1) {
        throw new Error("--limit requires a positive integer")
      }
      limit = parsed
      index += 1
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }
  return { apply, dataDir, limit }
}

const loadConsolidated = (
  dataDir: string,
  limit: number | null
): ConsolidatedBrand[] => {
  const file = path.join(dataDir, "brands", "consolidated.json")
  const raw: unknown = JSON.parse(readFileSync(file, "utf8"))
  if (!Array.isArray(raw)) {
    throw new Error("consolidated.json must be an array")
  }
  const brands = raw.map((value, index): ConsolidatedBrand => {
    if (!(value && typeof value === "object")) {
      throw new Error(`brand ${index} is not an object`)
    }
    const record = value as Record<string, unknown>
    const slug = record.slug
    const title = record.title
    const markets = record.markets
    const productSlugs = record.productSlugs
    if (typeof slug !== "string" || !PUBLIC_SLUG_PATTERN.test(slug)) {
      throw new Error(`brand ${index} has an invalid slug`)
    }
    if (typeof title !== "string" || title.trim() === "") {
      throw new Error(`brand ${slug} has an invalid title`)
    }
    if (
      !Array.isArray(markets) ||
      markets.some((market) => !MARKETS.includes(market as Market))
    ) {
      throw new Error(`brand ${slug} has an invalid markets list`)
    }
    if (
      !Array.isArray(productSlugs) ||
      productSlugs.some((entry) => typeof entry !== "string")
    ) {
      throw new Error(`brand ${slug} has an invalid productSlugs list`)
    }
    return {
      markets: markets as Market[],
      productCount:
        typeof record.productCount === "number" ? record.productCount : 0,
      productSlugs: productSlugs as string[],
      slug,
      title,
    }
  })
  return limit === null ? brands : brands.slice(0, limit)
}

const loadSlugMaps = (dataDir: string): Record<Market, Map<string, string>> => {
  const maps = {} as Record<Market, Map<string, string>>
  for (const market of MARKETS) {
    const file = path.join(dataDir, "exec", `prodslug-${market}.tsv`)
    let raw: string
    try {
      raw = readFileSync(file, "utf8")
    } catch (error) {
      throw new Error(
        `dataDir missing or incomplete: cannot read ${file} (${String(error)})`
      )
    }
    const map = new Map<string, string>()
    let malformed = 0
    for (const line of raw.split("\n")) {
      if (line.trim() === "") {
        continue
      }
      const [slug, productId] = line.split("\t")
      if (slug && productId) {
        map.set(slug, productId)
      } else {
        malformed += 1
      }
    }
    if (malformed > 0) {
      throw new Error(`${file}: ${malformed} malformed line(s)`)
    }
    maps[market] = map
  }
  return maps
}

const authorityMarket = (brand: ConsolidatedBrand): Market => {
  const market = MARKETS.find((candidate) => brand.markets.includes(candidate))
  if (!market) {
    throw new Error(`brand ${brand.slug} has no markets`)
  }
  return market
}

const chunk = <Value>(values: Value[], size: number): Value[][] => {
  const result: Value[][] = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }
  return result
}

type BrandPlan = {
  authority: Market
  existingBrandId: string | null
  markets: Market[]
  // Handle of the pre-existing entity this consolidated slug remaps to, or null.
  remappedHandle: string | null
  resolvedProductIds: string[]
  slug: string
  targetHandle: string
  title: string
  unmappedProductSlugs: string[]
}

// Per-market public slug. Remapped brands keep the EXISTING SK route slug
// (the mapped handle) to avoid a live SK current->alias slug transition, and
// publish the official consolidated slug for cz/hu/ro (where no route exists).
const publicSlugForMarket = (plan: BrandPlan, market: Market): string =>
  plan.remappedHandle && market === "sk" ? plan.remappedHandle : plan.slug

const buildBrandPlans = (
  brands: ConsolidatedBrand[],
  handleToId: Map<string, string>,
  maps: Record<Market, Map<string, string>>
): BrandPlan[] =>
  brands.map((brand) => {
    const authority = authorityMarket(brand)
    const resolvedProductIds: string[] = []
    const unmappedProductSlugs: string[] = []
    const authorityMap = maps[authority]
    for (const productSlug of brand.productSlugs) {
      const productId = authorityMap.get(productSlug)
      if (productId) {
        resolvedProductIds.push(productId)
      } else {
        unmappedProductSlugs.push(productSlug)
      }
    }
    const remappedHandle = REMAP_TO_EXISTING[brand.slug] ?? null
    const targetHandle = remappedHandle ?? brand.slug
    return {
      authority,
      existingBrandId: handleToId.get(targetHandle) ?? null,
      markets: brand.markets,
      remappedHandle,
      resolvedProductIds: [...new Set(resolvedProductIds)],
      slug: brand.slug,
      targetHandle,
      title: brand.title,
      unmappedProductSlugs,
    }
  })

const resolveLiveBrands = async (
  brandService: BrandModuleService,
  handles: string[]
): Promise<Map<string, string>> => {
  const handleToId = new Map<string, string>()
  const unique = [...new Set(handles)]
  for (const handleChunk of chunk(unique, CHUNK)) {
    const rows = (await brandService.listBrands(
      { handle: { $in: handleChunk } },
      { take: handleChunk.length + 1 }
    )) as Array<{ handle: string; id: string }>
    for (const row of rows) {
      handleToId.set(row.handle, row.id)
    }
  }
  return handleToId
}

const readProductBrandLinks = async (
  query: Query,
  filter: { field: "brand_id" | "product_id"; ids: string[] }
): Promise<ProductLinkRow[]> => {
  const rows: ProductLinkRow[] = []
  for (const idChunk of chunk(filter.ids, CHUNK)) {
    const { data } = await query.graph({
      entity: ProductBrandLink.entryPoint,
      fields: ["product_id", "brand_id"],
      filters: { [filter.field]: { $in: idChunk } },
    })
    rows.push(...(data as ProductLinkRow[]))
  }
  return rows
}

const readCurrentByProduct = async (
  query: Query,
  productIds: string[]
): Promise<Map<string, Set<string>>> => {
  const currentByProduct = new Map<string, Set<string>>()
  for (const row of await readProductBrandLinks(query, {
    field: "product_id",
    ids: productIds,
  })) {
    if (row.product_id && row.brand_id) {
      const set = currentByProduct.get(row.product_id) ?? new Set<string>()
      set.add(row.brand_id)
      currentByProduct.set(row.product_id, set)
    }
  }
  return currentByProduct
}

const readBrandAssignments = async (
  assignmentService: StorefrontUrlAssignmentModuleService
): Promise<Map<string, StorefrontUrlAssignmentRecord>> => {
  const byIdentity = new Map<string, StorefrontUrlAssignmentRecord>()
  const pageSize = 500
  for (let skip = 0; ; skip += pageSize) {
    const page = await assignmentService.listStorefrontUrlAssignments(
      { entity_kind: "brand" },
      { skip, take: pageSize }
    )
    for (const record of page) {
      byIdentity.set(`${record.entity_id} ${record.market_code}`, record)
    }
    if (page.length < pageSize) {
      break
    }
  }
  return byIdentity
}

type AssignmentAction = "create" | "update" | "unchanged"

const assignmentActionFor = (
  plan: BrandPlan,
  market: Market,
  existing: Map<string, StorefrontUrlAssignmentRecord>
): AssignmentAction => {
  if (!plan.existingBrandId) {
    return "create"
  }
  const record = existing.get(`${plan.existingBrandId} ${market}`)
  if (!record) {
    return "create"
  }
  const matches =
    record.public_slug === publicSlugForMarket(plan, market) &&
    record.sales_channel_id === SALES_CHANNELS[market] &&
    record.publication_status === "published"
  return matches ? "unchanged" : "update"
}

// Conflict-safe link classification for one resolved product against a brand.
type LinkDecision = "add" | "already-same" | "conflict"

const classifyLink = (
  targetBrandId: string | null,
  currentBrandIds: Set<string> | undefined
): LinkDecision => {
  const current = currentBrandIds ?? new Set<string>()
  if (targetBrandId && current.has(targetBrandId)) {
    return "already-same"
  }
  if (current.size > 0) {
    return "conflict"
  }
  return "add"
}

const upsertAssignment = async (
  assignmentService: StorefrontUrlAssignmentModuleService,
  outboxService: UrlRegistryOutboxModuleService,
  input: {
    brandId: string
    market: Market
    publicSlug: string
    salesChannelId: string
  }
): Promise<void> => {
  await assignmentService.runInTransaction(async (sharedContext) => {
    await assignmentService.lockCatalogEntityAssignments(
      "brand",
      input.brandId,
      sharedContext
    )
    const identityRows = await assignmentService.listStorefrontUrlAssignments(
      {
        entity_id: input.brandId,
        entity_kind: "brand",
        market_code: input.market,
      },
      { take: 2 },
      sharedContext
    )
    if (identityRows.length > 1) {
      throw new Error(
        `brand ${input.brandId} ${input.market} assignment identity is ambiguous`
      )
    }
    const existing = identityRows[0]
    const alreadyPublished =
      existing &&
      existing.public_slug === input.publicSlug &&
      existing.sales_channel_id === input.salesChannelId &&
      existing.publication_status === "published"
    if (alreadyPublished) {
      return
    }
    const desired = {
      publication_status: "published" as const,
      public_slug: input.publicSlug,
      sales_channel_id: input.salesChannelId,
    }
    const persisted = existing
      ? await assignmentService.updateStorefrontUrlAssignments(
          {
            id: existing.id,
            source_version: Number(existing.source_version) + 1,
            ...desired,
          },
          sharedContext
        )
      : await assignmentService.createStorefrontUrlAssignments(
          {
            entity_id: input.brandId,
            entity_kind: "brand",
            market_code: input.market,
            schema_version: 1,
            source_version: 1,
            ...desired,
          },
          sharedContext
        )
    await enqueueCatalogAssignmentLifecycle(
      outboxService,
      persisted,
      sharedContext as Context<SqlEntityManager>
    )
  })
}

export default async function herbaticaBrandFill({ args, container }: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const brandService = container.resolve<BrandModuleService>(BRAND_MODULE)
  const assignmentService =
    container.resolve<StorefrontUrlAssignmentModuleService>(
      STOREFRONT_URL_ASSIGNMENT_MODULE
    )
  const outboxService = container.resolve<UrlRegistryOutboxModuleService>(
    URL_REGISTRY_OUTBOX_MODULE
  )

  const options = parseArgs(args)
  const brands = loadConsolidated(options.dataDir, options.limit)
  const maps = loadSlugMaps(options.dataDir)
  // Resolve existing entities by consolidated slug AND by remap-target handle.
  const lookupHandles = [
    ...brands.map((brand) => brand.slug),
    ...Object.values(REMAP_TO_EXISTING),
  ]
  const handleToId = await resolveLiveBrands(brandService, lookupHandles)
  const plans = buildBrandPlans(brands, handleToId, maps)

  // Current product -> brand-id links for every resolved product (conflict scan).
  const allProductIds = [
    ...new Set(plans.flatMap((plan) => plan.resolvedProductIds)),
  ]
  const currentByProduct = await readCurrentByProduct(query, allProductIds)
  const existingAssignments = await readBrandAssignments(assignmentService)

  const brandsToCreate = plans.filter((plan) => !plan.existingBrandId)
  const brandsReused = plans.filter((plan) => plan.existingBrandId)
  const remappedReused = plans.filter(
    (plan) => plan.remappedHandle && plan.existingBrandId
  )

  let linksToAdd = 0
  let alreadySameBrand = 0
  let conflictSkipped = 0
  let unmappedTotal = 0
  const unmappedExamples: string[] = []
  const conflictExamples: string[] = []
  const zeroProductBrands: string[] = []
  const assignmentCounts: Record<Market, Record<AssignmentAction, number>> = {
    cz: { create: 0, unchanged: 0, update: 0 },
    hu: { create: 0, unchanged: 0, update: 0 },
    ro: { create: 0, unchanged: 0, update: 0 },
    sk: { create: 0, unchanged: 0, update: 0 },
  }

  for (const plan of plans) {
    if (plan.resolvedProductIds.length === 0) {
      zeroProductBrands.push(plan.slug)
    }
    unmappedTotal += plan.unmappedProductSlugs.length
    for (const unmapped of plan.unmappedProductSlugs) {
      if (unmappedExamples.length < 12) {
        unmappedExamples.push(`${plan.authority}/${plan.slug}/${unmapped}`)
      }
    }
    for (const productId of plan.resolvedProductIds) {
      const decision = classifyLink(
        plan.existingBrandId,
        currentByProduct.get(productId)
      )
      if (decision === "add") {
        linksToAdd += 1
      } else if (decision === "already-same") {
        alreadySameBrand += 1
      } else {
        conflictSkipped += 1
        if (conflictExamples.length < 12) {
          const owner = [...(currentByProduct.get(productId) ?? [])][0]
          conflictExamples.push(`${plan.slug}:${productId}->${owner}`)
        }
      }
    }
    for (const market of plan.markets) {
      const action = assignmentActionFor(plan, market, existingAssignments)
      assignmentCounts[market][action] += 1
    }
  }

  const assignmentsToCreate = MARKETS.reduce(
    (total, market) => total + assignmentCounts[market].create,
    0
  )
  const assignmentsToUpdate = MARKETS.reduce(
    (total, market) => total + assignmentCounts[market].update,
    0
  )

  logger.info("=== Herbatika brand fill plan ===")
  logger.info(`mode: ${options.apply ? "APPLY" : "DRY-RUN"}`)
  logger.info(`data dir: ${options.dataDir}`)
  logger.info(
    `brands total: ${plans.length} | reuse (existing entity): ${brandsReused.length} | to-create: ${brandsToCreate.length}`
  )
  logger.info(
    `  of reused, remapped-to-existing variants: ${remappedReused.length} (${remappedReused
      .map((plan) => `${plan.slug}->${plan.remappedHandle}`)
      .join(", ")})`
  )
  logger.info(
    `product links: to-add=${linksToAdd} | already-on-same-brand(skip)=${alreadySameBrand} | conflictSkipped(other brand)=${conflictSkipped} | unmapped productSlugs=${unmappedTotal}`
  )
  logger.info(`unmapped examples: ${JSON.stringify(unmappedExamples)}`)
  logger.info(`conflictSkipped examples: ${JSON.stringify(conflictExamples)}`)
  logger.info(
    "SK slug decision: remapped variants KEEP their existing SK route slug (fallback); official slug published for cz/hu/ro only -> zero live SK current->alias slug transitions"
  )
  logger.info(
    `assignments per market create/update/unchanged: ${MARKETS.map(
      (market) =>
        `${market}=${assignmentCounts[market].create}/${assignmentCounts[market].update}/${assignmentCounts[market].unchanged}`
    ).join(" ")}`
  )
  logger.info(
    `assignments to write: create=${assignmentsToCreate} update=${assignmentsToUpdate}`
  )
  logger.info(
    `brands with 0 resolvable products: ${JSON.stringify(zeroProductBrands)}`
  )
  for (const plan of plans) {
    if (STORE_BRANCH_SLUGS.has(plan.slug)) {
      logger.info(
        `FLAG: "${plan.slug}" looks like a store-branch page, not a brand; included per instructions`
      )
    }
  }
  // Throw-safety proof: batch link only ever receives products with NO current
  // brand link (conflicts are skipped), and assignment upserts are idempotent.
  logger.info(
    `throw-safety: batch-link add set excludes all ${conflictSkipped} conflicting + ${alreadySameBrand} same-brand products; 0 operations would throw in --apply`
  )
  logger.info(
    "outbox drain mechanism: scheduled job src/jobs/url-registry-outbox-dispatch.ts running dispatchUrlRegistryOutboxWorkflow (schedule URL_REGISTRY_PRODUCT_LIFECYCLE_DISPATCH_SCHEDULE, default every minute), gated by URL_REGISTRY_PRODUCT_LIFECYCLE_ENABLED=1; --apply drains it once at the end"
  )

  if (!options.apply) {
    logger.info("Dry-run complete; no data was written")
    return {
      alreadySameBrand,
      assignmentsToCreate,
      assignmentsToUpdate,
      brandsToCreate: brandsToCreate.length,
      brandsToReuse: brandsReused.length,
      conflictSkipped,
      linksToAdd,
      unmappedTotal,
    }
  }

  // --- APPLY (guarded) ---
  logger.info("Applying brand fill...")

  // 1) Create missing brands (never the remapped/existing ones).
  for (const planChunk of chunk(brandsToCreate, CREATE_CHUNK)) {
    await createBrandsWorkflow(container).run({
      input: {
        brands: planChunk.map((plan) => ({
          handle: plan.slug,
          title: plan.title,
        })),
      },
    })
  }
  const refreshedHandleToId = await resolveLiveBrands(brandService, lookupHandles)
  for (const plan of plans) {
    plan.existingBrandId = refreshedHandleToId.get(plan.targetHandle) ?? null
  }

  // 2) Link member products. Re-read current links, then add ONLY products with
  //    no brand link at all -> batchLink can never hit a foreign-brand conflict.
  const applyCurrentByProduct = await readCurrentByProduct(query, allProductIds)
  // A product can only belong to one brand. Claim ownership run-scoped so a
  // product listed under two brands is linked once (to the first plan that
  // claims it), never re-sent to a second brand's batch link (which throws).
  const claimedThisRun = new Set<string>()
  let linkedProducts = 0
  for (const plan of plans) {
    const brandId = plan.existingBrandId
    if (!brandId || plan.resolvedProductIds.length === 0) {
      continue
    }
    const add = plan.resolvedProductIds.filter(
      (productId) =>
        !claimedThisRun.has(productId) &&
        classifyLink(brandId, applyCurrentByProduct.get(productId)) === "add"
    )
    if (add.length === 0) {
      continue
    }
    for (const productId of add) {
      claimedThisRun.add(productId)
    }
    const result = await batchLinkProductsToBrandWorkflow(container).run({
      input: { add, brand_id: brandId, remove: [] },
    })
    linkedProducts += result.result.added.length
  }

  // 3) Publish assignments per market with the per-market public slug.
  let writtenAssignments = 0
  for (const plan of plans) {
    const brandId = plan.existingBrandId
    if (!brandId) {
      throw new Error(`brand ${plan.slug} missing after create`)
    }
    for (const market of plan.markets) {
      await upsertAssignment(assignmentService, outboxService, {
        brandId,
        market,
        publicSlug: publicSlugForMarket(plan, market),
        salesChannelId: SALES_CHANNELS[market],
      })
      writtenAssignments += 1
    }
  }

  // 4) Drain the outbox once (same mechanism as the scheduled job).
  await dispatchUrlRegistryOutboxWorkflow(container).run({
    input: { workerId: `herbatica-brand-fill-${process.pid}-${randomUUID()}` },
  })

  logger.info(
    `Applied: created ${brandsToCreate.length} brands, linked ${linkedProducts} products, upserted ${writtenAssignments} assignments, drained outbox`
  )
  return {
    brandsCreated: brandsToCreate.length,
    linkedProducts,
    writtenAssignments,
  }
}
