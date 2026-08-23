import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type {
  Context,
  ExecArgs,
  IProductModuleService,
  ITranslationModuleService,
  Query,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/medusa"
import {
  batchLinkProductsToCategoryWorkflow,
  createProductCategoriesWorkflow,
  createTranslationsWorkflow,
} from "@medusajs/medusa/core-flows"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../modules/storefront-url-assignment"
import { enqueueCatalogAssignmentLifecycle } from "../modules/storefront-url-assignment/catalog-lifecycle"
import type { StorefrontUrlAssignmentRecord } from "../modules/storefront-url-assignment/models/storefront-url-assignment"
import type StorefrontUrlAssignmentModuleService from "../modules/storefront-url-assignment/service"
import { URL_REGISTRY_OUTBOX_MODULE } from "../modules/url-registry-outbox"
import type UrlRegistryOutboxModuleService from "../modules/url-registry-outbox/service"
import { dispatchUrlRegistryOutboxWorkflow } from "../workflows/url-registry-outbox/dispatch-workflow"

// Herbatika category parity fill: publishes the official herbatica.hu/.ro
// category slugs that the Medusa catalog does not carry yet.
// Default = DRY RUN. `--apply` (or HERBATICA_CATEGORY_FILL_APPLY=1) guards
// every write.

type PublishMarket = "hu" | "ro"

const SALES_CHANNELS: Readonly<Record<"sk" | PublishMarket, string>> = {
  hu: "sc_01M0J13TWT4R7JN01KKXKRZKVV",
  ro: "sc_01M0J13TWT0KGBEB3ASSQJS1RE",
  sk: "sc_01M0J13TWTKC82JH6TX7VDMC7B",
}

const LOCALES: Readonly<Record<"sk" | PublishMarket, string>> = {
  hu: "hu-HU",
  ro: "ro-RO",
  sk: "sk-SK",
}

const CATEGORY_REFERENCE = "product_category"
const PUBLIC_SLUG_PATTERN = /^(?=.*[a-z0-9])[a-z0-9-]+$/
const DEFAULT_INPUT = "/tmp/catdata/concept-groups.json"
const CHUNK = 200
const CATEGORY_PAGE = 500

// Concept identity is the FIRST member's `market:slug` from the input file.
// `handle` is the Slovak-source base row handle (also the SK public slug when
// SK parity is enabled); `skName` is the Slovak base row name. Both are demo
// grade per the recorded operator authorization.
type ConceptDefinition = Readonly<{ handle: string; skName: string }>

const CONCEPTS: Readonly<Record<string, ConceptDefinition>> = {
  "hu:a-legjobb-a-herbatica-tol-bestseller-topseller": {
    handle: "herbatica-bestseller",
    skName: "Herbatica Bestseller",
  },
  "hu:akne": {
    // Official problem-node category ("Trápi ma | Kožné problémy | Akné").
    // Distinct from the skin-type node mastna-plet-so-sklonom-k-akne even
    // though the official product sets currently coincide.
    handle: "akne",
    skName: "Akné",
  },
  "hu:arcapolas": {
    handle: "starostlivost-o-tvar",
    skName: "Starostlivosť o tvár",
  },
  "hu:borgomba": { handle: "kozne-plesne", skName: "Kožné plesne" },
  "hu:borhamlasztas": { handle: "peeling-pokozky", skName: "Peeling pokožky" },
  "hu:kannabisz": { handle: "kanabis", skName: "Kanabis" },
  "hu:kozmetikumok-ferfiaknak": {
    handle: "kozmetika-pre-muzov",
    skName: "Kozmetika pre mužov",
  },
  "hu:masszazstermekek": {
    handle: "masazne-pripravky",
    skName: "Masážne prípravky",
  },
  "ro:accesorii-eco": {
    handle: "eko-prislusenstvo",
    skName: "EKO príslušenstvo",
  },
  "ro:acne": { handle: "akne-pokozka", skName: "Akné" },
  "ro:gura-lupului-de-baikal": {
    handle: "sisiak-bajkalsky-rastlina",
    skName: "Šišiak bajkalský",
  },
  "ro:matreata": {
    handle: "lupiny-pokozky-hlavy",
    skName: "Lupiny pokožky hlavy",
  },
  "ro:produse-pentru-protectie-solara": {
    handle: "opalovacie-pripravky",
    skName: "Opaľovacie prípravky",
  },
}

type ConceptMember = Readonly<{
  market: PublishMarket
  name: string
  slug: string
}>

type ConceptGroup = Readonly<{
  definition: ConceptDefinition
  key: string
  members: readonly ConceptMember[]
  productIds: readonly string[]
}>

type CliOptions = Readonly<{
  apply: boolean
  input: string
  only: ReadonlySet<string> | null
  skParity: boolean
}>

const envFlag = (name: string, fallback: boolean) => {
  const value = process.env[name]
  if (value === undefined || value === "") {
    return fallback
  }
  return value === "1"
}

const parseArgs = (args: string[]): CliOptions => {
  // `medusa exec` can swallow a bare `--apply`; env vars are the fallback.
  let apply = envFlag("HERBATICA_CATEGORY_FILL_APPLY", false)
  let input = process.env.HERBATICA_CATEGORY_FILL_INPUT ?? DEFAULT_INPUT
  const onlyEnv = process.env.HERBATICA_CATEGORY_FILL_ONLY ?? ""
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
    skParity: envFlag("HERBATICA_CATEGORY_FILL_SK_PARITY", true),
  }
}

