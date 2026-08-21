import { createHash, randomUUID } from "node:crypto"
import { link, open, unlink } from "node:fs/promises"
import { isAbsolute, resolve } from "node:path"
import {
  buildFourMarketCatalogAuditReport,
  FOUR_MARKET_CATALOG_BINDINGS,
  type FourMarketCatalogAuditInput,
  type FourMarketCatalogAuditReport,
  type FourMarketCatalogExpectedMarket,
  type FourMarketCatalogExpectedPublication,
  type FourMarketCatalogExpectedTranslation,
  type FourMarketCatalogMarket,
  type FourMarketCatalogProductIdentity,
  hashFourMarketCatalogAuditReport,
} from "./catalog-audit"

const SHA256 = /^[a-f0-9]{64}$/
const LIVE_ARGUMENTS = [
  "--expected-backend-build-hash",
  "--expected-backend-deployment-id",
  "--expected-backend-release-sha",
  "--expected-backend-slot",
  "--expected-database-instance-fingerprint",
  "--expected-environment-id",
  "--expected-release-id",
  "--output",
  "--scope-authority",
  "--scope-authority-sha256",
  "--translation-authority",
  "--translation-authority-sha256",
] as const

export type FourMarketCatalogArtifactRef = Readonly<{
  path: string
  sha256: string
}>

export type FourMarketCatalogReleaseIdentity = Readonly<{
  backendBuildHash: string
  backendDeploymentId: string
  backendReleaseSha: string
  backendSlot: "blue" | "green"
  databaseInstanceFingerprint: string
  environmentId: string
  releaseId: string
}>

export type FourMarketCatalogScopeAuthority = Readonly<{
  kind: "herbatika-four-market-catalog-scope-authority"
  markets: readonly Readonly<
    Omit<FourMarketCatalogExpectedMarket, "publications"> & {
      publications: readonly Omit<
        FourMarketCatalogExpectedPublication,
        "translations"
      >[]
    }
  >[]
  schemaVersion: 1
  sharedCatalog: readonly FourMarketCatalogProductIdentity[]
}>

export type FourMarketCatalogTranslationAuthority = Readonly<{
  kind: "herbatika-four-market-catalog-translation-authority"
  markets: readonly Readonly<{
    market: FourMarketCatalogMarket
    publications: readonly Readonly<{
      contracts: readonly FourMarketCatalogExpectedTranslation[]
      entityId: string
      entityKind: string
    }>[]
  }>[]
  schemaVersion: 1
}>

export type FourMarketCatalogLiveReader = Readonly<{
  listAssignments: () => Promise<readonly unknown[]>
  listGraphRows: (
    request: Readonly<{
      entity: string
      fields: readonly string[]
      filters?: Readonly<Record<string, unknown>>
    }>
  ) => Promise<readonly unknown[]>
  listTranslations: (
    request: Readonly<{
      localeCode: string
      reference: string
    }>
  ) => Promise<readonly unknown[]>
}>

export type FourMarketCatalogLiveArtifact = Readonly<{
  audit: FourMarketCatalogAuditReport
  auditSha256: string
  authorities: Readonly<{
    scope: FourMarketCatalogArtifactRef
    translations: FourMarketCatalogArtifactRef
  }>
  capturedAt: string
  kind: "herbatika-four-market-catalog-live-readiness"
  releaseIdentity: FourMarketCatalogReleaseIdentity
  schemaVersion: 1
  scope: "four-market-catalog-readiness"
}>

export type FourMarketCatalogLiveCliOptions = Readonly<{
  expectedReleaseIdentity: FourMarketCatalogReleaseIdentity
  outputPath: string
  scopeAuthority: FourMarketCatalogArtifactRef
  translationAuthority: FourMarketCatalogArtifactRef
}>

export type FourMarketCatalogLiveDependencies = Readonly<{
  buildDatabaseInstanceFingerprint: (source: NodeJS.ProcessEnv) => string
  environment: NodeJS.ProcessEnv
  now: () => Date
  readTextFile: (path: string) => Promise<string>
  reader: FourMarketCatalogLiveReader
  writeArtifact: (
    outputPath: string,
    artifact: FourMarketCatalogLiveArtifact
  ) => Promise<void>
}>

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value))

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }
  if (!isRecord(value)) {
    return value
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])])
  )
}

