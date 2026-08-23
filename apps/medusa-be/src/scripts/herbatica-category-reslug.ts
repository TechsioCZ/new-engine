import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type {
  Context,
  ExecArgs,
  ITranslationModuleService,
  Query,
  TranslationDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/medusa"
import {
  batchLinkProductsToCategoryWorkflow,
  updateTranslationsWorkflow,
} from "@medusajs/medusa/core-flows"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../modules/storefront-url-assignment"
import { enqueueCatalogAssignmentLifecycle } from "../modules/storefront-url-assignment/catalog-lifecycle"
import type StorefrontUrlAssignmentModuleService from "../modules/storefront-url-assignment/service"
import { URL_REGISTRY_OUTBOX_MODULE } from "../modules/url-registry-outbox"
import type UrlRegistryOutboxModuleService from "../modules/url-registry-outbox/service"
import { dispatchUrlRegistryOutboxWorkflow } from "../workflows/url-registry-outbox/dispatch-workflow"

// Herbatica category parity re-slug: points the cz/hu/ro routes of categories
// that already exist under machine-translated slugs at their official
// herbatica.cz / herbatica.hu / herbatica.ro slug and display name.
// The old slug survives as a url-registry alias, so no public URL is lost.
// Default = DRY RUN. `--apply` (or HERBATICA_CATEGORY_RESLUG_APPLY=1) guards
// every write. sk assignments are never touched.

type PublishMarket = "cz" | "hu" | "ro"

const SALES_CHANNELS: Readonly<Record<PublishMarket, string>> = {
  cz: "sc_01M0J13TWT6GDNSZC9MV31AT44",
  hu: "sc_01M0J13TWT4R7JN01KKXKRZKVV",
  ro: "sc_01M0J13TWT0KGBEB3ASSQJS1RE",
}

const LOCALES: Readonly<Record<PublishMarket, string>> = {
  cz: "cs-CZ",
  hu: "hu-HU",
  ro: "ro-RO",
}

const CATEGORY_REFERENCE = "product_category"
const PUBLIC_SLUG_PATTERN = /^(?=.*[a-z0-9])[a-z0-9-]+$/
const DEFAULT_INPUT = "/tmp/catdata/concept-groups.json"
const CHUNK = 200
const CATEGORY_PAGE = 500

// Concept identity (first member's `market:slug` in the input) -> handle of the
// live Slovak-source category that already carries the concept. Established by
// descendant-inclusive product-set overlap against every live category; the
// per-concept overlap is re-computed and printed on every run so a drifted
// mapping is visible before it is applied.
const RESLUG_TARGETS: Readonly<Record<string, string>> = {
  "hu:a-legjobb-a-herbatica-tol-bestseller-topseller": "ine-najpredavanejsie",
  "hu:borgomba": "trapi-ma-kozne-problemy-plesne",
  "hu:borhamlasztas": "prirodna-kozmetika-pletova-kozmetika-pletove-peelingy",
  "hu:kannabisz": "ucinne-zlozky-od-a-po-z-konope",
  "hu:kozmetikumok-ferfiaknak": "prirodna-kozmetika-pre-muza",
  // The official concept is massage products as a whole, which is the parent
  // category (144 products across its children), not "Masážne krémy" (107).
  "hu:masszazstermekek": "prirodna-kozmetika-masazne-pomocky",
  "ro:accesorii-eco": "eko-domacnost-eko-doplnky",
  "ro:acne":
    "prirodna-kozmetika-pletova-kozmetika-podla-typu-pleti-mastna-plet-so-sklonom-k-akne",
  "ro:gura-lupului-de-baikal": "ucinne-zlozky-od-a-po-z-sisiak-bajkalsky",
  "ro:matreata":
    "prirodna-kozmetika-starostlivost-o-vlasy-vlasova-diagnostika-lupiny",
  "ro:produse-pentru-protectie-solara":
    "prirodna-kozmetika-telova-kozmetika-pripravky-na-opalovanie",
  // 2026-08 batch: official-sitemap reconciliation gaps confirmed by
  // per-market product-set overlap against official category pages.
  // cz:jine also carries ro:alte (both are the official root "Other" page);
  // hu:fogapolas also carries ro:ingrijire-dentara (dental care concept).
  "cz:bestseller-topseller-nejoblibenejsi-produkty": "ine-najpredavanejsie",
  "cz:jine": "ine",
  "hu:fogapolas": "prirodna-kozmetika-ustna-hygiena",
  "hu:haj-dusitasa":
    "prirodna-kozmetika-starostlivost-o-vlasy-vlasova-diagnostika-objem-vlasov",
  "ro:casa-eco": "eko-domacnost",
  "ro:dintr-o-singura-planta": "ine-jednodruhove-caje",
  "ro:infectii-fungice": "trapi-ma-kozne-problemy-plesne",
  "ro:ingrijire-labe-si-gheare":
    "veterinarna-starostlivost-psy-starostlivost-o-labky-a-pazuriky",
  "ro:ingrijirea-corpului": "prirodna-kozmetika-telova-kozmetika",
  "ro:ingrijirea-tenului": "prirodna-kozmetika-pletova-kozmetika",
  "ro:piele": "trapi-ma-kozne-problemy",
  "ro:seturi-cadou": "ine-vyhodne-sety-a-darcekove-balenia",
  "ro:ulei-de-catina-presat-la-rece-2": "ine-rakytnikovy-olej-a-stava",
}

type ConceptMember = Readonly<{
  market: PublishMarket
  name: string
  slug: string
}>

type Concept = Readonly<{
  key: string
  members: readonly ConceptMember[]
  productIds: readonly string[]
  targetHandle: string
}>

type CliOptions = Readonly<{
  apply: boolean
  input: string
  only: ReadonlySet<string> | null
}>

const parseArgs = (args: string[]): CliOptions => {
  // `medusa exec` can swallow a bare `--apply`; env vars are the fallback.
  let apply = process.env.HERBATICA_CATEGORY_RESLUG_APPLY === "1"
  let input = process.env.HERBATICA_CATEGORY_RESLUG_INPUT ?? DEFAULT_INPUT
  const onlyEnv = process.env.HERBATICA_CATEGORY_RESLUG_ONLY ?? ""
  let only = onlyEnv.trim() === "" ? null : onlyEnv.split(",")
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === "--apply") {
      apply = true
    } else if (arg === "--input") {
      const next = args[index + 1]
      if (!next) {
        throw new Error("--input requires a path")
      }
      input = next
      index += 1
    } else if (arg === "--only") {
      const next = args[index + 1]
      if (!next) {
        throw new Error("--only requires a comma-separated concept key list")
      }
      only = next.split(",")
      index += 1
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }
  return {
    apply,
    input,
    only: only
      ? new Set(only.map((value) => value.trim()).filter(Boolean))
      : null,
  }
}

