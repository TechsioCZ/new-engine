import { createHash } from "node:crypto"

export const FOUR_MARKET_CATALOG_BINDINGS = [
  {
    countryCode: "sk",
    currencyCode: "eur",
    localeCode: "sk-SK",
    market: "sk",
  },
  {
    countryCode: "cz",
    currencyCode: "czk",
    localeCode: "cs-CZ",
    market: "cz",
  },
  {
    countryCode: "hu",
    currencyCode: "huf",
    localeCode: "hu-HU",
    market: "hu",
  },
  {
    countryCode: "ro",
    currencyCode: "ron",
    localeCode: "ro-RO",
    market: "ro",
  },
] as const

export type FourMarketCatalogMarket =
  (typeof FOUR_MARKET_CATALOG_BINDINGS)[number]["market"]

export type FourMarketCatalogExpectedTranslation = Readonly<{
  reference: string
  referenceId: string
  requiredFields: readonly string[]
}>

export type FourMarketCatalogExpectedPublication = Readonly<{
  entityId: string
  entityKind: string
  publicSlug: string
  translations: readonly FourMarketCatalogExpectedTranslation[]
}>

export type FourMarketCatalogExpectedMarket = Readonly<{
  countryCode: string
  currencyCode: string
  localeCode: string
  market: FourMarketCatalogMarket
  publications: readonly FourMarketCatalogExpectedPublication[]
  publishedProductIds: readonly string[]
  regionId: string
  salesChannelId: string
}>

export type FourMarketCatalogVariantIdentity = Readonly<{
  ean: string | null
  inventoryItemIds: readonly string[]
  sku: string | null
  variantId: string
}>

export type FourMarketCatalogProductIdentity = Readonly<{
  productId: string
  status: string
  variants: readonly FourMarketCatalogVariantIdentity[]
}>

export type FourMarketCatalogObservedProduct =
  FourMarketCatalogProductIdentity &
    Readonly<{
      salesChannelIds: readonly string[]
    }>

export type FourMarketCatalogAuditInput = Readonly<{
  assignments: readonly Readonly<{
    entityId: string
    entityKind: string
    market: FourMarketCatalogMarket
    publicSlug: string
    publicationStatus: string
    salesChannelId: string
  }>[]
  expectedMarkets: readonly FourMarketCatalogExpectedMarket[]
  expectedSharedCatalog: readonly FourMarketCatalogProductIdentity[]
  locales: readonly Readonly<{
    code: string
    deletedAt?: string | null
    id: string
  }>[]
  products: readonly FourMarketCatalogObservedProduct[]
  regions: readonly Readonly<{
    countryCodes: readonly string[]
    currencyCode: string
    deletedAt?: string | null
    id: string
  }>[]
  salesChannels: readonly Readonly<{
    deletedAt?: string | null
    id: string
  }>[]
  translations: readonly Readonly<{
    deletedAt?: string | null
    id: string
    localeCode: string
    reference: string
    referenceId: string
    translations: Readonly<Record<string, unknown>>
  }>[]
}>

export type FourMarketCatalogAuditIssue = Readonly<{
  code: string
  entityId?: string
  entityKind?: string
  market?: FourMarketCatalogMarket
  message: string
}>

export type FourMarketCatalogAuditReport = Readonly<{
  generatedAt: string
  issues: readonly FourMarketCatalogAuditIssue[]
  kind: "herbatika-four-market-catalog-readiness"
  markets: readonly Readonly<{
    countryCode: string
    currencyCode: string
    localeCode: string
    market: FourMarketCatalogMarket
    publicationCount: number
    publishedProductIds: readonly string[]
    ready: boolean
    regionId: string
    salesChannelId: string
    translationContractCount: number
  }>[]
  ready: boolean
  schemaVersion: 1
  scope: "four-market-catalog-readiness"
  sharedIdentity: Readonly<{
    algorithm: "sha256-canonical-json-v1"
    dataHash: string
    expectedDataHash: string
    inventoryItems: number
    matched: boolean
    observedDataHash: string
    products: number
    variants: number
  }>
  summary: Readonly<{
    errors: number
    inventoryItems: number
    products: number
    publications: number
    translationContracts: number
    variants: number
  }>
}>

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }
  if (!(value && typeof value === "object")) {
    return value
  }
  const record = value as Readonly<Record<string, unknown>>
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, canonicalize(record[key])])
  )
}