const canonicalJson = (value: unknown): string =>
  JSON.stringify(canonicalize(value))

const sha256 = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex")

export const hashFourMarketCatalogArtifactBytes = (bytes: string): string =>
  sha256(bytes)

const requiredText = (value: unknown, label: string): string => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.trim() !== value
  ) {
    throw new Error(`${label} must be a non-empty string`)
  }
  return value
}

const exactKeys = (
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
  label: string
): void => {
  const observed = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (
    observed.length !== expected.length ||
    !observed.every((key, index) => key === expected[index])
  ) {
    throw new Error(`${label} must contain exactly ${expected.join(", ")}`)
  }
}

const parseJsonRecord = (
  bytes: string,
  label: string
): Readonly<Record<string, unknown>> => {
  let parsed: unknown
  try {
    parsed = JSON.parse(bytes)
  } catch {
    throw new Error(`${label} must be valid JSON`)
  }
  if (!isRecord(parsed)) {
    throw new Error(`${label} must be a JSON object`)
  }
  return parsed
}

const requiredStringArray = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`)
  }
  const values = value.map((entry, index) =>
    requiredText(entry, `${label}[${index}]`)
  )
  if (new Set(values).size !== values.length) {
    throw new Error(`${label} must not contain duplicates`)
  }
  return values
}

const nullableDeletedAt = (value: unknown): string | null =>
  typeof value === "string" ? value : null

const requiredMarket = (
  value: unknown,
  label: string
): FourMarketCatalogMarket => {
  const market = requiredText(value, label)
  const binding = FOUR_MARKET_CATALOG_BINDINGS.find(
    (candidate) => candidate.market === market
  )
  if (!binding) {
    throw new Error(`${label} must be sk, cz, hu, or ro`)
  }
  return binding.market
}

const parsePublicationScope = (
  value: unknown,
  label: string
): Omit<FourMarketCatalogExpectedPublication, "translations"> => {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`)
  }
  exactKeys(value, ["entityId", "entityKind", "publicSlug"], label)
  return {
    entityId: requiredText(value.entityId, `${label}.entityId`),
    entityKind: requiredText(value.entityKind, `${label}.entityKind`),
    publicSlug: requiredText(value.publicSlug, `${label}.publicSlug`),
  }
}

const parseSharedCatalog = (
  value: unknown
): FourMarketCatalogProductIdentity[] =>
  recordArray(value, "scopeAuthority.sharedCatalog").map((product, index) => {
    const label = `scopeAuthority.sharedCatalog[${index}]`
    exactKeys(product, ["productId", "status", "variants"], label)
    return {
      productId: requiredText(product.productId, `${label}.productId`),
      status: requiredText(product.status, `${label}.status`),
      variants: recordArray(product.variants, `${label}.variants`).map(
        (variant, variantIndex) => {
          const variantLabel = `${label}.variants[${variantIndex}]`
          exactKeys(
            variant,
            ["ean", "inventoryItemIds", "sku", "variantId"],
            variantLabel
          )
          const optionalText = (field: "ean" | "sku") => {
            const candidate = variant[field]
            return candidate === null
              ? null
              : requiredText(candidate, `${variantLabel}.${field}`)
          }
          return {
            ean: optionalText("ean"),
            inventoryItemIds: requiredStringArray(
              variant.inventoryItemIds,
              `${variantLabel}.inventoryItemIds`
            ),
            sku: optionalText("sku"),
            variantId: requiredText(
              variant.variantId,
              `${variantLabel}.variantId`
            ),
          }
        }
      ),
    }
  })

