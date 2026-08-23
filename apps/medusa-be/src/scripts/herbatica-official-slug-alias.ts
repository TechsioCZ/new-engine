import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import type {
  ExecArgs,
  ITranslationModuleService,
  Query,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/medusa"
import {
  createTranslationsWorkflow,
  updateTranslationsWorkflow,
} from "@medusajs/medusa/core-flows"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../modules/storefront-url-assignment"
import { enqueueCatalogAssignmentLifecycle } from "../modules/storefront-url-assignment/catalog-lifecycle"
import type { StorefrontUrlAssignmentEntityKind } from "../modules/storefront-url-assignment/contracts"
import type StorefrontUrlAssignmentModuleService from "../modules/storefront-url-assignment/service"
import { URL_REGISTRY_OUTBOX_MODULE } from "../modules/url-registry-outbox"
import type UrlRegistryOutboxModuleService from "../modules/url-registry-outbox/service"
import { isCompleteCategoryPublicationTranslation } from "../utils/catalog-publication-predicate"
import { dispatchUrlRegistryOutboxWorkflow } from "../workflows/url-registry-outbox/dispatch-workflow"

// Herbatica official URL-space coverage: adopts the live herbatica.{sk,cz,hu,ro}
// category and brand slugs that our registry does not carry at all, so those
// indexed inbound URLs resolve instead of hard-404 after cutover.
//
// Mechanism: the url-registry command surface has no add-alias command, and
// `assertSlugAvailable` plus the `UNIQUE (market, kind, normalized_slug)`
// constraint span dispositions, so a slug that already exists as an alias can
// never be promoted back to current. The only supported write is a one-way
// change-slug: the official slug becomes the CURRENT public slug and our
// previous slug survives as a permanent alias that 308-redirects to it.
//
// `/store/url-registry/catalog/sources` refuses to confirm a catalog assignment
// whose exact market-locale Translation row is missing OR incomplete
// (`isCompleteCategoryPublicationTranslation` also demands a `description`
// key), so the outbox delivery for such an entity retries forever and
// `catalog-translation-url-registry` unpublishes the assignment on the next
// Translation event. `--backfill-locale-names` therefore writes the same full
// demo payload `herbatica-category-market-parity` uses, and repairs rows that
// an earlier name-only write left incomplete, for planned entities only.
//
// A category that was unpublished while its Translation was incomplete stays
// draft forever - nothing republishes it - so `--republish-drafted` restores
// `published` for planned entities whose Translation this run made complete.
//
// Default = DRY RUN. `HERBATICA_OFFICIAL_ALIAS_APPLY=1` guards every write
// (`medusa exec` swallows bare flags, so env vars are the primary switch).

const MARKETS = ["sk", "cz", "hu", "ro"] as const
type Market = (typeof MARKETS)[number]

const LOCALES: Readonly<Record<Market, string>> = {
  cz: "cs-CZ",
  hu: "hu-HU",
  ro: "ro-RO",
  sk: "sk-SK",
}

const ENTITY_KINDS = ["category", "brand"] as const
type EntityKind = (typeof ENTITY_KINDS)[number]

const CATEGORY_REFERENCE = "product_category"
const PUBLIC_SLUG_PATTERN = /^(?=.*[a-z0-9])[a-z0-9-]+$/
const DEFAULT_INPUT = "/tmp/catdata/official-slug-alias-mapping.json"
const ASSIGNMENT_PAGE = 500
const CATEGORY_PAGE = 500

type MappingEntry = Readonly<{
  currentSlug: string
  kind: EntityKind
  market: Market
  officialSlug: string
  rank: number
}>

type CliOptions = Readonly<{
  apply: boolean
  backfillLocaleNames: boolean
  input: string
  markets: ReadonlySet<Market> | null
  only: ReadonlySet<string> | null
  republishDrafted: boolean
}>

const isMarket = (value: unknown): value is Market =>
  MARKETS.includes(value as Market)

const isEntityKind = (value: unknown): value is EntityKind =>
  ENTITY_KINDS.includes(value as EntityKind)

const splitList = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)