const isPublishMarket = (value: unknown): value is PublishMarket =>
  value === "cz" || value === "hu" || value === "ro"

const readMember = (value: unknown, label: string): ConceptMember | null => {
  if (!(value && typeof value === "object")) {
    throw new Error(`${label} member is not an object`)
  }
  const record = value as Record<string, unknown>
  if (!isPublishMarket(record.market)) {
    return null
  }
  const { name, slug } = record
  if (typeof slug !== "string" || !PUBLIC_SLUG_PATTERN.test(slug)) {
    throw new Error(`${label} member has an invalid slug`)
  }
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error(`${label} member ${slug} has an invalid name`)
  }
  return { market: record.market, name: name.trim(), slug }
}

const loadConcepts = (options: CliOptions): Concept[] => {
  const raw: unknown = JSON.parse(readFileSync(options.input, "utf8"))
  if (!Array.isArray(raw)) {
    throw new Error("concept groups input must be an array")
  }
  const concepts: Concept[] = []
  for (const [index, value] of raw.entries()) {
    if (!(value && typeof value === "object")) {
      throw new Error(`group ${index} is not an object`)
    }
    const record = value as Record<string, unknown>
    const productIds = record.productIds
    if (
      !Array.isArray(productIds) ||
      productIds.some((entry) => typeof entry !== "string" || entry === "")
    ) {
      throw new Error(`group ${index} has an invalid productIds list`)
    }
    const rawMembers = record.members
    if (!Array.isArray(rawMembers)) {
      throw new Error(`group ${index} has an invalid members list`)
    }
    const members = rawMembers
      .map((member) => readMember(member, `group ${index}`))
      .filter((member): member is ConceptMember => member !== null)
    const firstMember = members[0]
    if (productIds.length === 0 || !firstMember) {
      continue
    }
    const key = `${firstMember.market}:${firstMember.slug}`
    const targetHandle = RESLUG_TARGETS[key]
    if (!targetHandle) {
      continue
    }
    if (
      new Set(members.map((member) => member.market)).size !== members.length
    ) {
      throw new Error(`concept ${key} publishes a market more than once`)
    }
    if (options.only && !options.only.has(key)) {
      continue
    }
    concepts.push({
      key,
      members,
      productIds: [...new Set(productIds as string[])],
      targetHandle,
    })
  }
  const expected = options.only
    ? [...options.only].filter((key) => RESLUG_TARGETS[key])
    : Object.keys(RESLUG_TARGETS)
  if (concepts.length !== expected.length) {
    throw new Error(
      `expected ${expected.length} re-slug concepts in the input, resolved ${concepts.length}`
    )
  }
  const handles = concepts.map((concept) => concept.targetHandle)
  if (new Set(handles).size !== handles.length) {
    throw new Error("two concepts resolve to the same target category")
  }
  return concepts
}