export const parseFourMarketCatalogScopeAuthority = (
  bytes: string
): FourMarketCatalogScopeAuthority => {
  const value = parseJsonRecord(bytes, "scope authority")
  exactKeys(
    value,
    ["kind", "markets", "schemaVersion", "sharedCatalog"],
    "scope authority"
  )
  if (
    value.kind !== "herbatika-four-market-catalog-scope-authority" ||
    value.schemaVersion !== 1
  ) {
    throw new Error("scope authority discriminator is invalid")
  }
  const markets = recordArray(value.markets, "scopeAuthority.markets").map(
    (market, index) => {
      const label = `scopeAuthority.markets[${index}]`
      exactKeys(
        market,
        [
          "countryCode",
          "currencyCode",
          "localeCode",
          "market",
          "publications",
          "publishedProductIds",
          "regionId",
          "salesChannelId",
        ],
        label
      )
      const binding = FOUR_MARKET_CATALOG_BINDINGS[index]
      if (
        !binding ||
        market.market !== binding.market ||
        market.countryCode !== binding.countryCode ||
        market.currencyCode !== binding.currencyCode ||
        market.localeCode !== binding.localeCode
      ) {
        throw new Error(
          "Catalog scope authority must contain each exact canonical binding in ordered SK/CZ/HU/RO profiles"
        )
      }
      return {
        ...binding,
        publications: (Array.isArray(market.publications)
          ? market.publications
          : (() => {
              throw new Error(`${label}.publications must be an array`)
            })()
        ).map((publication, publicationIndex) =>
          parsePublicationScope(
            publication,
            `${label}.publications[${publicationIndex}]`
          )
        ),
        publishedProductIds: requiredStringArray(
          market.publishedProductIds,
          `${label}.publishedProductIds`
        ),
        regionId: requiredText(market.regionId, `${label}.regionId`),
        salesChannelId: requiredText(
          market.salesChannelId,
          `${label}.salesChannelId`
        ),
      }
    }
  )
  if (!exactMarketOrder(markets)) {
    throw new Error(
      "Catalog authorities must contain exact ordered SK/CZ/HU/RO profiles"
    )
  }
  return {
    kind: "herbatika-four-market-catalog-scope-authority",
    markets,
    schemaVersion: 1,
    sharedCatalog: parseSharedCatalog(value.sharedCatalog),
  }
}

export const parseFourMarketCatalogTranslationAuthority = (
  bytes: string
): FourMarketCatalogTranslationAuthority => {
  const value = parseJsonRecord(bytes, "translation authority")
  exactKeys(
    value,
    ["kind", "markets", "schemaVersion"],
    "translation authority"
  )
  if (
    value.kind !== "herbatika-four-market-catalog-translation-authority" ||
    value.schemaVersion !== 1
  ) {
    throw new Error("translation authority discriminator is invalid")
  }
  const markets = recordArray(
    value.markets,
    "translationAuthority.markets"
  ).map((market, index) => {
    const label = `translationAuthority.markets[${index}]`
    exactKeys(market, ["market", "publications"], label)
    const binding = FOUR_MARKET_CATALOG_BINDINGS[index]
    if (!binding || market.market !== binding.market) {
      throw new Error(
        "Catalog authorities must contain exact ordered SK/CZ/HU/RO profiles"
      )
    }
    return {
      market: binding.market,
      publications: recordArray(
        market.publications,
        `${label}.publications`
      ).map((publication, publicationIndex) => {
        const publicationLabel = `${label}.publications[${publicationIndex}]`
        exactKeys(
          publication,
          ["contracts", "entityId", "entityKind"],
          publicationLabel
        )
        return {
          contracts: recordArray(
            publication.contracts,
            `${publicationLabel}.contracts`
          ).map((contract, contractIndex) => {
            const contractLabel = `${publicationLabel}.contracts[${contractIndex}]`
            exactKeys(
              contract,
              ["reference", "referenceId", "requiredFields"],
              contractLabel
            )
            return {
              reference: requiredText(
                contract.reference,
                `${contractLabel}.reference`
              ),
              referenceId: requiredText(
                contract.referenceId,
                `${contractLabel}.referenceId`
              ),
              requiredFields: requiredStringArray(
                contract.requiredFields,
                `${contractLabel}.requiredFields`
              ),
            }
          }),
          entityId: requiredText(
            publication.entityId,
            `${publicationLabel}.entityId`
          ),
          entityKind: requiredText(
            publication.entityKind,
            `${publicationLabel}.entityKind`
          ),
        }
      }),
    }
  })
  if (!exactMarketOrder(markets)) {
    throw new Error(
      "Catalog authorities must contain exact ordered SK/CZ/HU/RO profiles"
    )
  }
  return {
    kind: "herbatika-four-market-catalog-translation-authority",
    markets,
    schemaVersion: 1,
  }
}