const parseMarkets = (value: string): Set<Market> => {
  const parsed = new Set<Market>()
  for (const entry of splitList(value)) {
    if (!isMarket(entry)) {
      throw new Error(`Unknown market: ${entry}`)
    }
    parsed.add(entry)
  }
  return parsed
}

const VALUE_FLAGS = new Set(["--input", "--market", "--only"])

const collectFlags = (args: readonly string[]): Map<string, string> => {
  const flags = new Map<string, string>()
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? ""
    if (
      arg === "--apply" ||
      arg === "--backfill-locale-names" ||
      arg === "--republish-drafted"
    ) {
      flags.set(arg, "1")
      continue
    }
    if (!VALUE_FLAGS.has(arg)) {
      throw new Error(`Unknown argument: ${arg}`)
    }
    const next = args[index + 1]
    if (!next) {
      throw new Error(`${arg} requires a value`)
    }
    flags.set(arg, next)
    index += 1
  }
  return flags
}

const parseArgs = (args: string[]): CliOptions => {
  const flags = collectFlags(args)
  const marketRaw =
    flags.get("--market") ?? process.env.HERBATICA_OFFICIAL_ALIAS_MARKET ?? ""
  const onlyRaw =
    flags.get("--only") ?? process.env.HERBATICA_OFFICIAL_ALIAS_ONLY ?? ""
  return {
    apply:
      flags.has("--apply") ||
      process.env.HERBATICA_OFFICIAL_ALIAS_APPLY === "1",
    backfillLocaleNames:
      flags.has("--backfill-locale-names") ||
      process.env.HERBATICA_OFFICIAL_ALIAS_BACKFILL_LOCALE_NAMES === "1",
    input:
      flags.get("--input") ??
      process.env.HERBATICA_OFFICIAL_ALIAS_INPUT ??
      DEFAULT_INPUT,
    markets: marketRaw.trim() === "" ? null : parseMarkets(marketRaw),
    only: onlyRaw.trim() === "" ? null : new Set(splitList(onlyRaw)),
    republishDrafted:
      flags.has("--republish-drafted") ||
      process.env.HERBATICA_OFFICIAL_ALIAS_REPUBLISH === "1",
  }
}

const readEntry = (value: unknown, label: string): MappingEntry => {
  if (!(value && typeof value === "object")) {
    throw new Error(`${label} is not an object`)
  }
  const record = value as Record<string, unknown>
  const { currentSlug, kind, market, officialSlug } = record
  if (!isMarket(market)) {
    throw new Error(`${label} has an unknown market`)
  }
  if (!isEntityKind(kind)) {
    throw new Error(`${label} has an unsupported entity kind`)
  }
  if (
    typeof officialSlug !== "string" ||
    !PUBLIC_SLUG_PATTERN.test(officialSlug)
  ) {
    throw new Error(`${label} has an invalid officialSlug`)
  }
  if (
    typeof currentSlug !== "string" ||
    !PUBLIC_SLUG_PATTERN.test(currentSlug)
  ) {
    throw new Error(`${label} has an invalid currentSlug`)
  }
  if (currentSlug === officialSlug) {
    throw new Error(`${label} maps a slug onto itself`)
  }
  const rank = record.rank ?? 0
  if (typeof rank !== "number" || !Number.isSafeInteger(rank)) {
    throw new Error(`${label} has an invalid rank`)
  }
  return { currentSlug, kind, market, officialSlug, rank }
}

const loadMapping = (options: CliOptions): MappingEntry[] => {
  const raw: unknown = JSON.parse(readFileSync(options.input, "utf8"))
  const list = Array.isArray(raw)
    ? raw
    : (raw as Record<string, unknown> | null)?.entries
  if (!Array.isArray(list)) {
    throw new Error("mapping input must be an array or { entries: [...] }")
  }
  const entries = list.map((value, index) =>
    readEntry(value, `mapping entry ${index}`)
  )
  const identities = new Set<string>()
  for (const entry of entries) {
    const identity = `${entry.market}|${entry.kind}|${entry.officialSlug}`
    if (identities.has(identity)) {
      throw new Error(`mapping repeats official slug ${identity}`)
    }
    identities.add(identity)
  }
  const selected = entries.filter(
    (entry) =>
      (!options.markets || options.markets.has(entry.market)) &&
      (!options.only || options.only.has(entry.officialSlug))
  )
  // A route can receive more than one official slug. The last write wins the
  // `current` disposition, so lower ranks are applied first and the highest
  // rank decides the canonical slug.
  return selected.sort(
    (left, right) =>
      left.market.localeCompare(right.market) ||
      left.rank - right.rank ||
      left.officialSlug.localeCompare(right.officialSlug)
  )
}