const isPublishMarket = (value: unknown): value is PublishMarket =>
  value === "hu" || value === "ro"

const readMember = (value: unknown, label: string): ConceptMember | null => {
  if (!(value && typeof value === "object")) {
    throw new Error(`${label} member is not an object`)
  }
  const record = value as Record<string, unknown>
  if (!isPublishMarket(record.market)) {
    // cz stub groups carry no products and are filtered out by the caller.
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

const loadGroups = (options: CliOptions): ConceptGroup[] => {
  const raw: unknown = JSON.parse(readFileSync(options.input, "utf8"))
  if (!Array.isArray(raw)) {
    throw new Error("concept groups input must be an array")
  }
  const groups: ConceptGroup[] = []
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
    if (productIds.length === 0) {
      continue
    }
    const rawMembers = record.members
    if (!Array.isArray(rawMembers) || rawMembers.length === 0) {
      throw new Error(`group ${index} has an invalid members list`)
    }
    const members = rawMembers
      .map((member) => readMember(member, `group ${index}`))
      .filter((member): member is ConceptMember => member !== null)
    if (members.length === 0) {
      throw new Error(`group ${index} has products but no hu/ro member`)
    }
    const firstMember = members[0]
    if (!firstMember) {
      throw new Error(`group ${index} has no resolvable first member`)
    }
    const key = `${firstMember.market}:${firstMember.slug}`
    const definition = CONCEPTS[key]
    if (!definition) {
      throw new Error(`group ${index} concept ${key} has no base definition`)
    }
    if (
      new Set(members.map((member) => member.market)).size !== members.length
    ) {
      throw new Error(`concept ${key} publishes a market more than once`)
    }
    if (options.only && !options.only.has(key)) {
      continue
    }
    groups.push({
      definition,
      key,
      members,
      productIds: [...new Set(productIds as string[])],
    })
  }
  if (groups.length === 0) {
    throw new Error("no concept groups selected")
  }
  const handles = groups.map((group) => group.definition.handle)
  if (new Set(handles).size !== handles.length) {
    throw new Error("concept definitions reuse a base handle")
  }
  return groups
}

const chunk = <Value>(values: readonly Value[], size: number): Value[][] => {
  const result: Value[][] = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }
  return result
}

const localizedTranslation = (
  market: PublishMarket,
  name: string
): Record<string, string> =>
  market === "hu"
    ? {
        bottom_description_html: `<p>Kérdése van a(z) ${name} kategória termékeivel kapcsolatban? Vegye fel velünk a kapcsolatot.</p>`,
        description: `${name} termékek a Herbatica kínálatában. Demó szöveg, a végleges leírást az üzemeltető készíti el.`,
        meta_description: `Fedezze fel a(z) ${name} kategória termékeit a Herbatica webáruházában.`,
        meta_title: `${name} | Herbatica`,
        name,
        top_description_html: `<p>Ebben a kategóriában a(z) ${name} témához kapcsolódó termékeket gyűjtöttük össze.</p>`,
      }
    : {
        bottom_description_html: `<p>Aveți întrebări despre produsele din categoria ${name}? Contactați-ne.</p>`,
        description: `Produse din categoria ${name} disponibile la Herbatica. Text demonstrativ, descrierea finală va fi completată de operator.`,
        meta_description: `Descoperiți produsele din categoria ${name} în magazinul online Herbatica.`,
        meta_title: `${name} | Herbatica`,
        name,
        top_description_html: `<p>În această categorie am reunit produsele legate de ${name}.</p>`,
      }