const recordArray = (value: unknown, label: string) => {
  if (!(Array.isArray(value) && value.every(isRecord))) {
    throw new Error(`${label} must be an array of objects`)
  }
  return value
}

const exactMarketOrder = (
  markets: readonly Readonly<{ market: FourMarketCatalogMarket }>[]
): boolean =>
  markets.length === FOUR_MARKET_CATALOG_BINDINGS.length &&
  markets.every(
    (profile, index) =>
      profile.market === FOUR_MARKET_CATALOG_BINDINGS[index]?.market
  )

const authorityMarketProfiles = (
  scope: FourMarketCatalogScopeAuthority,
  translations: FourMarketCatalogTranslationAuthority
): readonly FourMarketCatalogExpectedMarket[] => {
  if (
    !(exactMarketOrder(scope.markets) && exactMarketOrder(translations.markets))
  ) {
    throw new Error(
      "Catalog authorities must contain exact ordered SK/CZ/HU/RO profiles"
    )
  }
  return scope.markets.map((scopeMarket, index) => {
    const translationMarket = translations.markets[index]
    if (!translationMarket || translationMarket.market !== scopeMarket.market) {
      throw new Error(
        "Catalog translation authority market does not match scope"
      )
    }
    const publications = scopeMarket.publications.map((publication) => {
      const matches = translationMarket.publications.filter(
        (translation) =>
          translation.entityKind === publication.entityKind &&
          translation.entityId === publication.entityId
      )
      if (matches.length !== 1) {
        throw new Error(
          `Catalog translation authority must bind exactly one ${scopeMarket.market} ${publication.entityKind}:${publication.entityId}`
        )
      }
      return { ...publication, translations: matches[0]?.contracts ?? [] }
    })
    if (translationMarket.publications.length !== publications.length) {
      throw new Error(
        "Catalog translation authority contains an unexpected publication"
      )
    }
    return { ...scopeMarket, publications }
  })
}

const mapLocales = (rows: readonly unknown[]) =>
  recordArray(rows, "locale rows").map((row) => ({
    code: requiredText(row.code, "locale.code"),
    deletedAt: nullableDeletedAt(row.deleted_at),
    id: requiredText(row.id, "locale.id"),
  }))

const mapRegions = (rows: readonly unknown[]) =>
  recordArray(rows, "region rows").map((row) => ({
    countryCodes: recordArray(row.countries ?? [], "region.countries").map(
      (country) => requiredText(country.iso_2, "region.country.iso_2")
    ),
    currencyCode: requiredText(row.currency_code, "region.currency_code"),
    deletedAt: nullableDeletedAt(row.deleted_at),
    id: requiredText(row.id, "region.id"),
  }))

const mapSalesChannels = (rows: readonly unknown[]) =>
  recordArray(rows, "sales-channel rows").map((row) => ({
    deletedAt: nullableDeletedAt(row.deleted_at),
    id: requiredText(row.id, "sales_channel.id"),
  }))

const inventoryItemsByVariant = (rows: readonly unknown[]) => {
  const index = new Map<string, string[]>()
  for (const row of recordArray(rows, "inventory-link rows")) {
    const variantId = requiredText(row.variant_id, "inventory_link.variant_id")
    const inventoryItemId = requiredText(
      row.inventory_item_id,
      "inventory_link.inventory_item_id"
    )
    index.set(variantId, [...(index.get(variantId) ?? []), inventoryItemId])
  }
  return index
}

const mapProducts = (
  rows: readonly unknown[],
  inventoryIndex: ReadonlyMap<string, readonly string[]>
) =>
  recordArray(rows, "product rows").map((row) => ({
    productId: requiredText(row.id, "product.id"),
    salesChannelIds: recordArray(
      row.sales_channels ?? [],
      "product.sales_channels"
    ).map((channel) => requiredText(channel.id, "product.sales_channel.id")),
    status: requiredText(row.status, "product.status"),
    variants: recordArray(row.variants ?? [], "product.variants").map(
      (variant) => {
        const variantId = requiredText(variant.id, "product.variant.id")
        return {
          ean: typeof variant.ean === "string" ? variant.ean : null,
          inventoryItemIds: [...(inventoryIndex.get(variantId) ?? [])].sort(),
          sku: typeof variant.sku === "string" ? variant.sku : null,
          variantId,
        }
      }
    ),
  }))