type AssignmentSnapshot = Readonly<{
  entityId: string
  entityKind: EntityKind
  id: string
  market: Market
  publicSlug: string
  publicationStatus: string
}>

const readAssignments = async (
  assignmentService: StorefrontUrlAssignmentModuleService
): Promise<AssignmentSnapshot[]> => {
  const snapshots: AssignmentSnapshot[] = []
  for (const entityKind of ENTITY_KINDS) {
    for (let skip = 0; ; skip += ASSIGNMENT_PAGE) {
      const page = await assignmentService.listStorefrontUrlAssignments(
        { entity_kind: entityKind },
        { skip, take: ASSIGNMENT_PAGE }
      )
      for (const record of page) {
        if (!isMarket(record.market_code)) {
          continue
        }
        snapshots.push({
          entityId: record.entity_id,
          entityKind,
          id: record.id,
          market: record.market_code,
          publicSlug: record.public_slug,
          publicationStatus: record.publication_status,
        })
      }
      if (page.length < ASSIGNMENT_PAGE) {
        break
      }
    }
  }
  return snapshots
}

type PlanRow = Readonly<{
  action: "adopt" | "skip-already-adopted"
  drafted: boolean
  entityId: string
  entry: MappingEntry
}>

const buildPlan = (
  entries: readonly MappingEntry[],
  assignments: readonly AssignmentSnapshot[],
  allowDrafted: boolean
): PlanRow[] => {
  const byIdentity = new Map<string, AssignmentSnapshot[]>()
  for (const assignment of assignments) {
    const key = `${assignment.market}|${assignment.entityKind}|${assignment.publicSlug}`
    byIdentity.set(key, [...(byIdentity.get(key) ?? []), assignment])
  }
  const findUnique = (
    entry: MappingEntry,
    slug: string
  ): AssignmentSnapshot | null => {
    const matches =
      byIdentity.get(`${entry.market}|${entry.kind}|${slug}`) ?? []
    if (matches.length > 1) {
      throw new Error(
        `${entry.market} ${entry.kind} slug ${slug} is claimed by ${matches.length} assignments`
      )
    }
    return matches[0] ?? null
  }
  // The index stays on the pre-run snapshot: several official slugs can target
  // the same route, and each write re-reads the assignment by entity id, so a
  // `currentSlug` that an earlier entry already replaced still resolves here.
  const plan: PlanRow[] = []
  for (const entry of entries) {
    const adopted = findUnique(entry, entry.officialSlug)
    if (adopted) {
      plan.push({
        action:
          adopted.publicationStatus === "published" || !allowDrafted
            ? "skip-already-adopted"
            : "adopt",
        drafted: adopted.publicationStatus !== "published",
        entityId: adopted.entityId,
        entry,
      })
      continue
    }
    const source = findUnique(entry, entry.currentSlug)
    if (!source) {
      throw new Error(
        `${entry.market} ${entry.kind} has no assignment on slug ${entry.currentSlug} for official ${entry.officialSlug}`
      )
    }
    const drafted = source.publicationStatus !== "published"
    if (drafted && !allowDrafted) {
      throw new Error(
        `${entry.market} ${entry.kind} ${entry.currentSlug} is not published`
      )
    }
    plan.push({ action: "adopt", drafted, entityId: source.entityId, entry })
  }
  return plan
}