const slovakTranslation = (name: string): Record<string, string> => ({
  bottom_description_html: `<p>Máte otázku k produktom v kategórii ${name}? Kontaktujte nás.</p>`,
  description: `Produkty v kategórii ${name} v ponuke Herbatica. Demo text, finálny popis doplní prevádzkovateľ.`,
  meta_description: `Objavte produkty v kategórii ${name} v e-shope Herbatica.`,
  meta_title: `${name} | Herbatica`,
  name,
  top_description_html: `<p>V tejto kategórii sme zhromaždili produkty súvisiace s témou ${name}.</p>`,
})

type CategorySnapshot = Readonly<{
  id: string
  name: string
  productIds: ReadonlySet<string>
}>

const readCategorySnapshots = async (
  query: Query
): Promise<Map<string, CategorySnapshot>> => {
  const snapshots = new Map<string, CategorySnapshot>()
  for (let skip = 0; ; skip += CATEGORY_PAGE) {
    const { data } = await query.graph({
      entity: "product_category",
      fields: ["id", "name", "handle", "products.id"],
      pagination: { skip, take: CATEGORY_PAGE },
    })
    const rows = data as Array<{
      handle: string
      id: string
      name: string
      products?: Array<{ id: string } | null> | null
    }>
    for (const row of rows) {
      snapshots.set(row.handle, {
        id: row.id,
        name: row.name,
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
  return snapshots
}

// A concept whose product set already matches a live category is a naming
// variant, not a missing category. Surfacing it keeps the operator from
// publishing a duplicate concept page under the official slug.
const nearestExistingCategory = (
  group: ConceptGroup,
  snapshots: ReadonlyMap<string, CategorySnapshot>
) => {
  const wanted = new Set(group.productIds)
  let best: { handle: string; name: string; overlap: number } | null = null
  for (const [handle, snapshot] of snapshots) {
    if (handle === group.definition.handle || snapshot.productIds.size === 0) {
      continue
    }
    let intersection = 0
    for (const productId of wanted) {
      if (snapshot.productIds.has(productId)) {
        intersection += 1
      }
    }
    const union = wanted.size + snapshot.productIds.size - intersection
    const overlap = union === 0 ? 0 : intersection / union
    if (!best || overlap > best.overlap) {
      best = { handle, name: snapshot.name, overlap }
    }
  }
  return best
}

const readMissingProductIds = async (
  productService: IProductModuleService,
  productIds: readonly string[]
): Promise<string[]> => {
  const found = new Set<string>()
  for (const idChunk of chunk(productIds, CHUNK)) {
    const rows = await productService.listProducts(
      { id: [...idChunk] },
      { select: ["id"], take: idChunk.length }
    )
    for (const row of rows) {
      found.add(row.id)
    }
  }
  return productIds.filter((productId) => !found.has(productId))
}

const readCategoryTranslations = async (
  translationService: ITranslationModuleService,
  categoryIds: readonly string[]
): Promise<Set<string>> => {
  const existing = new Set<string>()
  if (categoryIds.length === 0) {
    return existing
  }
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
    market: string
    publicSlug: string
    salesChannelId: string
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
    if (identityRows.length > 1) {
      throw new Error(
        `category ${input.categoryId} ${input.market} assignment identity is ambiguous`
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

type PlanRow = {
  categoryId: string | null
  group: ConceptGroup
  linksToAdd: string[]
  localesToCreate: string[]
  marketsToPublish: string[]
  nearest: { handle: string; name: string; overlap: number } | null
}

const marketsFor = (group: ConceptGroup, skParity: boolean) => {
  const markets: Array<{
    market: "sk" | PublishMarket
    name: string
    slug: string
  }> = group.members.map((member) => ({
    market: member.market,
    name: member.name,
    slug: member.slug,
  }))
  if (skParity) {
    markets.unshift({
      market: "sk",
      name: group.definition.skName,
      slug: group.definition.handle,
    })
  }
  return markets
}

export default async function herbaticaCategoryFill({
  args,
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const productService = container.resolve<IProductModuleService>(
    Modules.PRODUCT
  )
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
  const groups = loadGroups(options)
  const snapshots = await readCategorySnapshots(query)

  const allProductIds = [
    ...new Set(groups.flatMap((group) => [...group.productIds])),
  ]
  const missingProductIds = await readMissingProductIds(
    productService,
    allProductIds
  )
  if (missingProductIds.length > 0) {
    throw new Error(
      `input references ${missingProductIds.length} unknown product ids, e.g. ${missingProductIds.slice(0, 5).join(", ")}`
    )
  }

  const existingCategoryIds = groups
    .map((group) => snapshots.get(group.definition.handle)?.id)
    .filter((id): id is string => typeof id === "string")
  const existingTranslations = await readCategoryTranslations(
    translationService,
    existingCategoryIds
  )
  const existingAssignments = await readCategoryAssignments(assignmentService)

  const slugOwners = new Map<string, string>()
  for (const record of existingAssignments.values()) {
    slugOwners.set(
      `${record.market_code} ${record.public_slug}`,
      record.entity_id
    )
  }

  const plan: PlanRow[] = groups.map((group) => {
    const snapshot = snapshots.get(group.definition.handle) ?? null
    const categoryId = snapshot?.id ?? null
    const linksToAdd = group.productIds.filter(
      (productId) => !snapshot?.productIds.has(productId)
    )
    const localesToCreate = marketsFor(group, options.skParity)
      .map((entry) => LOCALES[entry.market])
      .filter(
        (locale) =>
          !(categoryId && existingTranslations.has(`${categoryId} ${locale}`))
      )
    const marketsToPublish = marketsFor(group, options.skParity)
      .filter((entry) => {
        if (!categoryId) {
          return true
        }
        const record = existingAssignments.get(`${categoryId} ${entry.market}`)
        return !(
          record &&
          record.public_slug === entry.slug &&
          record.sales_channel_id === SALES_CHANNELS[entry.market] &&
          record.publication_status === "published"
        )
      })
      .map((entry) => `${entry.market}:${entry.slug}`)
    for (const entry of marketsFor(group, options.skParity)) {
      const owner = slugOwners.get(`${entry.market} ${entry.slug}`)
      if (owner && owner !== categoryId) {
        throw new Error(
          `slug ${entry.market}/${entry.slug} for concept ${group.key} is already owned by ${owner}`
        )
      }
    }
    return {
      categoryId,
      group,
      linksToAdd,
      localesToCreate,
      marketsToPublish,
      nearest: nearestExistingCategory(group, snapshots),
    }
  })

  const categoriesToCreate = plan.filter((row) => row.categoryId === null)
  const totals = {
    links: plan.reduce((sum, row) => sum + row.linksToAdd.length, 0),
    publications: plan.reduce(
      (sum, row) => sum + row.marketsToPublish.length,
      0
    ),
    translations: plan.reduce(
      (sum, row) => sum + row.localesToCreate.length,
      0
    ),
  }

  logger.info("=== Herbatica category parity fill plan ===")
  logger.info(`mode: ${options.apply ? "APPLY" : "DRY-RUN"}`)
  logger.info(`input: ${options.input}`)
  logger.info(
    `sk parity assignments: ${options.skParity ? "ON" : "OFF"} (the Slovak store category list is unfiltered by publication, so every active category needs an sk route or /kategorie and the SK category pages fail closed)`
  )
  logger.info(
    `concepts: ${plan.length} | categories to create: ${categoriesToCreate.length} | reused: ${plan.length - categoriesToCreate.length}`
  )
  logger.info(
    `product links to add: ${totals.links} | translations to create: ${totals.translations} | assignments to write: ${totals.publications}`
  )
  for (const row of plan) {
    const nearest = row.nearest
    const overlap = nearest ? Math.round(nearest.overlap * 100) : 0
    logger.info(
      `- ${row.group.key} -> handle=${row.group.definition.handle} sk="${row.group.definition.skName}" products=${row.group.productIds.length} links+${row.linksToAdd.length} locales=[${row.localesToCreate.join(",")}] publish=[${row.marketsToPublish.join(",")}]`
    )
    logger.info(
      `    nearest existing category by product-set overlap: ${nearest ? `${overlap}% "${nearest.name}" (${nearest.handle})` : "none"}`
    )
    if (overlap >= 70) {
      logger.info(
        `    DUPLICATE RISK: ${overlap}% product overlap means this official slug most likely renames an existing category instead of adding a new one`
      )
    }
  }

  if (!options.apply) {
    logger.info("Dry-run complete; no data was written")
    return {
      categoriesToCreate: categoriesToCreate.length,
      concepts: plan.length,
      linksToAdd: totals.links,
      publications: totals.publications,
      translations: totals.translations,
    }
  }

  logger.info("Applying category parity fill...")

  if (categoriesToCreate.length > 0) {
    await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: categoriesToCreate.map((row) => ({
          description: `Demo kategória doplnená pre paritu s oficiálnym katalógom Herbatica (${row.group.key}).`,
          handle: row.group.definition.handle,
          is_active: true,
          is_internal: false,
          metadata: {
            demo_generated: true,
            herbatica_concept_key: row.group.key,
            herbatica_official_slugs: row.group.members
              .map((member) => `${member.market}:${member.slug}`)
              .join(","),
            source: "herbatica-category-fill",
          },
          name: row.group.definition.skName,
        })),
      },
    })
  }

  const refreshed = await readCategorySnapshots(query)
  for (const row of plan) {
    const snapshot = refreshed.get(row.group.definition.handle)
    if (!snapshot) {
      throw new Error(
        `category ${row.group.definition.handle} missing after create`
      )
    }
    row.categoryId = snapshot.id
    row.linksToAdd = row.group.productIds.filter(
      (productId) => !snapshot.productIds.has(productId)
    )
  }

  const translationsToCreate = plan.flatMap((row) => {
    const categoryId = row.categoryId
    if (!categoryId) {
      return []
    }
    return marketsFor(row.group, options.skParity)
      .filter(
        (entry) =>
          !existingTranslations.has(`${categoryId} ${LOCALES[entry.market]}`)
      )
      .map((entry) => ({
        locale_code: LOCALES[entry.market],
        reference: CATEGORY_REFERENCE,
        reference_id: categoryId,
        translations:
          entry.market === "sk"
            ? slovakTranslation(entry.name)
            : localizedTranslation(entry.market, entry.name),
      }))
  })
  if (translationsToCreate.length > 0) {
    await createTranslationsWorkflow(container).run({
      input: { translations: translationsToCreate },
    })
  }

  let linkedProducts = 0
  for (const row of plan) {
    const categoryId = row.categoryId
    if (!categoryId || row.linksToAdd.length === 0) {
      continue
    }
    for (const idChunk of chunk(row.linksToAdd, CHUNK)) {
      await batchLinkProductsToCategoryWorkflow(container).run({
        input: { add: idChunk, id: categoryId, remove: [] },
      })
      linkedProducts += idChunk.length
    }
  }

  let writtenAssignments = 0
  for (const row of plan) {
    const categoryId = row.categoryId
    if (!categoryId) {
      throw new Error(`concept ${row.group.key} has no category id`)
    }
    for (const entry of marketsFor(row.group, options.skParity)) {
      const written = await upsertAssignment(assignmentService, outboxService, {
        categoryId,
        market: entry.market,
        publicSlug: entry.slug,
        salesChannelId: SALES_CHANNELS[entry.market],
      })
      if (written) {
        writtenAssignments += 1
      }
    }
  }

  await dispatchUrlRegistryOutboxWorkflow(container).run({
    input: {
      workerId: `herbatica-category-fill-${process.pid}-${randomUUID()}`,
    },
  })

  logger.info(
    `Applied: created ${categoriesToCreate.length} categories, created ${translationsToCreate.length} translations, linked ${linkedProducts} products, wrote ${writtenAssignments} assignments, drained outbox`
  )
  return {
    categoriesCreated: categoriesToCreate.length,
    linkedProducts,
    translationsCreated: translationsToCreate.length,
    writtenAssignments,
  }
}
