import { randomUUID } from "node:crypto"
import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type {
  Context,
  ExecArgs,
  ITranslationModuleService,
  Query,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/medusa"
import { createTranslationsWorkflow } from "@medusajs/medusa/core-flows"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../modules/storefront-url-assignment"
import { enqueueCatalogAssignmentLifecycle } from "../modules/storefront-url-assignment/catalog-lifecycle"
import type { StorefrontUrlAssignmentRecord } from "../modules/storefront-url-assignment/models/storefront-url-assignment"
import type StorefrontUrlAssignmentModuleService from "../modules/storefront-url-assignment/service"
import { URL_REGISTRY_OUTBOX_MODULE } from "../modules/url-registry-outbox"
import type UrlRegistryOutboxModuleService from "../modules/url-registry-outbox/service"
import { dispatchUrlRegistryOutboxWorkflow } from "../workflows/url-registry-outbox/dispatch-workflow"

// Herbatika category market parity.
//
// A product detail page fails closed when any category the product is linked to
// has no active URL Registry projection in the requested market
// (`readRequiredPublicEntitySlugs({ kind: "category", ... })` in
// `apps/herbatika/src/pages/~sf/[market]/products/[slug].tsx`). A category that
// is published for only some markets therefore takes down every PDP that links
// it on the remaining markets.
//
// This script restores the invariant: every active, non-internal category that
// has linked products carries a published storefront URL assignment AND a
// locale translation for all four markets. It never invents a public slug -
// market copy must be declared in MARKET_CONTENT below, otherwise the category
// is reported as operator work and skipped.
//
// Default = DRY RUN. `--apply` (or HERBATICA_CATEGORY_MARKET_PARITY_APPLY=1)
// guards every write. Re-running after a successful apply is a no-op.

type Market = "sk" | "cz" | "hu" | "ro"

const MARKETS: readonly Market[] = ["sk", "cz", "hu", "ro"]

// Slovak is the catalog base language: the category row itself carries the
// Slovak name, so an `sk-SK` translation row is optional and is not treated as
// missing market data.
const BASE_MARKET: Market = "sk"

const SALES_CHANNELS: Readonly<Record<Market, string>> = {
  cz: "sc_01M0J13TWT6GDNSZC9MV31AT44",
  hu: "sc_01M0J13TWT4R7JN01KKXKRZKVV",
  ro: "sc_01M0J13TWT0KGBEB3ASSQJS1RE",
  sk: "sc_01M0J13TWTKC82JH6TX7VDMC7B",
}

const LOCALES: Readonly<Record<Market, string>> = {
  cz: "cs-CZ",
  hu: "hu-HU",
  ro: "ro-RO",
  sk: "sk-SK",
}

const CATEGORY_REFERENCE = "product_category"
const PUBLIC_SLUG_PATTERN = /^(?=.*[a-z0-9])[a-z0-9-]+$/
const CATEGORY_PAGE = 500
const CHUNK = 200

type MarketContent = Readonly<{ name: string; slug: string }>

// Reviewed per-market names and public slugs, keyed by Medusa category handle.
// Both entries below cover demo categories created by `herbatica-category-fill`
// for HU parity, which published sk+hu only and left cz/ro unprojected.
// The live CZ projection for `akne` was published separately as `akne-2`; an
// already published slug wins over this table, so that route is left alone.
const MARKET_CONTENT: Readonly<
  Record<string, Partial<Record<Market, MarketContent>>>
> = {
  akne: {
    cz: { name: "Akné", slug: "akne" },
    ro: { name: "Acnee", slug: "acnee" },
  },
  "starostlivost-o-tvar": {
    cz: { name: "Péče o obličej", slug: "pece-o-oblicej" },
    ro: { name: "Îngrijirea feței", slug: "ingrijirea-fetei" },
  },
}

const categoryTranslation = (
  market: Market,
  name: string
): Record<string, string> => {
  if (market === "cz") {
    return {
      bottom_description_html: `<p>Máte dotaz k produktům v kategorii ${name}? Kontaktujte nás.</p>`,
      description: `Produkty v kategorii ${name} v nabídce Herbatica. Demo text, finální popis doplní provozovatel.`,
      meta_description: `Objevte produkty v kategorii ${name} v e-shopu Herbatica.`,
      meta_title: `${name} | Herbatica`,
      name,
      top_description_html: `<p>V této kategorii jsme shromáždili produkty související s tématem ${name}.</p>`,
    }
  }
  if (market === "ro") {
    return {
      bottom_description_html: `<p>Aveți întrebări despre produsele din categoria ${name}? Contactați-ne.</p>`,
      description: `Produse din categoria ${name} disponibile la Herbatica. Text demonstrativ, descrierea finală va fi completată de operator.`,
      meta_description: `Descoperiți produsele din categoria ${name} în magazinul online Herbatica.`,
      meta_title: `${name} | Herbatica`,
      name,
      top_description_html: `<p>În această categorie am reunit produsele legate de ${name}.</p>`,
    }
  }
  if (market === "hu") {
    return {
      bottom_description_html: `<p>Kérdése van a(z) ${name} kategória termékeivel kapcsolatban? Vegye fel velünk a kapcsolatot.</p>`,
      description: `${name} termékek a Herbatica kínálatában. Demó szöveg, a végleges leírást az üzemeltető készíti el.`,
      meta_description: `Fedezze fel a(z) ${name} kategória termékeit a Herbatica webáruházában.`,
      meta_title: `${name} | Herbatica`,
      name,
      top_description_html: `<p>Ebben a kategóriában a(z) ${name} témához kapcsolódó termékeket gyűjtöttük össze.</p>`,
    }
  }
  return {
    bottom_description_html: `<p>Máte otázku k produktom v kategórii ${name}? Kontaktujte nás.</p>`,
    description: `Produkty v kategórii ${name} v ponuke Herbatica. Demo text, finálny popis doplní prevádzkovateľ.`,
    meta_description: `Objavte produkty v kategórii ${name} v e-shope Herbatica.`,
    meta_title: `${name} | Herbatica`,
    name,
    top_description_html: `<p>V tejto kategórii sme zhromaždili produkty súvisiace s témou ${name}.</p>`,
  }
}

type Options = Readonly<{ apply: boolean; only: ReadonlySet<string> | null }>

const parseArgs = (args: readonly string[]): Options => {
  let apply = process.env.HERBATICA_CATEGORY_MARKET_PARITY_APPLY === "1"
  const only = new Set<string>()
  for (const arg of args) {
    if (arg === "--apply") {
      apply = true
      continue
    }
    if (arg === "--dry-run") {
      apply = false
      continue
    }
    if (arg.startsWith("--only=")) {
      for (const handle of arg.slice("--only=".length).split(",")) {
        if (handle) {
          only.add(handle)
        }
      }
      continue
    }
    throw new Error(`unknown argument ${arg}`)
  }
  return { apply, only: only.size > 0 ? only : null }
}

const chunk = <Value>(values: readonly Value[], size: number): Value[][] => {
  const result: Value[][] = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }
  return result
}