const chunk = <Value>(values: readonly Value[], size: number): Value[][] => {
  const result: Value[][] = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }
  return result
}

type CategoryNode = Readonly<{
  handle: string
  id: string
  name: string
  parentId: string | null
  productIds: ReadonlySet<string>
}>

const readCategoryTree = async (query: Query): Promise<CategoryNode[]> => {
  const nodes: CategoryNode[] = []
  for (let skip = 0; ; skip += CATEGORY_PAGE) {
    const { data } = await query.graph({
      entity: "product_category",
      fields: ["id", "name", "handle", "parent_category_id", "products.id"],
      pagination: { skip, take: CATEGORY_PAGE },
    })
    const rows = data as Array<{
      handle: string
      id: string
      name: string
      parent_category_id?: null | string
      products?: Array<{ id: string } | null> | null
    }>
    for (const row of rows) {
      nodes.push({
        handle: row.handle,
        id: row.id,
        name: row.name,
        parentId: row.parent_category_id ?? null,
        productIds: new Set(
          (row.products ?? [])
            .filter((product): product is { id: string } =>
              Boolean(product?.id)
            )
            .map((product) => product.id)
        ),
      })
    }
    if (rows.length < CATEGORY_PAGE) {
      break
    }
  }
  return nodes
}

// A category page lists its own products plus every descendant's, so
// membership has to be judged on the whole subtree. Linking a product that a
// child already carries would only duplicate the row.
const buildSubtreeMembership = (
  nodes: readonly CategoryNode[]
): Map<string, Set<string>> => {
  const childrenByParent = new Map<string, string[]>()
  const byId = new Map(nodes.map((node) => [node.id, node]))
  for (const node of nodes) {
    if (!node.parentId) {
      continue
    }
    const siblings = childrenByParent.get(node.parentId) ?? []
    siblings.push(node.id)
    childrenByParent.set(node.parentId, siblings)
  }
  const memo = new Map<string, Set<string>>()
  const resolve = (id: string, seen: Set<string>): Set<string> => {
    const cached = memo.get(id)
    if (cached) {
      return cached
    }
    if (seen.has(id)) {
      throw new Error(`category tree has a cycle at ${id}`)
    }
    seen.add(id)
    const node = byId.get(id)
    const collected = new Set(node ? node.productIds : [])
    for (const childId of childrenByParent.get(id) ?? []) {
      for (const productId of resolve(childId, seen)) {
        collected.add(productId)
      }
    }
    seen.delete(id)
    memo.set(id, collected)
    return collected
  }
  for (const node of nodes) {
    resolve(node.id, new Set())
  }
  return memo
}