const canonicalJson = (value: unknown): string =>
  JSON.stringify(canonicalize(value))

const sha256 = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex")

const sortedUnique = (values: readonly string[]): readonly string[] =>
  [...new Set(values)].sort()

const sameStrings = (
  left: readonly string[],
  right: readonly string[]
): boolean => {
  const sortedLeft = sortedUnique(left)
  const sortedRight = sortedUnique(right)
  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((value, index) => value === sortedRight[index])
  )
}

const publicationKey = (entityKind: string, entityId: string): string =>
  `${entityKind}\u0000${entityId}`

const sortedVariantIdentity = (
  variant: FourMarketCatalogVariantIdentity
): FourMarketCatalogVariantIdentity => ({
  ...variant,
  inventoryItemIds: sortedUnique(variant.inventoryItemIds),
})

const sortedSharedCatalog = (
  products: readonly FourMarketCatalogProductIdentity[]
): readonly FourMarketCatalogProductIdentity[] =>
  products
    .map((product) => ({
      ...product,
      variants: product.variants
        .map(sortedVariantIdentity)
        .sort((left, right) => left.variantId.localeCompare(right.variantId)),
    }))
    .sort((left, right) => left.productId.localeCompare(right.productId))

const observedProductIdentity = (
  product: FourMarketCatalogObservedProduct
): FourMarketCatalogProductIdentity => ({
  productId: product.productId,
  status: product.status,
  variants: product.variants,
})