const adoptOfficialSlug = async (
  assignmentService: StorefrontUrlAssignmentModuleService,
  outboxService: UrlRegistryOutboxModuleService,
  input: {
    entityId: string
    entityKind: StorefrontUrlAssignmentEntityKind
    market: Market
    publicSlug: string
    republish: boolean
  }
): Promise<boolean> => {
  let written = false
  await assignmentService.runInTransaction(async (sharedContext) => {
    await assignmentService.lockCatalogEntityAssignments(
      input.entityKind,
      input.entityId,
      sharedContext
    )
    const identityRows = await assignmentService.listStorefrontUrlAssignments(
      {
        entity_id: input.entityId,
        entity_kind: input.entityKind,
        market_code: input.market,
      },
      { take: 2 },
      sharedContext
    )
    if (identityRows.length !== 1) {
      throw new Error(
        `${input.entityKind} ${input.entityId} ${input.market} assignment identity is not unique`
      )
    }
    const existing = identityRows[0]
    if (!existing) {
      throw new Error(
        `${input.entityKind} ${input.entityId} ${input.market} assignment disappeared`
      )
    }
    const republish =
      input.republish && existing.publication_status !== "published"
    if (existing.public_slug === input.publicSlug && !republish) {
      return
    }
    const persisted = await assignmentService.updateStorefrontUrlAssignments(
      {
        id: existing.id,
        public_slug: input.publicSlug,
        source_version: Number(existing.source_version) + 1,
        ...(republish ? { publication_status: "published" as const } : {}),
      },
      sharedContext
    )
    await enqueueCatalogAssignmentLifecycle(
      outboxService,
      persisted,
      sharedContext
    )
    written = true
  })
  return written
}

type LocalizedCategoryContent = Readonly<Record<string, string>>