const mapAssignments = (rows: readonly unknown[]) =>
  recordArray(rows, "assignment rows").map((row) => ({
    entityId: requiredText(row.entity_id, "assignment.entity_id"),
    entityKind: requiredText(row.entity_kind, "assignment.entity_kind"),
    market: requiredMarket(row.market_code, "assignment.market_code"),
    publicSlug: requiredText(row.public_slug, "assignment.public_slug"),
    publicationStatus: requiredText(
      row.publication_status,
      "assignment.publication_status"
    ),
    salesChannelId: requiredText(
      row.sales_channel_id,
      "assignment.sales_channel_id"
    ),
  }))

const mapTranslations = (rows: readonly unknown[]) =>
  recordArray(rows, "translation rows").map((row) => {
    if (!isRecord(row.translations)) {
      throw new Error("translation.translations must be an object")
    }
    return {
      deletedAt: nullableDeletedAt(row.deleted_at),
      id: requiredText(row.id, "translation.id"),
      localeCode: requiredText(row.locale_code, "translation.locale_code"),
      reference: requiredText(row.reference, "translation.reference"),
      referenceId: requiredText(row.reference_id, "translation.reference_id"),
      translations: row.translations,
    }
  })

export const collectFourMarketCatalogAuditInput = async (
  reader: FourMarketCatalogLiveReader,
  scopeAuthority: FourMarketCatalogScopeAuthority,
  translationAuthority: FourMarketCatalogTranslationAuthority
): Promise<FourMarketCatalogAuditInput> => {
  const expectedMarkets = authorityMarketProfiles(
    scopeAuthority,
    translationAuthority
  )
  const translationRequests = expectedMarkets.flatMap((market) =>
    [
      ...new Set(
        market.publications.flatMap((publication) =>
          publication.translations.map(
            (translation) =>
              `${market.localeCode}\u0000${translation.reference}`
          )
        )
      ),
    ].map((key) => {
      const [localeCode = "", reference = ""] = key.split("\u0000")
      return { localeCode, reference }
    })
  )
  const [
    locales,
    regions,
    salesChannels,
    products,
    inventoryLinks,
    assignments,
  ] = await Promise.all([
    reader.listGraphRows({
      entity: "locale",
      fields: ["id", "code", "deleted_at"],
    }),
    reader.listGraphRows({
      entity: "region",
      fields: ["id", "currency_code", "countries.iso_2", "deleted_at"],
    }),
    reader.listGraphRows({
      entity: "sales_channel",
      fields: ["id", "deleted_at"],
    }),
    reader.listGraphRows({
      entity: "product",
      fields: [
        "id",
        "status",
        "sales_channels.id",
        "variants.id",
        "variants.sku",
        "variants.ean",
      ],
      filters: { status: "published" },
    }),
    reader.listGraphRows({
      entity: "product_variant_inventory_item",
      fields: ["variant_id", "inventory_item_id"],
    }),
    reader.listAssignments(),
  ])
  const translations = await Promise.all(
    translationRequests.map((request) => reader.listTranslations(request))
  )
  const inventoryIndex = inventoryItemsByVariant(inventoryLinks)
  return {
    assignments: mapAssignments(assignments),
    expectedMarkets,
    expectedSharedCatalog: scopeAuthority.sharedCatalog,
    locales: mapLocales(locales),
    products: mapProducts(products, inventoryIndex),
    regions: mapRegions(regions),
    salesChannels: mapSalesChannels(salesChannels),
    translations: mapTranslations(translations.flat()),
  }
}