const addIssue = (
  issues: FourMarketCatalogAuditIssue[],
  issue: FourMarketCatalogAuditIssue
): void => {
  issues.push(issue)
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This pure audit keeps the cross-market invariant sequence in one deterministic report builder.
function buildFourMarketCatalogAuditReport(
  input: FourMarketCatalogAuditInput,
  generatedAt: string
): FourMarketCatalogAuditReport {
  const issues: FourMarketCatalogAuditIssue[] = []
  const sharedCatalog = sortedSharedCatalog(input.expectedSharedCatalog)
  const observedSharedCatalog = sortedSharedCatalog(
    input.products.map(observedProductIdentity)
  )
  const expectedIdentityJson = canonicalJson(sharedCatalog)
  const observedIdentityJson = canonicalJson(observedSharedCatalog)
  const variants = sharedCatalog.flatMap((product) => product.variants)
  const inventoryItems = new Set(
    variants.flatMap((variant) => variant.inventoryItemIds)
  ).size
  const expectedByMarket = new Map(
    input.expectedMarkets.map((market) => [market.market, market])
  )
  if (
    input.expectedSharedCatalog.length !== input.products.length ||
    !sameStrings(
      input.expectedSharedCatalog.map(({ productId }) => productId),
      input.products.map(({ productId }) => productId)
    )
  ) {
    addIssue(issues, {
      code: "SHARED_PRODUCT_SCOPE_MISMATCH",
      message:
        "Observed shared product identities must exactly match the expected global product scope",
    })
  }

  for (const expectedProduct of sharedCatalog) {
    const observedProducts = observedSharedCatalog.filter(
      ({ productId }) => productId === expectedProduct.productId
    )
    if (
      observedProducts.length !== 1 ||
      canonicalJson(observedProducts[0]) !== canonicalJson(expectedProduct)
    ) {
      addIssue(issues, {
        code: "SHARED_PRODUCT_IDENTITY_MISMATCH",
        entityId: expectedProduct.productId,
        entityKind: "product",
        message: `Product ${expectedProduct.productId} must preserve its exact status, variant and inventory identity`,
      })
    }
  }

  const stableIdentityOwners = new Map<string, string>()
  for (const product of observedSharedCatalog) {
    for (const variant of product.variants) {
      for (const [kind, value] of [
        ["ean", variant.ean],
        ["sku", variant.sku],
      ] as const) {
        const normalized = value?.trim().toLowerCase()
        if (!normalized) {
          continue
        }
        const key = `${kind}:${normalized}`
        const existingVariantId = stableIdentityOwners.get(key)
        if (existingVariantId && existingVariantId !== variant.variantId) {
          addIssue(issues, {
            code: "DUPLICATE_VARIANT_STABLE_IDENTITY",
            entityId: variant.variantId,
            entityKind: "product_variant",
            message: `Stable ${kind.toUpperCase()} identity is shared by multiple variant IDs`,
          })
        } else {
          stableIdentityOwners.set(key, variant.variantId)
        }
      }
    }
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Each branch emits a distinct fail-closed catalog issue for one market.
  const markets = FOUR_MARKET_CATALOG_BINDINGS.map((binding) => {
    const matchingScopes = input.expectedMarkets.filter(
      ({ market }) => market === binding.market
    )
    const expected = expectedByMarket.get(binding.market)
    if (matchingScopes.length === 0) {
      addIssue(issues, {
        code: "EXPECTED_MARKET_SCOPE_MISSING",
        market: binding.market,
        message: `Expected catalog scope is missing for market ${binding.market}`,
      })
    } else if (matchingScopes.length > 1) {
      addIssue(issues, {
        code: "EXPECTED_MARKET_SCOPE_AMBIGUOUS",
        market: binding.market,
        message: `Expected catalog scope is duplicated for market ${binding.market}`,
      })
    }
    if (
      expected &&
      (expected.countryCode !== binding.countryCode ||
        expected.currencyCode !== binding.currencyCode ||
        expected.localeCode !== binding.localeCode)
    ) {
      addIssue(issues, {
        code: "MARKET_BINDING_MISMATCH",
        market: binding.market,
        message: `Expected catalog binding does not match the canonical ${binding.market} market binding`,
      })
    }
    if (expected) {
      const activeLocales = input.locales.filter(
        (locale) =>
          locale.code === expected.localeCode && locale.deletedAt == null
      )
      if (activeLocales.length !== 1) {
        addIssue(issues, {
          code: "EXACT_LOCALE_BINDING_INVALID",
          market: binding.market,
          message: `Market ${binding.market} must bind to exactly one active ${expected.localeCode} locale`,
        })
      }

      const activeRegions = input.regions.filter(
        (candidate) =>
          candidate.id === expected.regionId && candidate.deletedAt == null
      )
      const boundRegion = activeRegions[0]
      if (
        activeRegions.length !== 1 ||
        boundRegion?.currencyCode.toLowerCase() !==
          expected.currencyCode.toLowerCase() ||
        !boundRegion?.countryCodes.some(
          (countryCode) =>
            countryCode.toLowerCase() === expected.countryCode.toLowerCase()
        )
      ) {
        addIssue(issues, {
          code: "EXACT_REGION_BINDING_INVALID",
          market: binding.market,
          message: `Market ${binding.market} region must match its exact region, country and currency binding`,
        })
      }

      const activeSalesChannels = input.salesChannels.filter(
        (salesChannel) =>
          salesChannel.id === expected.salesChannelId &&
          salesChannel.deletedAt == null
      )
      if (activeSalesChannels.length !== 1) {
        addIssue(issues, {
          code: "EXACT_SALES_CHANNEL_BINDING_INVALID",
          market: binding.market,
          message: `Market ${binding.market} must bind to exactly one active sales channel`,
        })
      }

      if (
        input.expectedMarkets.some(
          (other) =>
            other.market !== expected.market &&
            (other.regionId === expected.regionId ||
              other.salesChannelId === expected.salesChannelId)
        )
      ) {
        addIssue(issues, {
          code: "MARKET_BINDING_ID_REUSED",
          market: binding.market,
          message: `Market ${binding.market} must use market-unique region and sales-channel bindings`,
        })
      }
    }
    const publications = expected?.publications ?? []
    if (expected) {
      const sharedProductIds = new Set(
        input.expectedSharedCatalog.map(({ productId }) => productId)
      )
      for (const productId of expected.publishedProductIds) {
        if (!sharedProductIds.has(productId)) {
          addIssue(issues, {
            code: "PUBLISHED_PRODUCT_OUTSIDE_SHARED_IDENTITY",
            entityId: productId,
            entityKind: "product",
            market: binding.market,
            message: `Market ${binding.market} publication must reference the shared global product identity`,
          })
        }
        const expectedProducts = input.expectedSharedCatalog.filter(
          (product) => product.productId === productId
        )
        const observedProducts = input.products.filter(
          (product) => product.productId === productId
        )
        if (
          expectedProducts.length !== 1 ||
          observedProducts.length !== 1 ||
          expectedProducts[0]?.status !== "published" ||
          observedProducts[0]?.status !== "published"
        ) {
          addIssue(issues, {
            code: "PUBLISHED_PRODUCT_STATUS_INVALID",
            entityId: productId,
            entityKind: "product",
            market: binding.market,
            message: `Market ${binding.market} product publication requires one globally published shared product`,
          })
        }
      }
      const expectedProductPublicationIds = publications
        .filter(({ entityKind }) => entityKind === "product")
        .map(({ entityId }) => entityId)
      if (
        !sameStrings(
          expected.publishedProductIds,
          expectedProductPublicationIds
        )
      ) {
        addIssue(issues, {
          code: "EXPECTED_PRODUCT_PUBLICATION_SCOPE_INVALID",
          market: binding.market,
          message: `Market ${binding.market} published product scope must exactly match its product publication authority`,
        })
      }

      const expectedPublicationKeys = new Set<string>()
      for (const publication of publications) {
        const key = publicationKey(publication.entityKind, publication.entityId)
        if (expectedPublicationKeys.has(key)) {
          addIssue(issues, {
            code: "EXPECTED_PUBLICATION_AMBIGUOUS",
            entityId: publication.entityId,
            entityKind: publication.entityKind,
            market: binding.market,
            message: `Market ${binding.market} publication authority contains a duplicate entity`,
          })
        }
        expectedPublicationKeys.add(key)

        const assignmentMatches = input.assignments.filter(
          (candidate) =>
            candidate.market === binding.market &&
            candidate.publicationStatus === "published" &&
            candidate.entityKind === publication.entityKind &&
            candidate.entityId === publication.entityId
        )
        const boundAssignment = assignmentMatches[0]
        if (
          assignmentMatches.length !== 1 ||
          boundAssignment?.publicSlug !== publication.publicSlug ||
          boundAssignment?.salesChannelId !== expected.salesChannelId ||
          publication.publicSlug.trim().length === 0
        ) {
          addIssue(issues, {
            code: "PUBLICATION_ASSIGNMENT_MISMATCH",
            entityId: publication.entityId,
            entityKind: publication.entityKind,
            market: binding.market,
            message: `Market ${binding.market} publication assignment must exactly match its slug and sales channel authority`,
          })
        }

        if (publication.entityKind === "product") {
          const products = input.products.filter(
            ({ productId }) => productId === publication.entityId
          )
          if (
            products.length !== 1 ||
            !products[0]?.salesChannelIds.includes(expected.salesChannelId)
          ) {
            addIssue(issues, {
              code: "PRODUCT_SALES_CHANNEL_PUBLICATION_MISSING",
              entityId: publication.entityId,
              entityKind: publication.entityKind,
              market: binding.market,
              message: `Published product must carry the exact ${binding.market} sales channel`,
            })
          }
        }

        for (const contract of publication.translations) {
          const translationMatches = input.translations.filter(
            (candidate) =>
              candidate.deletedAt == null &&
              candidate.localeCode === expected.localeCode &&
              candidate.reference === contract.reference &&
              candidate.referenceId === contract.referenceId
          )
          const boundTranslation = translationMatches[0]
          const fieldsAreComplete =
            contract.requiredFields.length > 0 &&
            contract.requiredFields.every((field) => {
              const value = boundTranslation?.translations[field]
              return typeof value === "string" && value.trim().length > 0
            })
          if (translationMatches.length !== 1 || !fieldsAreComplete) {
            addIssue(issues, {
              code: "TRANSLATION_CONTRACT_INVALID",
              entityId: publication.entityId,
              entityKind: publication.entityKind,
              market: binding.market,
              message: `Market ${binding.market} requires exactly one complete ${contract.reference} translation for ${contract.referenceId}`,
            })
          }
        }
      }

      for (const assignment of input.assignments) {
        if (
          assignment.market === binding.market &&
          assignment.publicationStatus === "published" &&
          !expectedPublicationKeys.has(
            publicationKey(assignment.entityKind, assignment.entityId)
          )
        ) {
          addIssue(issues, {
            code: "UNEXPECTED_PUBLISHED_ASSIGNMENT",
            entityId: assignment.entityId,
            entityKind: assignment.entityKind,
            market: binding.market,
            message: `Market ${binding.market} contains a published assignment outside its expected scope`,
          })
        }
      }
    }
    return {
      countryCode: expected?.countryCode ?? binding.countryCode,
      currencyCode: expected?.currencyCode ?? binding.currencyCode,
      localeCode: expected?.localeCode ?? binding.localeCode,
      market: binding.market,
      publicationCount: publications.length,
      publishedProductIds: sortedUnique(expected?.publishedProductIds ?? []),
      ready: true,
      regionId: expected?.regionId ?? "",
      salesChannelId: expected?.salesChannelId ?? "",
      translationContractCount: publications.reduce(
        (count, publication) => count + publication.translations.length,
        0
      ),
    }
  })
  const publications = markets.reduce(
    (count, market) => count + market.publicationCount,
    0
  )
  const translationContracts = markets.reduce(
    (count, market) => count + market.translationContractCount,
    0
  )
  const sortedIssues = [...issues].sort((left, right) =>
    canonicalJson(left).localeCompare(canonicalJson(right))
  )
  const marketReports = markets.map((market) => ({
    ...market,
    ready: !sortedIssues.some(
      (issue) => issue.market === undefined || issue.market === market.market
    ),
  }))

  return {
    generatedAt,
    issues: sortedIssues,
    kind: "herbatika-four-market-catalog-readiness",
    markets: marketReports,
    ready: sortedIssues.length === 0,
    schemaVersion: 1,
    scope: "four-market-catalog-readiness",
    sharedIdentity: {
      algorithm: "sha256-canonical-json-v1",
      dataHash: sha256(
        canonicalJson({
          expected: sharedCatalog,
          observed: observedSharedCatalog,
        })
      ),
      expectedDataHash: sha256(expectedIdentityJson),
      inventoryItems,
      matched: expectedIdentityJson === observedIdentityJson,
      observedDataHash: sha256(observedIdentityJson),
      products: sharedCatalog.length,
      variants: variants.length,
    },
    summary: {
      errors: sortedIssues.length,
      inventoryItems,
      products: sharedCatalog.length,
      publications,
      translationContracts,
      variants: variants.length,
    },
  }
}

export { buildFourMarketCatalogAuditReport }

export const serializeFourMarketCatalogAuditReport = (
  report: FourMarketCatalogAuditReport
): string => `${canonicalJson(report)}\n`

export const hashFourMarketCatalogAuditReport = (
  report: FourMarketCatalogAuditReport
): string => sha256(serializeFourMarketCatalogAuditReport(report))
