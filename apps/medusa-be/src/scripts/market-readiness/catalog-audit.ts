import { createHash } from "node:crypto"

const MECHANICAL_TRANSLATION_PATTERN =
  /\b(?:localized|translated|translation pending|mechanical fallback|todo)\b/i
const PLACEHOLDER_TOKEN_PATTERN = /\{\{[^}]+\}\}/
const PRODUS_HERBATICA_PATTERN = /\bprodus\s+herbatica(?:\s+\d+)?\b/i

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
  reviewedTranslationSha256: string
  requiredFields: readonly string[]
}>

const FOUR_MARKET_CANONICAL_TRANSLATION_CONTRACTS = {
  brand: { reference: "brand", requiredFields: ["title"] },
  category: {
    reference: "product_category",
    requiredFields: [
      "name",
      "description",
      "top_description_html",
      "bottom_description_html",
      "meta_title",
      "meta_description",
    ],
  },
  collection: { reference: "product_collection", requiredFields: ["title"] },
  product: {
    reference: "product",
    requiredFields: ["title", "subtitle", "description"],
  },
} as const

export const canonicalFourMarketCatalogTranslation = (
  entityKind: string,
  entityId: string,
  reviewedTranslationSha256: string
): FourMarketCatalogExpectedTranslation | null => {
  const contract =
    FOUR_MARKET_CANONICAL_TRANSLATION_CONTRACTS[
      entityKind as keyof typeof FOUR_MARKET_CANONICAL_TRANSLATION_CONTRACTS
    ]
  return contract
    ? {
        reference: contract.reference,
        referenceId: entityId,
        reviewedTranslationSha256,
        requiredFields: contract.requiredFields,
      }
    : null
}

export type FourMarketCatalogExpectedPublication = Readonly<{
  entityId: string
  entityKind: string
  publicSlug: string
  translations: readonly FourMarketCatalogExpectedTranslation[]
}>

export type FourMarketCatalogExpectedMarket = Readonly<{
  countryCode: string
  currencyCode: string
  excludedProductIds: readonly string[]
  localeCode: string
  market: FourMarketCatalogMarket
  publications: readonly FourMarketCatalogExpectedPublication[]
  publishedProductIds: readonly string[]
  regionId: string
  salesChannelId: string
}>

export type FourMarketCatalogVariantIdentity = Readonly<{
  allowBackorder: boolean | null
  currencyCodes: readonly string[]
  ean: string | null
  inventoryItemIds: readonly string[]
  manageInventory: boolean | null
  sku: string | null
  variantId: string
}>

export type FourMarketCatalogProductAttributes = Readonly<{
  collectionId: string | null
  description: string | null
  externalId: string | null
  handle: string | null
  metadata: Readonly<Record<string, unknown>> | null
  subtitle: string | null
  title: string
}>

export type FourMarketCatalogProductIdentity = Readonly<{
  attributes: FourMarketCatalogProductAttributes
  brandId: string | null
  categoryIds: readonly string[]
  imageUrls: readonly string[]
  productId: string
  status: string
  thumbnailUrl: string | null
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
  schemaVersion: 2
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

export const hashFourMarketCatalogTranslationFields = (
  translations: Readonly<Record<string, unknown>>,
  requiredFields: readonly string[]
): string =>
  sha256(
    canonicalJson(
      Object.fromEntries(
        sortedUnique(requiredFields).map((field) => [
          field,
          translations[field],
        ])
      )
    )
  )

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
  currencyCodes: sortedUnique(
    variant.currencyCodes.map((currencyCode) => currencyCode.toLowerCase())
  ),
  inventoryItemIds: sortedUnique(variant.inventoryItemIds),
})

const sortedSharedCatalog = (
  products: readonly FourMarketCatalogProductIdentity[]
): readonly FourMarketCatalogProductIdentity[] =>
  products
    .map((product) => ({
      ...product,
      categoryIds: sortedUnique(product.categoryIds),
      imageUrls: sortedUnique(product.imageUrls),
      variants: product.variants
        .map(sortedVariantIdentity)
        .sort((left, right) => left.variantId.localeCompare(right.variantId)),
    }))
    .sort((left, right) => left.productId.localeCompare(right.productId))