export const readFourMarketReleaseIdentity = (
  expected: FourMarketCatalogReleaseIdentity,
  environment: NodeJS.ProcessEnv,
  buildDatabaseInstanceFingerprint: (source: NodeJS.ProcessEnv) => string
): FourMarketCatalogReleaseIdentity => {
  try {
    const backendSlot = requiredText(
      environment.ZANE_DEPLOYMENT_SLOT,
      "ZANE_DEPLOYMENT_SLOT"
    )
    if (backendSlot !== "blue" && backendSlot !== "green") {
      throw new Error("invalid backend slot")
    }
    const observed: FourMarketCatalogReleaseIdentity = {
      backendBuildHash: requiredText(
        environment.BACKEND_BUILD_HASH,
        "BACKEND_BUILD_HASH"
      ),
      backendDeploymentId: requiredText(
        environment.ZANE_DEPLOYMENT_ID,
        "ZANE_DEPLOYMENT_ID"
      ),
      backendReleaseSha: requiredText(environment.RELEASE_SHA, "RELEASE_SHA"),
      backendSlot,
      databaseInstanceFingerprint:
        buildDatabaseInstanceFingerprint(environment),
      environmentId: requiredText(
        environment.MARKET_CATALOG_ENVIRONMENT_ID ??
          environment.RO_DEMO_ENVIRONMENT_ID,
        "MARKET_CATALOG_ENVIRONMENT_ID"
      ),
      releaseId: requiredText(
        environment.MARKET_CATALOG_RELEASE_ID ?? environment.RELEASE_ID,
        "MARKET_CATALOG_RELEASE_ID"
      ),
    }
    if (canonicalJson(observed) !== canonicalJson(expected)) {
      throw new Error("mismatch")
    }
    return observed
  } catch {
    throw new Error(
      "Current environment does not match expected release identity"
    )
  }
}

export const buildFourMarketCatalogLiveArtifact = (
  input: Readonly<{
    audit: FourMarketCatalogAuditReport
    authorities: FourMarketCatalogLiveArtifact["authorities"]
    capturedAt: string
    releaseIdentity: FourMarketCatalogReleaseIdentity
  }>
): FourMarketCatalogLiveArtifact => ({
  audit: input.audit,
  auditSha256: hashFourMarketCatalogAuditReport(input.audit),
  authorities: input.authorities,
  capturedAt: input.capturedAt,
  kind: "herbatika-four-market-catalog-live-readiness",
  releaseIdentity: input.releaseIdentity,
  schemaVersion: 1,
  scope: "four-market-catalog-readiness",
})

export const serializeFourMarketCatalogLiveArtifact = (
  artifact: FourMarketCatalogLiveArtifact
): string => `${canonicalJson(artifact)}\n`

export const hashFourMarketCatalogLiveArtifact = (
  artifact: FourMarketCatalogLiveArtifact
): string => sha256(serializeFourMarketCatalogLiveArtifact(artifact))

export const writeFourMarketCatalogLiveArtifact = async (
  outputPath: string,
  artifact: FourMarketCatalogLiveArtifact
): Promise<void> => {
  const temporaryPath = `${outputPath}.${process.pid}.${randomUUID()}.tmp`
  let handle: Awaited<ReturnType<typeof open>> | undefined
  try {
    handle = await open(temporaryPath, "wx", 0o600)
    await handle.writeFile(
      serializeFourMarketCatalogLiveArtifact(artifact),
      "utf8"
    )
    await handle.sync()
    await handle.close()
    handle = undefined
    await link(temporaryPath, outputPath)
    await unlink(temporaryPath)
  } catch (error) {
    await handle?.close().catch(() => {
      // Best-effort cleanup preserves the original no-clobber write error.
    })
    await unlink(temporaryPath).catch(() => {
      // Best-effort cleanup preserves the original no-clobber write error.
    })
    throw error
  }
}

export const runFourMarketCatalogLiveCollection = async (
  options: FourMarketCatalogLiveCliOptions,
  dependencies: FourMarketCatalogLiveDependencies
): Promise<FourMarketCatalogLiveArtifact> => {
  const [scopeBytes, translationBytes] = await Promise.all([
    dependencies.readTextFile(options.scopeAuthority.path),
    dependencies.readTextFile(options.translationAuthority.path),
  ])
  if (
    hashFourMarketCatalogArtifactBytes(scopeBytes) !==
    options.scopeAuthority.sha256
  ) {
    throw new Error(
      "Catalog scope authority bytes do not match the externally reviewed SHA-256"
    )
  }
  if (
    hashFourMarketCatalogArtifactBytes(translationBytes) !==
    options.translationAuthority.sha256
  ) {
    throw new Error(
      "Catalog translation authority bytes do not match the externally reviewed SHA-256"
    )
  }
  const scopeAuthority = parseFourMarketCatalogScopeAuthority(scopeBytes)
  const translationAuthority =
    parseFourMarketCatalogTranslationAuthority(translationBytes)
  const releaseIdentity = readFourMarketReleaseIdentity(
    options.expectedReleaseIdentity,
    dependencies.environment,
    dependencies.buildDatabaseInstanceFingerprint
  )
  const capturedAt = dependencies.now().toISOString()
  const input = await collectFourMarketCatalogAuditInput(
    dependencies.reader,
    scopeAuthority,
    translationAuthority
  )
  const audit = buildFourMarketCatalogAuditReport(input, capturedAt)
  const artifact = buildFourMarketCatalogLiveArtifact({
    audit,
    authorities: {
      scope: options.scopeAuthority,
      translations: options.translationAuthority,
    },
    capturedAt,
    releaseIdentity,
  })
  await dependencies.writeArtifact(options.outputPath, artifact)
  return artifact
}