type CategorySnapshot = Readonly<{
  handle: string
  id: string
  isActive: boolean
  isInternal: boolean
  name: string
  productCount: number
}>

const readCategorySnapshots = async (
  query: Query
): Promise<CategorySnapshot[]> => {
  const snapshots: CategorySnapshot[] = []
  for (let skip = 0; ; skip += CATEGORY_PAGE) {
    const { data } = await query.graph({
      entity: "product_category",
      fields: [
        "id",
        "handle",
        "name",
        "is_active",
        "is_internal",
        "products.id",
      ],
      pagination: { skip, take: CATEGORY_PAGE },
    })
    const rows = data as Array<{
      handle: string
      id: string
      is_active: boolean
      is_internal: boolean
      name: string
      products?: Array<{ id: string } | null> | null
    }>
    for (const row of rows) {
      snapshots.push({
        handle: row.handle,
        id: row.id,
        isActive: row.is_active === true,
        isInternal: row.is_internal === true,
        name: row.name,
        productCount: (row.products ?? []).filter((product) =>
          Boolean(product?.id)
        ).length,
      })
    }
    if (rows.length < CATEGORY_PAGE) {
      break
    }
  }
  return snapshots
}

const readCategoryTranslations = async (
  translationService: ITranslationModuleService,
  categoryIds: readonly string[]
): Promise<Set<string>> => {
  const existing = new Set<string>()
  for (const idChunk of chunk(categoryIds, CHUNK)) {
    const rows = await translationService.listTranslations(
      { reference: CATEGORY_REFERENCE, reference_id: [...idChunk] },
      {
        select: ["id", "reference_id", "locale_code"],
        take: idChunk.length * 8,
      }
    )
    for (const row of rows) {
      existing.add(`${row.reference_id} ${row.locale_code}`)
    }
  }
  return existing
}