const overlapAgainst = (
  wanted: ReadonlySet<string>,
  candidate: ReadonlySet<string>
) => {
  let intersection = 0
  for (const productId of wanted) {
    if (candidate.has(productId)) {
      intersection += 1
    }
  }
  const union = wanted.size + candidate.size - intersection
  return { intersection, jaccard: union === 0 ? 0 : intersection / union }
}

const readCategoryTranslations = async (
  translationService: ITranslationModuleService,
  categoryIds: readonly string[]
): Promise<Map<string, TranslationDTO>> => {
  const byIdentity = new Map<string, TranslationDTO>()
  for (const idChunk of chunk(categoryIds, CHUNK)) {
    const rows = await translationService.listTranslations(
      { reference: CATEGORY_REFERENCE, reference_id: [...idChunk] },
      {
        select: ["id", "reference_id", "locale_code", "translations"],
        take: idChunk.length * 8,
      }
    )
    for (const row of rows) {
      byIdentity.set(`${row.reference_id} ${row.locale_code}`, row)
    }
  }
  return byIdentity
}

type AssignmentSnapshot = Readonly<{
  entityId: string
  id: string
  market: string
  publicSlug: string
  publicationStatus: string
  salesChannelId: string
}>

const readCategoryAssignments = async (
  assignmentService: StorefrontUrlAssignmentModuleService
): Promise<AssignmentSnapshot[]> => {
  const snapshots: AssignmentSnapshot[] = []
  const pageSize = 500
  for (let skip = 0; ; skip += pageSize) {
    const page = await assignmentService.listStorefrontUrlAssignments(
      { entity_kind: "category" },
      { skip, take: pageSize }
    )
    for (const record of page) {
      snapshots.push({
        entityId: record.entity_id,
        id: record.id,
        market: record.market_code,
        publicSlug: record.public_slug,
        publicationStatus: record.publication_status,
        salesChannelId: record.sales_channel_id,
      })
    }
    if (page.length < pageSize) {
      break
    }
  }
  return snapshots
}