// Same reviewed demo copy `herbatica-category-market-parity` writes, so a
// category backfilled here is indistinguishable from one that script created.
const categoryTranslation = (
  market: Market,
  name: string
): LocalizedCategoryContent => {
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

type MissingLocaleName = Readonly<{
  categoryId: string
  existingTranslationId: string | null
  localeCode: string
  market: Market
  name: string
  payload: LocalizedCategoryContent
}>

const readCategoryNames = async (
  query: Query
): Promise<Map<string, string>> => {
  const names = new Map<string, string>()
  for (let skip = 0; ; skip += CATEGORY_PAGE) {
    const { data } = await query.graph({
      entity: "product_category",
      fields: ["id", "name"],
      pagination: { skip, take: CATEGORY_PAGE },
    })
    const rows = data as Array<{ id: string; name: string }>
    for (const row of rows) {
      names.set(row.id, row.name)
    }
    if (rows.length < CATEGORY_PAGE) {
      break
    }
  }
  return names
}

const findMissingLocaleNames = async (input: {
  categoryNames: ReadonlyMap<string, string>
  plan: readonly PlanRow[]
  translationService: ITranslationModuleService
}): Promise<MissingLocaleName[]> => {
  const wanted = new Map<string, MissingLocaleName>()
  for (const row of input.plan) {
    if (row.entry.kind !== "category") {
      continue
    }
    const name = input.categoryNames.get(row.entityId)
    if (!name) {
      throw new Error(`category ${row.entityId} has no base name`)
    }
    wanted.set(`${row.entityId} ${LOCALES[row.entry.market]}`, {
      categoryId: row.entityId,
      existingTranslationId: null,
      localeCode: LOCALES[row.entry.market],
      market: row.entry.market,
      name,
      payload: categoryTranslation(row.entry.market, name),
    })
  }
  const categoryIds = [
    ...new Set([...wanted.values()].map((v) => v.categoryId)),
  ]
  if (categoryIds.length === 0) {
    return []
  }
  const existing = await input.translationService.listTranslations(
    { reference: CATEGORY_REFERENCE, reference_id: categoryIds },
    {
      select: ["id", "reference_id", "locale_code", "translations"],
      take: categoryIds.length * 8,
    }
  )
  for (const row of existing) {
    const key = `${row.reference_id} ${row.locale_code}`
    const target = wanted.get(key)
    if (!target) {
      continue
    }
    // A complete row is authoritative operator copy and is never overwritten;
    // an incomplete one still fails the publication predicate, so it is
    // repaired in place instead of leaving the entity permanently blocked.
    if (isCompleteCategoryPublicationTranslation(row)) {
      wanted.delete(key)
      continue
    }
    wanted.set(key, { ...target, existingTranslationId: row.id })
  }
  return [...wanted.values()]
}

export default async function herbaticaOfficialSlugAlias({
  args,
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const assignmentService =
    container.resolve<StorefrontUrlAssignmentModuleService>(
      STOREFRONT_URL_ASSIGNMENT_MODULE
    )
  const outboxService = container.resolve<UrlRegistryOutboxModuleService>(
    URL_REGISTRY_OUTBOX_MODULE
  )

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const translationService = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )

  const options = parseArgs(args)
  const entries = loadMapping(options)
  const assignments = await readAssignments(assignmentService)
  const plan = buildPlan(entries, assignments, options.republishDrafted)
  const missingLocaleNames = options.backfillLocaleNames
    ? await findMissingLocaleNames({
        categoryNames: await readCategoryNames(query),
        plan,
        translationService,
      })
    : []

  const adoptions = plan.filter((row) => row.action === "adopt")
  const perMarket = new Map<Market, number>()
  for (const row of adoptions) {
    perMarket.set(row.entry.market, (perMarket.get(row.entry.market) ?? 0) + 1)
  }

  logger.info("=== Herbatica official slug adoption ===")
  logger.info(`mode: ${options.apply ? "APPLY" : "DRY-RUN"}`)
  logger.info(`input: ${options.input}`)
  logger.info(
    `mapping entries: ${entries.length} | to adopt: ${adoptions.length} | already adopted: ${plan.length - adoptions.length}`
  )
  logger.info(
    `per market: ${MARKETS.map((market) => `${market}=${perMarket.get(market) ?? 0}`).join(" ")}`
  )
  logger.info(
    "the official slug becomes CURRENT; the previous slug survives as a permanent 308 alias"
  )
  logger.info(
    `exact-locale category names to backfill: ${missingLocaleNames.length}${options.backfillLocaleNames ? "" : " (backfill disabled)"}`
  )
  for (const missing of missingLocaleNames) {
    logger.info(
      `    backfill ${missing.market} ${missing.localeCode} name for ${missing.categoryId} ("${missing.name}")`
    )
  }
  for (const row of plan) {
    logger.info(
      `- ${row.entry.market} ${row.entry.kind}: ${row.entry.currentSlug} -> ${row.entry.officialSlug} [${row.action}${row.drafted ? " drafted" : ""}] (${row.entityId})`
    )
  }

  if (!options.apply) {
    logger.info("Dry-run complete; no data was written")
    return {
      adoptions: adoptions.length,
      alreadyAdopted: plan.length - adoptions.length,
      entries: entries.length,
      localeNamesToBackfill: missingLocaleNames.length,
    }
  }

  const localeNamesToCreate = missingLocaleNames.filter(
    (missing) => !missing.existingTranslationId
  )
  const localeNamesToRepair = missingLocaleNames.filter(
    (missing) => missing.existingTranslationId
  )
  if (localeNamesToCreate.length > 0) {
    await createTranslationsWorkflow(container).run({
      input: {
        translations: localeNamesToCreate.map((missing) => ({
          locale_code: missing.localeCode,
          reference: CATEGORY_REFERENCE,
          reference_id: missing.categoryId,
          translations: missing.payload,
        })),
      },
    })
  }
  if (localeNamesToRepair.length > 0) {
    await updateTranslationsWorkflow(container).run({
      input: {
        translations: localeNamesToRepair.map((missing) => ({
          id: missing.existingTranslationId as string,
          translations: missing.payload,
        })),
      },
    })
  }

  let written = 0
  for (const row of adoptions) {
    const changed = await adoptOfficialSlug(assignmentService, outboxService, {
      entityId: row.entityId,
      entityKind: row.entry.kind,
      market: row.entry.market,
      publicSlug: row.entry.officialSlug,
      republish: options.republishDrafted,
    })
    if (changed) {
      written += 1
    }
  }

  await dispatchUrlRegistryOutboxWorkflow(container).run({
    input: {
      workerId: `herbatica-official-slug-alias-${process.pid}-${randomUUID()}`,
    },
  })

  logger.info(
    `Applied: backfilled ${missingLocaleNames.length} exact-locale names, adopted ${written} official slugs, dispatched the url-registry outbox`
  )
  return {
    adoptions: adoptions.length,
    alreadyAdopted: plan.length - adoptions.length,
    backfilledLocaleNames: missingLocaleNames.length,
    entries: entries.length,
    written,
  }
}