const readCategoryAssignments = async (
  assignmentService: StorefrontUrlAssignmentModuleService
): Promise<Map<string, StorefrontUrlAssignmentRecord>> => {
  const byIdentity = new Map<string, StorefrontUrlAssignmentRecord>()
  const pageSize = 500
  for (let skip = 0; ; skip += pageSize) {
    const page = await assignmentService.listStorefrontUrlAssignments(
      { entity_kind: "category" },
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

const upsertAssignment = async (
  assignmentService: StorefrontUrlAssignmentModuleService,
  outboxService: UrlRegistryOutboxModuleService,
  input: {
    categoryId: string
    market: Market
    publicSlug: string
  }
): Promise<boolean> => {
  const salesChannelId = SALES_CHANNELS[input.market]
  let written = false
  await assignmentService.runInTransaction(async (sharedContext) => {
    await assignmentService.lockCatalogEntityAssignments(
      "category",
      input.categoryId,
      sharedContext
    )
    const identityRows = await assignmentService.listStorefrontUrlAssignments(
      {
        entity_id: input.categoryId,
        entity_kind: "category",
        market_code: input.market,
      },
      { take: 2 },
      sharedContext
    )
    if (identityRows.length > 1) {
      throw new Error(
        `category ${input.categoryId} ${input.market} assignment identity is ambiguous`
      )
    }
    const existing = identityRows[0]
    if (
      existing &&
      existing.public_slug === input.publicSlug &&
      existing.sales_channel_id === salesChannelId &&
      existing.publication_status === "published"
    ) {
      return
    }
    const desired = {
      publication_status: "published" as const,
      public_slug: input.publicSlug,
      sales_channel_id: salesChannelId,
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
            entity_id: input.categoryId,
            entity_kind: "category",
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
    written = true
  })
  return written
}

type PlanEntry = Readonly<{
  content: MarketContent
  market: Market
  needsAssignment: boolean
  needsTranslation: boolean
}>

type PlanRow = Readonly<{
  category: CategorySnapshot
  entries: readonly PlanEntry[]
}>

const resolveContent = (
  category: CategorySnapshot,
  market: Market,
  assignment: StorefrontUrlAssignmentRecord | undefined
): MarketContent | null => {
  const declared = MARKET_CONTENT[category.handle]?.[market]
  if (declared) {
    return declared
  }
  // An already published slug is authoritative; only the translation may be
  // missing, so no new public slug has to be invented.
  return assignment?.public_slug
    ? { name: category.name, slug: assignment.public_slug }
    : null
}

type PlanInputs = Readonly<{
  blocked: string[]
  existingAssignments: ReadonlyMap<string, StorefrontUrlAssignmentRecord>
  existingTranslations: ReadonlySet<string>
  slugOwners: ReadonlyMap<string, string>
}>

const planMarketEntry = (
  category: CategorySnapshot,
  market: Market,
  inputs: PlanInputs
): PlanEntry | null => {
  const assignment = inputs.existingAssignments.get(`${category.id} ${market}`)
  const published =
    assignment?.publication_status === "published" &&
    Boolean(assignment.public_slug) &&
    assignment.sales_channel_id === SALES_CHANNELS[market]
  const hasTranslation =
    market === BASE_MARKET ||
    inputs.existingTranslations.has(`${category.id} ${LOCALES[market]}`)
  // An existing row that an operator moved off "published" is deliberate
  // unpublication, never missing data. Filling it in would silently re-publish
  // a category somebody took down, so only absent rows are created here.
  const withheld = Boolean(assignment) && !published
  if ((published || withheld) && hasTranslation) {
    if (withheld) {
      inputs.blocked.push(
        `${category.handle} (${category.id}) ${market}: assignment is ${assignment?.publication_status ?? "unknown"}, left untouched`
      )
    }
    return null
  }
  const content = resolveContent(category, market, assignment)
  if (!content) {
    inputs.blocked.push(
      `${category.handle} (${category.id}) ${market}: no reviewed name/slug declared`
    )
    return null
  }
  if (!PUBLIC_SLUG_PATTERN.test(content.slug)) {
    throw new Error(
      `category ${category.handle} ${market} slug ${content.slug} is not a valid public slug`
    )
  }
  const owner = inputs.slugOwners.get(`${market} ${content.slug}`)
  if (owner && owner !== category.id) {
    throw new Error(
      `slug ${market}/${content.slug} for category ${category.handle} is already owned by ${owner}`
    )
  }
  if (withheld) {
    inputs.blocked.push(
      `${category.handle} (${category.id}) ${market}: assignment is ${assignment?.publication_status ?? "unknown"}, left untouched`
    )
  }
  return {
    content,
    market,
    needsAssignment: !(published || withheld),
    needsTranslation: !hasTranslation,
  }
}

const buildPlan = (
  candidates: readonly CategorySnapshot[],
  inputs: PlanInputs
): PlanRow[] => {
  const plan: PlanRow[] = []
  for (const category of candidates) {
    const entries = MARKETS.map((market) =>
      planMarketEntry(category, market, inputs)
    ).filter((entry): entry is PlanEntry => entry !== null)
    if (entries.length > 0) {
      plan.push({ category, entries })
    }
  }
  return plan
}

const describeEntry = (entry: PlanEntry) =>
  `${entry.market}:${entry.content.slug}[${[
    entry.needsAssignment ? "assignment" : null,
    entry.needsTranslation ? "translation" : null,
  ]
    .filter(Boolean)
    .join("+")}]`

const applyPlan = async (
  container: ExecArgs["container"],
  plan: readonly PlanRow[],
  services: Readonly<{
    assignmentService: StorefrontUrlAssignmentModuleService
    outboxService: UrlRegistryOutboxModuleService
  }>
) => {
  const translationsToCreate = plan.flatMap((row) =>
    row.entries
      .filter((entry) => entry.needsTranslation)
      .map((entry) => ({
        locale_code: LOCALES[entry.market],
        reference: CATEGORY_REFERENCE,
        reference_id: row.category.id,
        translations: categoryTranslation(entry.market, entry.content.name),
      }))
  )
  if (translationsToCreate.length > 0) {
    await createTranslationsWorkflow(container).run({
      input: { translations: translationsToCreate },
    })
  }

  let writtenAssignments = 0
  for (const row of plan) {
    for (const entry of row.entries) {
      if (!entry.needsAssignment) {
        continue
      }
      const written = await upsertAssignment(
        services.assignmentService,
        services.outboxService,
        {
          categoryId: row.category.id,
          market: entry.market,
          publicSlug: entry.content.slug,
        }
      )
      if (written) {
        writtenAssignments += 1
      }
    }
  }

  await dispatchUrlRegistryOutboxWorkflow(container).run({
    input: {
      workerId: `herbatica-category-market-parity-${process.pid}-${randomUUID()}`,
    },
  })

  return {
    translationsCreated: translationsToCreate.length,
    writtenAssignments,
  }
}

export default async function herbaticaCategoryMarketParity({
  args,
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const translationService = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )
  const assignmentService =
    container.resolve<StorefrontUrlAssignmentModuleService>(
      STOREFRONT_URL_ASSIGNMENT_MODULE
    )
  const outboxService = container.resolve<UrlRegistryOutboxModuleService>(
    URL_REGISTRY_OUTBOX_MODULE
  )

  const options = parseArgs(args)
  const snapshots = await readCategorySnapshots(query)
  const candidates = snapshots.filter(
    (category) =>
      category.isActive &&
      !category.isInternal &&
      category.productCount > 0 &&
      (!options.only || options.only.has(category.handle))
  )
  const existingTranslations = await readCategoryTranslations(
    translationService,
    candidates.map((category) => category.id)
  )
  const existingAssignments = await readCategoryAssignments(assignmentService)

  const slugOwners = new Map<string, string>()
  for (const record of existingAssignments.values()) {
    slugOwners.set(
      `${record.market_code} ${record.public_slug}`,
      record.entity_id
    )
  }

  const blocked: string[] = []
  const plan = buildPlan(candidates, {
    blocked,
    existingAssignments,
    existingTranslations,
    slugOwners,
  })

  const totals = {
    assignments: plan.reduce(
      (sum, row) =>
        sum + row.entries.filter((entry) => entry.needsAssignment).length,
      0
    ),
    translations: plan.reduce(
      (sum, row) =>
        sum + row.entries.filter((entry) => entry.needsTranslation).length,
      0
    ),
  }

  logger.info("=== Herbatica category market parity ===")
  logger.info(`mode: ${options.apply ? "APPLY" : "DRY-RUN"}`)
  logger.info(
    `categories scanned: ${candidates.length} | incomplete: ${plan.length} | assignments to write: ${totals.assignments} | translations to create: ${totals.translations}`
  )
  for (const row of plan) {
    logger.info(
      `- ${row.category.handle} (${row.category.id}, ${row.category.productCount} products): ${row.entries
        .map(describeEntry)
        .join(" ")}`
    )
  }
  for (const line of blocked) {
    logger.info(`BLOCKED (operator content required): ${line}`)
  }

  if (!options.apply) {
    logger.info("Dry-run complete; no data was written")
    return {
      assignments: totals.assignments,
      blocked: blocked.length,
      categories: plan.length,
      translations: totals.translations,
    }
  }

  const applied = await applyPlan(container, plan, {
    assignmentService,
    outboxService,
  })

  logger.info(
    `Applied: created ${applied.translationsCreated} translations, wrote ${applied.writtenAssignments} assignments, drained outbox`
  )
  return { blocked: blocked.length, ...applied }
}