const readRequiredFlag = (args: readonly string[], name: string): string => {
  const prefix = `${name}=`
  const values: string[] = []
  for (const [index, argument] of args.entries()) {
    if (argument.startsWith(prefix)) {
      values.push(argument.slice(prefix.length))
    } else if (argument === name) {
      const value = args[index + 1]
      if (!(value && !value.startsWith("--"))) {
        throw new Error(`Missing required ${name} value`)
      }
      values.push(value)
    }
  }
  if (values.length !== 1 || !values[0]) {
    throw new Error(`${name} must be provided exactly once`)
  }
  return values[0]
}

const assertLiveArgumentGrammar = (args: readonly string[]): void => {
  const allowed = new Set<string>(LIVE_ARGUMENTS)
  for (const [index, argument] of args.entries()) {
    if (!argument.startsWith("--")) {
      const previous = args[index - 1]
      if (previous && allowed.has(previous)) {
        continue
      }
      throw new Error(`Unknown four-market catalog live argument: ${argument}`)
    }
    const name = argument.split("=", 1)[0] ?? ""
    if (!allowed.has(name)) {
      throw new Error(`Unknown four-market catalog live argument: ${argument}`)
    }
  }
}

export const parseFourMarketCatalogLiveCliOptions = (
  args: readonly string[]
): FourMarketCatalogLiveCliOptions => {
  assertLiveArgumentGrammar(args)
  const scopePath = readRequiredFlag(args, "--scope-authority")
  const translationPath = readRequiredFlag(args, "--translation-authority")
  const outputPath = readRequiredFlag(args, "--output")
  if (
    ![scopePath, translationPath, outputPath].every(
      (path) => isAbsolute(path) && resolve(path) === path
    )
  ) {
    throw new Error(
      "Catalog live artifact paths must be canonical absolute paths"
    )
  }
  if (new Set([scopePath, translationPath, outputPath]).size !== 3) {
    throw new Error("Catalog live artifact paths must be distinct")
  }
  const scopeSha256 = readRequiredFlag(args, "--scope-authority-sha256")
  const translationSha256 = readRequiredFlag(
    args,
    "--translation-authority-sha256"
  )
  const databaseInstanceFingerprint = readRequiredFlag(
    args,
    "--expected-database-instance-fingerprint"
  )
  if (
    ![scopeSha256, translationSha256, databaseInstanceFingerprint].every(
      (value) => SHA256.test(value)
    )
  ) {
    throw new Error("Catalog live SHA-256 arguments must be lowercase SHA-256")
  }
  const slot = readRequiredFlag(args, "--expected-backend-slot")
  if (slot !== "blue" && slot !== "green") {
    throw new Error("Expected backend slot must be blue or green")
  }
  return {
    expectedReleaseIdentity: {
      backendBuildHash: readRequiredFlag(args, "--expected-backend-build-hash"),
      backendDeploymentId: readRequiredFlag(
        args,
        "--expected-backend-deployment-id"
      ),
      backendReleaseSha: readRequiredFlag(
        args,
        "--expected-backend-release-sha"
      ),
      backendSlot: slot,
      databaseInstanceFingerprint,
      environmentId: readRequiredFlag(args, "--expected-environment-id"),
      releaseId: readRequiredFlag(args, "--expected-release-id"),
    },
    outputPath,
    scopeAuthority: { path: scopePath, sha256: scopeSha256 },
    translationAuthority: {
      path: translationPath,
      sha256: translationSha256,
    },
  }
}