const observedProductIdentity = (
  product: FourMarketCatalogObservedProduct
): FourMarketCatalogProductIdentity => ({
  attributes: product.attributes,
  brandId: product.brandId,
  categoryIds: product.categoryIds,
  imageUrls: product.imageUrls,
  productId: product.productId,
  status: product.status,
  thumbnailUrl: product.thumbnailUrl,
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
        message: `Product ${expectedProduct.productId} must preserve its exact catalog, media, relationship, variant, availability and price-currency identity`,
      })
    }
  }

  for (const product of observedSharedCatalog) {
    const requiredAttributes = [
      product.attributes.title,
      product.attributes.handle,
      product.attributes.description,
    ]
    if (
      requiredAttributes.some(
        (value) => typeof value !== "string" || value.trim().length === 0
      )
    ) {
      addIssue(issues, {
        code: "PRODUCT_ATTRIBUTES_INCOMPLETE",
        entityId: product.productId,
        entityKind: "product",
        message: `Product ${product.productId} must have non-empty title, handle and description attributes`,
      })
    }
    if (!(product.brandId && product.brandId.trim().length > 0)) {
      addIssue(issues, {
        code: "PRODUCT_BRAND_BINDING_MISSING",
        entityId: product.productId,
        entityKind: "product",
        message: `Product ${product.productId} must have an exact brand binding`,
      })
    }
    if (product.categoryIds.length === 0) {
      addIssue(issues, {
        code: "PRODUCT_CATEGORY_BINDING_MISSING",
        entityId: product.productId,
        entityKind: "product",
        message: `Product ${product.productId} must have at least one category binding`,
      })
    }
    if (
      !(product.thumbnailUrl && product.thumbnailUrl.trim().length > 0) ||
      product.imageUrls.length === 0 ||
      product.imageUrls.some((url) => url.trim().length === 0)
    ) {
      addIssue(issues, {
        code: "PRODUCT_MEDIA_INCOMPLETE",
        entityId: product.productId,
        entityKind: "product",
        message: `Product ${product.productId} must have a thumbnail and at least one image`,
      })
    }
    for (const variant of product.variants) {
      if (
        typeof variant.allowBackorder !== "boolean" ||
        typeof variant.manageInventory !== "boolean" ||
        (variant.manageInventory && variant.inventoryItemIds.length === 0)
      ) {
        addIssue(issues, {
          code: "VARIANT_AVAILABILITY_INVALID",
          entityId: variant.variantId,
          entityKind: "product_variant",
          message: `Variant ${variant.variantId} must have explicit inventory availability controls and managed inventory linkage`,
        })
      }
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
      const publishedProductIds = new Set(expected.publishedProductIds)
      const excludedProductIds = new Set(expected.excludedProductIds)
      if (
        [...publishedProductIds].some((id) => excludedProductIds.has(id)) ||
        !sameStrings(
          [...publishedProductIds, ...excludedProductIds],
          [...sharedProductIds]
        ) ||
        [...publishedProductIds, ...excludedProductIds].some(
          (id) => !sharedProductIds.has(id)
        )
      ) {
        addIssue(issues, {
          code: "PRODUCT_MARKET_PARTITION_INVALID",
          market: binding.market,
          message: `Market ${binding.market} published and excluded product IDs must form an exact disjoint shared-catalog partition`,
        })
      }
      for (const product of input.products) {
        if (
          !publishedProductIds.has(product.productId) &&
          product.salesChannelIds.includes(expected.salesChannelId)
        ) {
          addIssue(issues, {
            code: "UNEXPECTED_PRODUCT_SALES_CHANNEL_PUBLICATION",
            entityId: product.productId,
            entityKind: "product",
            market: binding.market,
            message: `Product ${product.productId} is outside the ${binding.market} published scope but carries its sales channel`,
          })
        }
      }
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
        const observedProduct = observedProducts[0]
        if (observedProduct) {
          for (const variant of observedProduct.variants) {
            if (
              !variant.currencyCodes.some(
                (currencyCode) =>
                  currencyCode.toLowerCase() ===
                  expected.currencyCode.toLowerCase()
              )
            ) {
              addIssue(issues, {
                code: "VARIANT_MARKET_CURRENCY_PRICE_MISSING",
                entityId: variant.variantId,
                entityKind: "product_variant",
                market: binding.market,
                message: `Variant ${variant.variantId} must have a valid ${expected.currencyCode.toUpperCase()} price for market ${binding.market}`,
              })
            }
          }
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

        const canonicalTranslation = canonicalFourMarketCatalogTranslation(
          publication.entityKind,
          publication.entityId,
          publication.translations[0]?.reviewedTranslationSha256 ?? ""
        )
        if (
          !canonicalTranslation ||
          publication.translations.length !== 1 ||
          canonicalJson({
            ...publication.translations[0],
            requiredFields: sortedUnique(
              publication.translations[0]?.requiredFields ?? []
            ),
          }) !==
            canonicalJson({
              ...canonicalTranslation,
              requiredFields: sortedUnique(canonicalTranslation.requiredFields),
            })
        ) {
          addIssue(issues, {
            code: "TRANSLATION_CONTRACT_AUTHORITY_INVALID",
            entityId: publication.entityId,
            entityKind: publication.entityKind,
            market: binding.market,
            message: `Market ${binding.market} ${publication.entityKind} translation contract must use the canonical mandatory field set`,
          })
        }

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

        for (const contract of canonicalTranslation
          ? [canonicalTranslation]
          : []) {
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
          if (
            !boundTranslation ||
            translationMatches.length !== 1 ||
            !fieldsAreComplete
          ) {
            addIssue(issues, {
              code: "TRANSLATION_CONTRACT_INVALID",
              entityId: publication.entityId,
              entityKind: publication.entityKind,
              market: binding.market,
              message: `Market ${binding.market} requires exactly one complete ${contract.reference} translation for ${contract.referenceId}`,
            })
          } else if (
            hashFourMarketCatalogTranslationFields(
              boundTranslation.translations,
              contract.requiredFields
            ) !== contract.reviewedTranslationSha256
          ) {
            addIssue(issues, {
              code: "TRANSLATION_REVIEWED_PROVENANCE_MISMATCH",
              entityId: publication.entityId,
              entityKind: publication.entityKind,
              market: binding.market,
              message: `Market ${binding.market} translation does not match its externally reviewed field hash`,
            })
          }
          if (boundTranslation && binding.market !== "sk") {
            const skTranslation = input.translations.find(
              (candidate) =>
                candidate.deletedAt == null &&
                candidate.localeCode === "sk-SK" &&
                candidate.reference === contract.reference &&
                candidate.referenceId === contract.referenceId
            )
            const contaminated = contract.requiredFields.some((field) => {
              const value = boundTranslation.translations[field]
              const skValue = skTranslation?.translations[field]
              return (
                typeof value === "string" &&
                (value.trim() === skValue?.toString().trim() ||
                  PRODUS_HERBATICA_PATTERN.test(value) ||
                  MECHANICAL_TRANSLATION_PATTERN.test(value) ||
                  PLACEHOLDER_TOKEN_PATTERN.test(value))
              )
            })
            if (contaminated) {
              addIssue(issues, {
                code: "TRANSLATION_CONTENT_CONTAMINATED",
                entityId: publication.entityId,
                entityKind: publication.entityKind,
                market: binding.market,
                message: `Market ${binding.market} translation contains Slovak reuse, placeholder content or a mechanical fallback`,
              })
            }
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
        (count, publication) =>
          count +
          (canonicalFourMarketCatalogTranslation(
            publication.entityKind,
            publication.entityId,
            publication.translations[0]?.reviewedTranslationSha256 ?? ""
          )
            ? 1
            : 0),
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
    schemaVersion: 2,
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