// Same lock/identity/enqueue shape as herbatica-brand-fill, narrowed to the
// update path: the assignment always already exists here.
const reslugAssignment = async (
  assignmentService: StorefrontUrlAssignmentModuleService,
  outboxService: UrlRegistryOutboxModuleService,
  input: {
    categoryId: string
    market: PublishMarket
    publicSlug: string
  }
): Promise<boolean> => {
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
    if (identityRows.length !== 1) {
      throw new Error(
        `category ${input.categoryId} ${input.market} assignment identity is not unique`
      )
    }
    const existing = identityRows[0]
    if (!existing) {
      throw new Error(
        `category ${input.categoryId} ${input.market} assignment disappeared`
      )
    }
    const salesChannelId = SALES_CHANNELS[input.market]
    if (existing.sales_channel_id !== salesChannelId) {
      throw new Error(
        `category ${input.categoryId} ${input.market} is bound to an unexpected sales channel`
      )
    }
    if (
      existing.public_slug === input.publicSlug &&
      existing.publication_status === "published"
    ) {
      return
    }
    const persisted = await assignmentService.updateStorefrontUrlAssignments(
      {
        id: existing.id,
        publication_status: "published" as const,
        public_slug: input.publicSlug,
        sales_channel_id: salesChannelId,
        source_version: Number(existing.source_version) + 1,
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

type MarketPlan = {
  currentName: string
  currentSlug: string
  market: PublishMarket
  officialName: string
  officialSlug: string
  renameTranslation: boolean
  reslug: boolean
  translationId: string
  translations: Record<string, unknown>
}

type ConceptPlan = {
  categoryId: string
  concept: Concept
  coverage: number
  jaccard: number
  markets: MarketPlan[]
  productsToLink: string[]
  targetName: string
}

const buildMarketPlan = (input: {
  assignments: readonly AssignmentSnapshot[]
  categoryId: string
  concept: Concept
  member: ConceptMember
  translations: ReadonlyMap<string, TranslationDTO>
}): MarketPlan => {
  const { assignments, categoryId, concept, member, translations } = input
  const assignment = assignments.find(
    (row) => row.entityId === categoryId && row.market === member.market
  )
  if (!assignment) {
    throw new Error(
      `concept ${concept.key} target has no ${member.market} assignment to re-slug`
    )
  }
  if (assignment.publicationStatus !== "published") {
    throw new Error(
      `concept ${concept.key} ${member.market} assignment is not published`
    )
  }
  const conflict = assignments.find(
    (row) =>
      row.market === member.market &&
      row.publicSlug === member.slug &&
      row.entityId !== categoryId
  )
  if (conflict) {
    throw new Error(
      `official slug ${member.market}/${member.slug} is already owned by ${conflict.entityId}`
    )
  }
  const locale = LOCALES[member.market]
  const translation = translations.get(`${categoryId} ${locale}`)
  if (!translation) {
    throw new Error(
      `concept ${concept.key} target has no ${locale} translation row`
    )
  }
  const values = translation.translations
  if (typeof values !== "object" || values === null || Array.isArray(values)) {
    throw new Error(
      `concept ${concept.key} ${locale} translation payload is not an object`
    )
  }
  const record = values as Record<string, unknown>
  const currentName = typeof record.name === "string" ? record.name : ""
  return {
    currentName,
    currentSlug: assignment.publicSlug,
    market: member.market,
    officialName: member.name,
    officialSlug: member.slug,
    renameTranslation: currentName !== member.name,
    reslug: assignment.publicSlug !== member.slug,
    translationId: translation.id,
    translations: record,
  }
}

export default async function herbaticaCategoryReslug({
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
  const concepts = loadConcepts(options)
  const nodes = await readCategoryTree(query)
  const byHandle = new Map(nodes.map((node) => [node.handle, node]))
  const subtree = buildSubtreeMembership(nodes)
  const assignments = await readCategoryAssignments(assignmentService)

  const categoryIds = concepts.map((concept) => {
    const node = byHandle.get(concept.targetHandle)
    if (!node) {
      throw new Error(
        `concept ${concept.key} target category ${concept.targetHandle} does not exist`
      )
    }
    return node.id
  })
  const translations = await readCategoryTranslations(
    translationService,
    categoryIds
  )

  const plan: ConceptPlan[] = concepts.map((concept, index) => {
    const categoryId = categoryIds[index]
    const node = byHandle.get(concept.targetHandle)
    if (!(categoryId && node)) {
      throw new Error(`concept ${concept.key} target resolution failed`)
    }
    const members = subtree.get(categoryId) ?? new Set<string>()
    const wanted = new Set(concept.productIds)
    const { intersection, jaccard } = overlapAgainst(wanted, members)
    return {
      categoryId,
      concept,
      coverage: wanted.size === 0 ? 1 : intersection / wanted.size,
      jaccard,
      markets: concept.members.map((member) =>
        buildMarketPlan({
          assignments,
          categoryId,
          concept,
          member,
          translations,
        })
      ),
      productsToLink: concept.productIds.filter(
        (productId) => !members.has(productId)
      ),
      targetName: node.name,
    }
  })

  const totals = {
    links: plan.reduce((sum, row) => sum + row.productsToLink.length, 0),
    renames: plan.reduce(
      (sum, row) =>
        sum + row.markets.filter((market) => market.renameTranslation).length,
      0
    ),
    reslugs: plan.reduce(
      (sum, row) => sum + row.markets.filter((market) => market.reslug).length,
      0
    ),
  }

  logger.info("=== Herbatica category re-slug plan ===")
  logger.info(`mode: ${options.apply ? "APPLY" : "DRY-RUN"}`)
  logger.info(`input: ${options.input}`)
  logger.info(
    `concepts: ${plan.length} | slug changes: ${totals.reslugs} | translation renames: ${totals.renames} | product links to add: ${totals.links}`
  )
  logger.info(
    "no categories are created or deleted; sk/cz assignments and slugs are untouched"
  )
  for (const row of plan) {
    logger.info(
      `- ${row.concept.key} -> "${row.targetName}" [${row.concept.targetHandle}] subtree-overlap J=${row.jaccard.toFixed(2)} cover=${Math.round(row.coverage * 100)}% link+${row.productsToLink.length}`
    )
    for (const market of row.markets) {
      logger.info(
        `    ${market.market}: slug ${market.currentSlug} -> ${market.officialSlug} ${market.reslug ? "(CHANGE, old slug becomes an alias)" : "(unchanged)"} | name "${market.currentName}" -> "${market.officialName}" ${market.renameTranslation ? "(RENAME)" : "(unchanged)"}`
      )
    }
    if (row.jaccard < 0.5) {
      logger.info(
        `    WARNING: subtree overlap below 0.5; confirm this concept really belongs to ${row.concept.targetHandle}`
      )
    }
  }

  if (!options.apply) {
    logger.info("Dry-run complete; no data was written")
    return {
      concepts: plan.length,
      linksToAdd: totals.links,
      renames: totals.renames,
      reslugs: totals.reslugs,
    }
  }

  logger.info("Applying category re-slug...")

  // Only `name` is rewritten. The other five fields are editorial or generic
  // import copy that never mentioned the old machine-translated name, so
  // regenerating them would destroy real content.
  const translationUpdates = plan.flatMap((row) =>
    row.markets
      .filter((market) => market.renameTranslation)
      .map((market) => ({
        id: market.translationId,
        translations: { ...market.translations, name: market.officialName },
      }))
  )
  if (translationUpdates.length > 0) {
    await updateTranslationsWorkflow(container).run({
      input: { translations: translationUpdates },
    })
  }

  let linkedProducts = 0
  for (const row of plan) {
    if (row.productsToLink.length === 0) {
      continue
    }
    for (const idChunk of chunk(row.productsToLink, CHUNK)) {
      await batchLinkProductsToCategoryWorkflow(container).run({
        input: { add: idChunk, id: row.categoryId, remove: [] },
      })
      linkedProducts += idChunk.length
    }
  }

  let writtenAssignments = 0
  for (const row of plan) {
    for (const market of row.markets) {
      const written = await reslugAssignment(assignmentService, outboxService, {
        categoryId: row.categoryId,
        market: market.market,
        publicSlug: market.officialSlug,
      })
      if (written) {
        writtenAssignments += 1
      }
    }
  }

  await dispatchUrlRegistryOutboxWorkflow(container).run({
    input: {
      workerId: `herbatica-category-reslug-${process.pid}-${randomUUID()}`,
    },
  })

  logger.info(
    `Applied: renamed ${translationUpdates.length} translations, linked ${linkedProducts} products, re-slugged ${writtenAssignments} assignments, drained outbox`
  )
  return {
    linkedProducts,
    renamedTranslations: translationUpdates.length,
    writtenAssignments,
  }
}
