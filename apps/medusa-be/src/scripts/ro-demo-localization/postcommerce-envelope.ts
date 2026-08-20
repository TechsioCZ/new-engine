import {
  link as hardLink,
  open,
  readFile,
  realpath,
  stat,
  unlink,
} from "node:fs/promises"
import { basename, dirname, join, resolve } from "node:path"
import type { ExecArgs, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  parseRoDemoApplyReceipt,
  parseRoDemoRestoreArtifact,
  type RoDemoApplyReceipt,
  type RoDemoRestoreArtifact,
  serializeRoDemoArtifact,
  sha256RoDemoArtifactBytes,
} from "../ro-demo-commerce/artifacts"
import {
  buildSkCommerceBaseline,
  hashRoDemoCommercePlan,
  hashSkCommerceBaseline,
} from "../ro-demo-commerce/planner"
import {
  parsePrecommercePriceAuthority,
  sha256PrecommerceInventoryIdentity,
} from "../ro-demo-commerce/precommerce-price-authority"
import {
  RO_DEMO_SOURCE,
  type RoDemoCommercePlan,
  type RoDemoSnapshot,
} from "../ro-demo-commerce/types"
import { validateDemoLocalizationInput } from "./generator"
import {
  parseRoPostCommerceEnvelopeContract,
  postCommerceSha256,
  stablePostCommerceJson,
} from "./postcommerce-envelope-contract.mjs"
import type { DemoInventoryProduct, DemoLocalizationFileInput } from "./types"

export {
  postCommerceSha256,
  RO_POST_COMMERCE_ENVELOPE_KEYS,
  RO_POST_COMMERCE_ENVIRONMENT_KEYS,
  stablePostCommerceJson,
} from "./postcommerce-envelope-contract.mjs"

const SHA_256 = /^[a-f0-9]{64}$/
const GIT_SHA = /^[a-f0-9]{40}$/
const SAFE_ID = /^[\x21-\x7e]{1,255}$/
export type PostCommerceExpectedCounts = Readonly<{
  brandsExcluded: number
  brandsTotal: number
  categoriesExcluded: number
  categoriesTotal: number
  productsExcluded: number
  productsPublished: number
  productsTotal: number
}>

export const PRODUCTION_POST_COMMERCE_COUNTS: PostCommerceExpectedCounts = {
  brandsExcluded: 25,
  brandsTotal: 128,
  categoriesExcluded: 2,
  categoriesTotal: 209,
  productsExcluded: 149,
  productsPublished: 2002,
  productsTotal: 2151,
}

type QueryService = Readonly<{
  graph: <Value>(
    input: Readonly<{
      entity: string
      fields: readonly string[]
      filters?: Readonly<Record<string, unknown>>
      pagination?: Readonly<{ skip?: number; take: number }>
    }>
  ) => Promise<Readonly<{ data?: Value[] }>>
}>

export type PostCommercePriceAuthority = ReturnType<
  typeof parsePrecommercePriceAuthority
>

export type PostCommerceShippingObservation = Readonly<{
  code: string
  countryCodes: readonly string[]
  data: Readonly<Record<string, unknown>>
  fulfillmentSetId: string
  id: string
  prices: readonly Readonly<{
    amount: number
    currencyCode: string
    rules: readonly Readonly<{
      attribute: string
      operator: string
      value: unknown
    }>[]
  }>[]
  providerId: string
  serviceZoneId: string
  shippingProfileId: string
}>

export type PostCommerceObservation = Readonly<{
  commerce: RoDemoSnapshot
  salesChannels: readonly Readonly<{
    id: string
    metadata: Readonly<Record<string, unknown>>
  }>[]
  shippingOptions: readonly PostCommerceShippingObservation[]
}>

export type PostCommerceEnvelope = Readonly<{
  capturedAt: string
  commerceApplyReceiptSha256: string
  commercePlanFileSha256: string
  commercePlanHash: string
  commerceRestoreArtifactSha256: string
  environment: Readonly<{
    backendBuildHash: string
    backendDeploymentId: string
    backendReleaseSha: string
    backendSlot: "blue" | "green"
    databaseFingerprint: string
    environmentId: string
    locale: "ro-RO"
    marketCode: "ro"
    salesChannelId: string
  }>
  kind: "ro-demo-post-commerce-envelope"
  observedCommerceSnapshotSha256: string
  payload: DemoLocalizationFileInput
  payloadSha256: string
  postCommerceSharedInventoryFingerprint: PostCommerceStateFingerprint
  postCommerceSkBaseline: PostCommerceStateProof
  preCommerceSharedInventoryFingerprint: PostCommerceStateFingerprint
  preCommerceSkBaseline: PostCommerceStateProof
  priceAuthoritySha256: string
  rawLiveInventorySha256: string
  schemaVersion: 1
  sourceInventoryEnvelopeSha256: string
}>

export type PostCommerceStateFingerprint = Readonly<{
  count: number
  sha256: string
}>

export type PostCommerceStateProof = PostCommerceStateFingerprint &
  Readonly<{ errors: readonly string[] }>

export type PostCommerceEnvelopeCliOptions = Readonly<{
  commerceApplyReceiptPath: string
  commerceApplyReceiptSha256: string
  commercePlanPath: string
  commercePlanFileSha256: string
  commercePlanHash: string
  commerceRestoreArtifactPath: string
  commerceRestoreArtifactSha256: string
  expectedBackendBuildHash: string
  expectedBackendDeploymentId: string
  expectedBackendReleaseSha: string
  expectedBackendSlot: "blue" | "green"
  expectedEnvironmentId: string
  inventoryPath: string
  inventorySha256: string
  outputPath: string
  preCommerceSharedInventoryFingerprintPath: string
  preCommerceSharedInventoryFingerprintSha256: string
  priceAuthorityPath: string
  priceAuthoritySha256: string
  rawLiveInventoryPath: string
  rawLiveInventorySha256: string
}>

export type ObservedPostCommerceDeployment = Readonly<{
  backendBuildHash: string
  backendDeploymentId: string
  backendReleaseSha: string
  backendSlot: "blue" | "green"
  environmentId: string
}>

const asRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const exactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string
) => {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} fields are invalid`)
  }
}

const nonblank = (value: unknown, label: string) => {
  if (typeof value !== "string" || value.trim() !== value || !value) {
    throw new Error(`${label} must be a nonblank trimmed string`)
  }
  return value
}

const safeId = (value: unknown, label: string) => {
  const parsed = nonblank(value, label)
  if (!SAFE_ID.test(parsed)) {
    throw new Error(`${label} must be printable ASCII`)
  }
  return parsed
}

const sha256 = (value: unknown, label: string) => {
  const parsed = nonblank(value, label)
  if (!SHA_256.test(parsed)) {
    throw new Error(`${label} must be a lowercase SHA-256`)
  }
  return parsed
}

const timestamp = (value: unknown, label: string) => {
  const parsed = nonblank(value, label)
  const date = new Date(parsed)
  if (Number.isNaN(date.getTime()) || date.toISOString() !== parsed) {
    throw new Error(`${label} must be an ISO-8601 UTC timestamp`)
  }
  return parsed
}

const unorderedSnapshotValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value
      .map(unorderedSnapshotValue)
      .sort((left, right) =>
        stablePostCommerceJson(left).localeCompare(
          stablePostCommerceJson(right),
          "en"
        )
      )
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [
        key,
        unorderedSnapshotValue(child),
      ])
    )
  }
  return value
}

export const hashPostCommerceObservation = (
  observation: PostCommerceObservation
) =>
  postCommerceSha256(
    stablePostCommerceJson(unorderedSnapshotValue(observation))
  )

const validateFinalPayload = (
  payload: DemoLocalizationFileInput,
  expectedCounts: PostCommerceExpectedCounts
) => {
  const { brandExclusionAuthority, mergedEvidenceCapturedAt, ...baseInput } =
    payload
  validateDemoLocalizationInput({
    ...baseInput,
    officialCategories: [],
    officialProducts: [],
  })
  timestamp(mergedEvidenceCapturedAt, "payload.mergedEvidenceCapturedAt")
  const authority = asRecord(
    brandExclusionAuthority,
    "payload.brandExclusionAuthority"
  )
  exactKeys(
    authority,
    ["approvedAt", "approvedBy", "referencePrefix"],
    "payload.brandExclusionAuthority"
  )
  timestamp(authority.approvedAt, "payload.brandExclusionAuthority.approvedAt")
  nonblank(authority.approvedBy, "payload.brandExclusionAuthority.approvedBy")
  nonblank(
    authority.referencePrefix,
    "payload.brandExclusionAuthority.referencePrefix"
  )
  const readiness = payload.readiness
  if (
    readiness.currencyCode !== "ron" ||
    !readiness.regionId ||
    readiness.regionId === "pending" ||
    readiness.paymentProviderIds.length === 0 ||
    readiness.shippingOptionIds.length === 0 ||
    readiness.taxRegionIds.length === 0
  ) {
    throw new Error("payload readiness is not final and non-empty")
  }
  const counts = {
    brandsExcluded: payload.inventory.brands.filter(
      (item) => item.roExclusionDecision
    ).length,
    brandsTotal: payload.inventory.brands.length,
    categoriesExcluded: payload.inventory.categories.filter(
      (item) => item.roExclusionDecision
    ).length,
    categoriesTotal: payload.inventory.categories.length,
    productsExcluded: payload.inventory.products.filter(
      (item) => item.roExclusionDecision
    ).length,
    productsPublished: payload.inventory.products.filter(
      (item) => !item.roExclusionDecision
    ).length,
    productsTotal: payload.inventory.products.length,
  }
  if (
    stablePostCommerceJson(counts) !== stablePostCommerceJson(expectedCounts)
  ) {
    throw new Error(
      "payload catalog identity partition is not the frozen scope"
    )
  }
  const sellable = payload.inventory.products.flatMap((product) =>
    product.variants.filter((variant) => variant.ronPrice)
  )
  if (sellable.length !== expectedCounts.productsPublished) {
    throw new Error(
      "payload must contain the frozen count of approved RON variants"
    )
  }
  for (const [index, variant] of sellable.entries()) {
    const price = asRecord(variant.ronPrice, `payload RON price ${index}`)
    exactKeys(price, ["amount", "approval"], `payload RON price ${index}`)
    if (!Number.isFinite(price.amount) || (price.amount as number) < 0) {
      throw new Error(`payload RON price ${index}.amount is invalid`)
    }
    const approval = asRecord(
      price.approval,
      `payload RON price ${index}.approval`
    )
    exactKeys(
      approval,
      ["approvedAt", "approvedBy", "reference"],
      `payload RON price ${index}.approval`
    )
    timestamp(approval.approvedAt, `payload RON price ${index}.approvedAt`)
    nonblank(approval.approvedBy, `payload RON price ${index}.approvedBy`)
    nonblank(approval.reference, `payload RON price ${index}.reference`)
  }
  return payload
}

export const parsePostCommerceEnvelope = (
  text: string,
  options: Readonly<{
    expectedCounts?: PostCommerceExpectedCounts
    maxAgeMs?: number
    now?: Date
  }> = {}
): PostCommerceEnvelope => {
  const contract = parseRoPostCommerceEnvelopeContract(text, options)
  const payload = validateFinalPayload(
    contract.payload as DemoLocalizationFileInput,
    options.expectedCounts ?? PRODUCTION_POST_COMMERCE_COUNTS
  )
  return { ...contract, payload } as PostCommerceEnvelope
}

export const parseRoPostCommerceEnvelope = parsePostCommerceEnvelope

const exactOne = <Value>(values: readonly Value[], label: string): Value => {
  if (values.length !== 1) {
    throw new Error(`${label} is missing or ambiguous`)
  }
  return values[0] as Value
}

const sorted = (values: readonly string[]) =>
  [...values].sort((left, right) => left.localeCompare(right, "en"))

const assertSameStringSet = (
  actual: readonly string[],
  expected: readonly string[],
  label: string
) => {
  if (
    stablePostCommerceJson(sorted(actual)) !==
    stablePostCommerceJson(sorted(expected))
  ) {
    throw new Error(`${label} does not match the reviewed commerce plan`)
  }
}

const defaultRonPrices = (variant: RoDemoSnapshot["variants"][number]) =>
  variant.prices.filter(
    (price) =>
      price.currencyCode.toLowerCase() === "ron" &&
      price.priceListId === null &&
      price.minQuantity === null &&
      price.maxQuantity === null &&
      price.rules.length === 0
  )

const assertCatalogIdentityUnchanged = (
  source: DemoLocalizationFileInput,
  observation: PostCommerceObservation
) => {
  const expected = source.inventory.products.flatMap((product) =>
    product.variants.map((variant) => ({
      ean: variant.ean,
      productId: product.id,
      sku: variant.sku,
    }))
  )
  const actual = observation.commerce.variants.map((variant) => ({
    ean: variant.ean,
    productId: variant.productId,
    sku: variant.sku,
  }))
  const canonical = (value: unknown) =>
    stablePostCommerceJson(unorderedSnapshotValue(value))
  if (canonical(actual) !== canonical(expected)) {
    throw new Error(
      "live product/variant identity drifted from source inventory"
    )
  }
}

const verifyReadiness = (
  plan: RoDemoCommercePlan,
  observation: PostCommerceObservation
) => {
  const snapshot = observation.commerce
  if (!snapshot.salesChannelIds.includes(plan.salesChannelId)) {
    throw new Error("reviewed RO sales channel is missing")
  }
  const salesChannel = exactOne(
    observation.salesChannels.filter(({ id }) => id === plan.salesChannelId),
    "reviewed RO sales channel observation"
  )
  if (
    salesChannel.metadata.market_code !== "ro" ||
    salesChannel.metadata.currency_code !== "ron"
  ) {
    throw new Error("RO sales channel metadata is not market=ro/currency=ron")
  }
  const region = exactOne(
    snapshot.regions.filter(({ name }) => name === plan.region.name),
    "RO demo region"
  )
  if (
    region.currencyCode.toLowerCase() !== "ron" ||
    !region.isTaxInclusive ||
    stablePostCommerceJson(sorted(region.countryCodes)) !== '["ro"]' ||
    stablePostCommerceJson(region.metadata) !==
      stablePostCommerceJson(plan.region.metadata)
  ) {
    throw new Error("observed RO region differs from the reviewed plan")
  }
  assertSameStringSet(
    region.paymentProviderIds,
    plan.payment.providerIds,
    "RO region payment providers"
  )
  for (const providerId of plan.payment.providerIds) {
    const provider = exactOne(
      snapshot.paymentProviders.filter(({ id }) => id === providerId),
      `payment provider ${providerId}`
    )
    if (!provider.enabled) {
      throw new Error(`payment provider ${providerId} is disabled`)
    }
  }
  const ownedShipping = observation.shippingOptions.filter(
    ({ data }) => data.source === RO_DEMO_SOURCE
  )
  assertSameStringSet(
    ownedShipping.map(({ code }) => code),
    plan.shipping.map(({ code }) => code),
    "RO owned shipping codes"
  )
  for (const planned of plan.shipping) {
    const option = exactOne(
      ownedShipping.filter(({ code }) => code === planned.code),
      `shipping option ${planned.code}`
    )
    if (
      stablePostCommerceJson(sorted(option.countryCodes)) !== '["ro"]' ||
      option.fulfillmentSetId !== plan.binding.fulfillmentSetId ||
      option.providerId !== plan.binding.fulfillmentProviderId ||
      option.shippingProfileId !== plan.binding.shippingProfileId ||
      option.data.market_code !== "ro" ||
      stablePostCommerceJson(option.data.ro_demo_checkout ?? null) !==
        stablePostCommerceJson(plan.payment.demoCheckout)
    ) {
      throw new Error(`shipping option ${planned.code} binding drifted`)
    }
    const expectedPrices = [
      { amount: planned.amount, currencyCode: "ron", rules: [] },
      ...(planned.freeFrom
        ? [
            {
              amount: 0,
              currencyCode: "ron",
              rules: [
                {
                  attribute: "item_total",
                  operator: "gte",
                  value: planned.freeFrom,
                },
              ],
            },
          ]
        : []),
    ]
    if (
      stablePostCommerceJson(unorderedSnapshotValue(option.prices)) !==
      stablePostCommerceJson(unorderedSnapshotValue(expectedPrices))
    ) {
      throw new Error(`shipping option ${planned.code} RON prices drifted`)
    }
  }
  const taxRegion = exactOne(
    snapshot.taxRegions.filter(({ countryCode }) => countryCode === "ro"),
    "Romanian tax region"
  )
  const taxRates = snapshot.taxRates.filter(
    ({ taxRegionId }) => taxRegionId === taxRegion.id
  )
  const defaultRate = exactOne(
    taxRates.filter(({ isDefault }) => isDefault),
    "Romanian default tax rate"
  )
  if (defaultRate.rate !== 21) {
    throw new Error("Romanian default tax rate is not 21%")
  }
  const eleven = exactOne(
    taxRates.filter(
      (rate) => rate.rate === 11 && rate.metadata.demo_source === RO_DEMO_SOURCE
    ),
    "owned Romanian 11% tax rate"
  )
  assertSameStringSet(
    eleven.productIds,
    plan.taxAssignments
      .filter(({ rate }) => rate === 11)
      .map(({ productId }) => productId),
    "Romanian 11% tax assignments"
  )
  const ronCurrencyPreference = exactOne(
    snapshot.pricePreferences.filter(
      ({ attribute, value }) =>
        attribute === "currency_code" && value.toLowerCase() === "ron"
    ),
    "RON currency price preference"
  )
  const ronRegionPreference = exactOne(
    snapshot.pricePreferences.filter(
      ({ attribute, value }) => attribute === "region_id" && value === region.id
    ),
    "RON region price preference"
  )
  if (
    !(
      ronCurrencyPreference.isTaxInclusive && ronRegionPreference.isTaxInclusive
    )
  ) {
    throw new Error("RON price preferences must be tax inclusive")
  }
  if (
    !snapshot.stores.some((store) =>
      store.supportedCurrencies.some(
        ({ currencyCode }) => currencyCode.toLowerCase() === "ron"
      )
    )
  ) {
    throw new Error("Medusa store does not support RON")
  }
  return {
    currencyCode: "ron" as const,
    paymentProviderIds: sorted(plan.payment.providerIds),
    regionId: region.id,
    shippingOptionIds: sorted(ownedShipping.map(({ id }) => id)),
    taxRegionIds: [taxRegion.id],
  }
}

export const assertRoDemoApplyArtifacts = (
  input: Readonly<{
    applyReceiptSha256: string
    commercePlanHash: string
    observation: PostCommerceObservation
    plan: RoDemoCommercePlan
    priceAuthority: PostCommercePriceAuthority
    priceAuthoritySha256: string
    receipt: RoDemoApplyReceipt
    restoreArtifact: RoDemoRestoreArtifact
    restoreArtifactSha256: string
  }>
) => {
  const {
    commercePlanHash,
    observation,
    plan,
    priceAuthority,
    priceAuthoritySha256,
    receipt,
    restoreArtifact,
    restoreArtifactSha256,
  } = input
  if (
    sha256RoDemoArtifactBytes(serializeRoDemoArtifact(receipt)) !==
      input.applyReceiptSha256 ||
    sha256RoDemoArtifactBytes(serializeRoDemoArtifact(restoreArtifact)) !==
      restoreArtifactSha256 ||
    receipt.planHash !== commercePlanHash ||
    restoreArtifact.planHash !== commercePlanHash ||
    receipt.priceAuthorityKind !== plan.priceAuthorityKind ||
    restoreArtifact.priceAuthorityKind !== plan.priceAuthorityKind ||
    receipt.priceAuthoritySha256 !== priceAuthoritySha256 ||
    restoreArtifact.priceAuthoritySha256 !== priceAuthoritySha256 ||
    receipt.restoreArtifactSha256 !== restoreArtifactSha256
  ) {
    throw new Error(
      "commerce apply receipt/restore chain is not bound to the reviewed plan and authority"
    )
  }
  const freshSkBaselineHash = hashSkCommerceBaseline(observation.commerce)
  if (
    hashSkCommerceBaseline(restoreArtifact.snapshot) !== plan.skBaselineHash ||
    receipt.skBaselineHashBefore !== plan.skBaselineHash ||
    receipt.skBaselineHashAfter !== freshSkBaselineHash
  ) {
    throw new Error(
      "commerce apply receipt/restore SK baseline does not match fresh state"
    )
  }
  const restoreInventoryIdentitySha256 = sha256PrecommerceInventoryIdentity(
    [
      ...new Set(
        restoreArtifact.snapshot.variants.map(({ productId }) => productId)
      ),
    ]
      .sort((left, right) => left.localeCompare(right, "en"))
      .map((productId) => ({
        productId,
        variants: restoreArtifact.snapshot.variants
          .filter((variant) => variant.productId === productId)
          .map((variant) => ({
            ean: variant.ean,
            liveSku: variant.sku,
            variantId: variant.id,
          }))
          .sort((left, right) =>
            left.variantId.localeCompare(right.variantId, "en")
          ),
      }))
  )
  if (
    restoreInventoryIdentitySha256 !== priceAuthority.inventoryIdentitySha256
  ) {
    throw new Error(
      "commerce restore inventory identity does not match price authority"
    )
  }

  const readiness = verifyReadiness(plan, observation)
  const region = exactOne(
    observation.commerce.regions.filter(({ id }) => id === readiness.regionId),
    "fresh receipt region"
  )
  const serviceZone = exactOne(
    observation.commerce.serviceZones.filter(
      (zone) =>
        zone.id === receipt.postState.serviceZoneId &&
        zone.fulfillmentSetId === plan.binding.fulfillmentSetId &&
        stablePostCommerceJson(sorted(zone.countryCodes)) === '["ro"]'
    ),
    "fresh receipt service zone"
  )
  const ownedShipping = observation.shippingOptions.filter(
    ({ data }) => data.source === RO_DEMO_SOURCE
  )
  const taxRegion = exactOne(
    observation.commerce.taxRegions.filter(
      ({ countryCode }) => countryCode.toLowerCase() === "ro"
    ),
    "fresh receipt tax region"
  )
  const taxRates = observation.commerce.taxRates.filter(
    ({ taxRegionId }) => taxRegionId === taxRegion.id
  )
  const defaultTaxRate = exactOne(
    taxRates.filter(({ isDefault, rate }) => isDefault && rate === 21),
    "fresh receipt default tax rate"
  )
  const ownedElevenTaxRate = exactOne(
    taxRates.filter(
      ({ isDefault, metadata, rate }) =>
        !isDefault && rate === 11 && metadata.demo_source === RO_DEMO_SOURCE
    ),
    "fresh receipt owned 11% tax rate"
  )
  const freshPostState: RoDemoApplyReceipt["postState"] = {
    paymentProviderIds: plan.payment.providerIds,
    regionId: region.id,
    salesChannelId: plan.salesChannelId,
    serviceZoneId: serviceZone.id,
    shippingOptions: plan.shipping.map(({ code }) => ({
      code,
      id: exactOne(
        ownedShipping.filter(
          (option) =>
            option.code === code && option.serviceZoneId === serviceZone.id
        ),
        `fresh receipt shipping option ${code}`
      ).id,
    })),
    taxRateIds: sorted([defaultTaxRate.id, ownedElevenTaxRate.id]),
    taxRegionIds: [taxRegion.id],
    variantPrices: plan.variantPrices.map(
      ({ amount, productId, variantId }) => {
        const variant = exactOne(
          observation.commerce.variants.filter(({ id }) => id === variantId),
          `fresh receipt variant ${variantId}`
        )
        const price = exactOne(
          defaultRonPrices(variant),
          `fresh receipt RON price ${variantId}`
        )
        if (variant.productId !== productId || price.amount !== amount) {
          throw new Error(`fresh receipt variant price ${variantId} drifted`)
        }
        return { amount, productId, variantId }
      }
    ),
  }
  if (
    serializeRoDemoArtifact(freshPostState) !==
      serializeRoDemoArtifact(receipt.postState) ||
    sha256RoDemoArtifactBytes(serializeRoDemoArtifact(freshPostState)) !==
      receipt.postStateSha256
  ) {
    throw new Error("commerce apply receipt postState differs from fresh DB")
  }
}

const enrichInventoryPrices = (
  input: Readonly<{
    authority: PostCommercePriceAuthority
    expectedCounts: PostCommerceExpectedCounts
    observation: PostCommerceObservation
    plan: RoDemoCommercePlan
    source: DemoLocalizationFileInput
  }>
) => {
  const { authority, expectedCounts, observation, plan, source } = input
  const productById = new Map(
    source.inventory.products.map((product) => [product.id, product])
  )
  const liveVariantById = new Map(
    observation.commerce.variants.map((variant) => [variant.id, variant])
  )
  const plannedPriceByVariantId = new Map(
    plan.variantPrices.map((mutation) => [mutation.variantId, mutation])
  )
  const authorityVariants = authority.products.flatMap((product) =>
    product.variants.map((variant) => ({
      ...variant,
      productId: product.productId,
    }))
  )
  const sellableAuthorityVariants = authorityVariants.filter(
    (variant) => variant.roAvailability === "sellable"
  )
  if (
    plannedPriceByVariantId.size !== sellableAuthorityVariants.length ||
    sellableAuthorityVariants.length !== expectedCounts.productsPublished ||
    authority.products.length !== expectedCounts.productsPublished
  ) {
    throw new Error(
      "reviewed plan and price authority do not match the frozen sellable scope"
    )
  }
  const priceByInventoryIdentity = new Map<
    string,
    NonNullable<DemoInventoryProduct["variants"][number]["ronPrice"]>
  >()
  for (const item of sellableAuthorityVariants) {
    if (item.roAvailability !== "sellable") {
      throw new Error("internal sellable authority narrowing failed")
    }
    const product = exactOne(
      [productById.get(item.productId)].filter(Boolean),
      `authority product ${item.productId}`
    ) as DemoInventoryProduct
    if (product.roExclusionDecision) {
      throw new Error(`authority prices excluded product ${item.productId}`)
    }
    const inventoryVariant = exactOne(
      product.variants.filter(
        (variant) =>
          variant.ean === item.ean &&
          (item.liveSku === null || variant.sku === item.liveSku)
      ),
      `authority inventory variant ${item.variantId}`
    )
    const live = exactOne(
      [liveVariantById.get(item.variantId)].filter(Boolean),
      `authority live variant ${item.variantId}`
    ) as RoDemoSnapshot["variants"][number]
    if (
      live.productId !== item.productId ||
      live.ean !== item.ean ||
      live.sku !== item.liveSku
    ) {
      throw new Error(`authority live identity ${item.variantId} drifted`)
    }
    const mutation = plannedPriceByVariantId.get(item.variantId)
    if (!mutation) {
      throw new Error(`planned price ${item.variantId} is missing`)
    }
    if (
      mutation.productId !== item.productId ||
      mutation.amount !== item.price.amount
    ) {
      throw new Error(`planned price ${item.variantId} differs from authority`)
    }
    const actual = exactOne(
      defaultRonPrices(live),
      `actual base RON price ${item.variantId}`
    )
    if (actual.amount !== item.price.amount) {
      throw new Error(
        `actual RON price ${item.variantId} differs from authority`
      )
    }
    const identity = `${item.productId}\u0000${inventoryVariant.ean ?? ""}\u0000${inventoryVariant.sku ?? ""}`
    if (priceByInventoryIdentity.has(identity)) {
      throw new Error(`authority duplicates inventory identity ${identity}`)
    }
    priceByInventoryIdentity.set(identity, {
      amount: item.price.amount,
      approval: item.price.approval,
    })
  }
  for (const item of authorityVariants.filter(
    (variant) => variant.roAvailability === "unavailable"
  )) {
    const live = exactOne(
      [liveVariantById.get(item.variantId)].filter(Boolean),
      `unavailable live variant ${item.variantId}`
    ) as RoDemoSnapshot["variants"][number]
    if (
      live.productId !== item.productId ||
      live.ean !== item.ean ||
      live.sku !== item.liveSku ||
      defaultRonPrices(live).length !== 0 ||
      plannedPriceByVariantId.has(item.variantId)
    ) {
      throw new Error(`unavailable variant ${item.variantId} is not price-free`)
    }
  }
  const products = source.inventory.products.map((product) => ({
    ...product,
    variants: product.variants.map((variant) => {
      const identity = `${product.id}\u0000${variant.ean ?? ""}\u0000${variant.sku ?? ""}`
      const price = priceByInventoryIdentity.get(identity)
      if (!price) {
        const { ronPrice: _discardedPrecommercePrice, ...unchanged } = variant
        return unchanged
      }
      return { ...variant, ronPrice: price }
    }),
  }))
  const assignedCount = products
    .flatMap(({ variants }) => variants)
    .filter((variant) => "ronPrice" in variant && variant.ronPrice).length
  if (assignedCount !== expectedCounts.productsPublished) {
    throw new Error(
      "final inventory does not contain the frozen count of RON prices"
    )
  }
  return products
}

export const buildPostCommerceEnvelope = (
  input: Readonly<{
    backendBuildHash: string
    backendDeploymentId: string
    backendReleaseSha: string
    backendSlot: "blue" | "green"
    capturedAt: string
    commerceApplyReceipt: RoDemoApplyReceipt
    commerceApplyReceiptSha256: string
    commercePlan: RoDemoCommercePlan
    commercePlanFileSha256: string
    commercePlanHash: string
    commerceRestoreArtifact: RoDemoRestoreArtifact
    commerceRestoreArtifactSha256: string
    environmentId: string
    observation: PostCommerceObservation
    postCommerceSharedInventoryFingerprint: PostCommerceStateFingerprint
    preCommerceSharedInventoryFingerprint: PostCommerceStateFingerprint
    priceAuthority: PostCommercePriceAuthority
    priceAuthoritySha256: string
    rawLiveInventorySha256: string
    sourceInventory: DemoLocalizationFileInput
    sourceInventoryEnvelopeSha256: string
    expectedCounts?: PostCommerceExpectedCounts
  }>
): PostCommerceEnvelope => {
  timestamp(input.capturedAt, "capturedAt")
  sha256(input.sourceInventoryEnvelopeSha256, "sourceInventoryEnvelopeSha256")
  sha256(input.rawLiveInventorySha256, "rawLiveInventorySha256")
  sha256(input.priceAuthoritySha256, "priceAuthoritySha256")
  sha256(input.commercePlanHash, "commercePlanHash")
  sha256(input.commercePlanFileSha256, "commercePlanFileSha256")
  sha256(input.commerceApplyReceiptSha256, "commerceApplyReceiptSha256")
  sha256(input.commerceRestoreArtifactSha256, "commerceRestoreArtifactSha256")
  nonblank(input.environmentId, "environmentId")
  safeId(input.backendBuildHash, "backendBuildHash")
  safeId(input.backendDeploymentId, "backendDeploymentId")
  if (!GIT_SHA.test(input.backendReleaseSha)) {
    throw new Error("backendReleaseSha must be a full lowercase Git SHA")
  }
  if (input.commercePlan.priceAuthoritySha256 !== input.priceAuthoritySha256) {
    throw new Error(
      "commerce plan is not bound to the reviewed price authority"
    )
  }
  if (hashRoDemoCommercePlan(input.commercePlan) !== input.commercePlanHash) {
    throw new Error("commerce plan semantic hash does not match reviewed bytes")
  }
  if (
    stablePostCommerceJson(input.preCommerceSharedInventoryFingerprint) !==
    stablePostCommerceJson(input.postCommerceSharedInventoryFingerprint)
  ) {
    throw new Error("shared inventory changed during RO commerce apply")
  }
  assertRoDemoApplyArtifacts({
    applyReceiptSha256: input.commerceApplyReceiptSha256,
    commercePlanHash: input.commercePlanHash,
    observation: input.observation,
    plan: input.commercePlan,
    priceAuthority: input.priceAuthority,
    priceAuthoritySha256: input.priceAuthoritySha256,
    receipt: input.commerceApplyReceipt,
    restoreArtifact: input.commerceRestoreArtifact,
    restoreArtifactSha256: input.commerceRestoreArtifactSha256,
  })
  assertCatalogIdentityUnchanged(input.sourceInventory, input.observation)
  const observedAuthorityIdentitySha256 = sha256PrecommerceInventoryIdentity(
    [
      ...new Map(
        input.observation.commerce.variants.map((variant) => [
          variant.productId,
          variant.productId,
        ])
      ).values(),
    ]
      .sort((left, right) => left.localeCompare(right, "en"))
      .map((productId) => ({
        productId,
        variants: input.observation.commerce.variants
          .filter((variant) => variant.productId === productId)
          .map((variant) => ({
            ean: variant.ean,
            liveSku: variant.sku,
            variantId: variant.id,
          }))
          .sort((left, right) =>
            left.variantId.localeCompare(right.variantId, "en")
          ),
      }))
  )
  if (
    observedAuthorityIdentitySha256 !==
    input.priceAuthority.inventoryIdentitySha256
  ) {
    throw new Error(
      "fresh live inventory identity does not match price authority"
    )
  }
  const postCommerceSkBaselineSha256 = hashSkCommerceBaseline(
    input.observation.commerce
  )
  const preCommerceSkBaselineSha256 = input.commercePlan.skBaselineHash
  if (preCommerceSkBaselineSha256 !== postCommerceSkBaselineSha256) {
    throw new Error("SK commerce baseline changed during RO commerce apply")
  }
  const readiness = verifyReadiness(input.commercePlan, input.observation)
  const expectedCounts = input.expectedCounts ?? PRODUCTION_POST_COMMERCE_COUNTS
  const payload: DemoLocalizationFileInput = {
    ...input.sourceInventory,
    generatedAt: input.capturedAt,
    inventory: {
      ...input.sourceInventory.inventory,
      products: enrichInventoryPrices({
        authority: input.priceAuthority,
        expectedCounts,
        observation: input.observation,
        plan: input.commercePlan,
        source: input.sourceInventory,
      }),
    },
    readiness,
    salesChannelId: input.commercePlan.salesChannelId,
  }
  validateFinalPayload(payload, expectedCounts)
  const payloadSha256 = postCommerceSha256(stablePostCommerceJson(payload))
  const skProjection = buildSkCommerceBaseline(input.observation.commerce)
  const skBaselineCount =
    skProjection.nonRonVariantPrices.length +
    skProjection.skRegions.length +
    skProjection.skServiceZones.length +
    skProjection.storeNonRonCurrencies.length
  const preCommerceSkBaseline: PostCommerceStateProof = {
    count: skBaselineCount,
    errors: [],
    sha256: preCommerceSkBaselineSha256,
  }
  const postCommerceSkBaseline: PostCommerceStateProof = {
    count: skBaselineCount,
    errors: [],
    sha256: postCommerceSkBaselineSha256,
  }
  const databaseFingerprint = postCommerceSha256(
    stablePostCommerceJson({
      moduleIdentity: "medusa-v2:product-variant-inventory",
      productIds: sorted(
        input.sourceInventory.inventory.products.map(({ id }) => id)
      ),
      salesChannelId: input.commercePlan.salesChannelId,
      storeIds: sorted(input.observation.commerce.stores.map(({ id }) => id)),
      variantIds: sorted(
        input.observation.commerce.variants.map(({ id }) => id)
      ),
    })
  )
  return {
    capturedAt: input.capturedAt,
    commerceApplyReceiptSha256: input.commerceApplyReceiptSha256,
    commercePlanFileSha256: input.commercePlanFileSha256,
    commercePlanHash: input.commercePlanHash,
    commerceRestoreArtifactSha256: input.commerceRestoreArtifactSha256,
    environment: {
      backendBuildHash: input.backendBuildHash,
      backendDeploymentId: input.backendDeploymentId,
      backendReleaseSha: input.backendReleaseSha,
      backendSlot: input.backendSlot,
      databaseFingerprint,
      environmentId: input.environmentId,
      locale: "ro-RO",
      marketCode: "ro",
      salesChannelId: input.commercePlan.salesChannelId,
    },
    kind: "ro-demo-post-commerce-envelope",
    observedCommerceSnapshotSha256: hashPostCommerceObservation(
      input.observation
    ),
    payload,
    payloadSha256,
    postCommerceSharedInventoryFingerprint:
      input.postCommerceSharedInventoryFingerprint,
    postCommerceSkBaseline,
    preCommerceSharedInventoryFingerprint:
      input.preCommerceSharedInventoryFingerprint,
    preCommerceSkBaseline,
    priceAuthoritySha256: input.priceAuthoritySha256,
    rawLiveInventorySha256: input.rawLiveInventorySha256,
    schemaVersion: 1,
    sourceInventoryEnvelopeSha256: input.sourceInventoryEnvelopeSha256,
  }
}

const requireArg = (args: readonly string[], index: number, flag: string) => {
  const value = args[index + 1]
  if (!(value && !value.startsWith("--"))) {
    throw new Error(`${flag} requires a value`)
  }
  return value
}

export const assertObservedPostCommerceDeployment = (
  options: Pick<
    PostCommerceEnvelopeCliOptions,
    | "expectedBackendBuildHash"
    | "expectedBackendDeploymentId"
    | "expectedBackendReleaseSha"
    | "expectedBackendSlot"
    | "expectedEnvironmentId"
  >,
  environment: NodeJS.ProcessEnv
): ObservedPostCommerceDeployment => {
  const observed = {
    backendBuildHash: safeId(
      environment.BACKEND_BUILD_HASH,
      "BACKEND_BUILD_HASH"
    ),
    backendDeploymentId: safeId(
      environment.ZANE_DEPLOYMENT_ID,
      "ZANE_DEPLOYMENT_ID"
    ),
    backendReleaseSha: nonblank(environment.RELEASE_SHA, "RELEASE_SHA"),
    backendSlot: environment.ZANE_DEPLOYMENT_SLOT,
    environmentId: safeId(
      environment.RO_DEMO_ENVIRONMENT_ID,
      "RO_DEMO_ENVIRONMENT_ID"
    ),
  }
  if (
    observed.environmentId !== options.expectedEnvironmentId ||
    observed.backendBuildHash !== options.expectedBackendBuildHash ||
    observed.backendDeploymentId !== options.expectedBackendDeploymentId ||
    observed.backendReleaseSha !== options.expectedBackendReleaseSha ||
    observed.backendSlot !== options.expectedBackendSlot ||
    !GIT_SHA.test(observed.backendReleaseSha) ||
    (observed.backendSlot !== "blue" && observed.backendSlot !== "green")
  ) {
    throw new Error(
      "observed environment/build does not match the reviewed deployment"
    )
  }
  return observed as ObservedPostCommerceDeployment
}

export const parsePostCommerceEnvelopeCliOptions = (
  args: readonly string[]
): PostCommerceEnvelopeCliOptions => {
  const allowed = new Set([
    "--commerce-apply-receipt",
    "--commerce-apply-receipt-sha256",
    "--commerce-plan",
    "--commerce-plan-file-sha256",
    "--commerce-plan-hash",
    "--commerce-restore-artifact",
    "--commerce-restore-artifact-sha256",
    "--expected-backend-build-hash",
    "--expected-backend-deployment-id",
    "--expected-backend-release-sha",
    "--expected-backend-slot",
    "--expected-environment-id",
    "--inventory",
    "--inventory-sha256",
    "--output",
    "--pre-commerce-shared-inventory-fingerprint",
    "--pre-commerce-shared-inventory-fingerprint-sha256",
    "--price-authority",
    "--price-authority-sha256",
    "--raw-live-inventory",
    "--raw-live-inventory-sha256",
  ])
  const values = new Map<string, string>()
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]
    if (!(flag && allowed.has(flag))) {
      throw new Error(`Unknown option ${flag ?? "<missing>"}`)
    }
    if (values.has(flag)) {
      throw new Error(`Duplicate option ${flag}`)
    }
    values.set(flag, requireArg(args, index, flag))
  }
  const missing = [...allowed].find((flag) => !values.has(flag))
  if (missing) {
    throw new Error(`Missing required option ${missing}`)
  }
  const expectedBackendBuildHash = safeId(
    values.get("--expected-backend-build-hash"),
    "--expected-backend-build-hash"
  )
  const expectedBackendReleaseSha = nonblank(
    values.get("--expected-backend-release-sha"),
    "--expected-backend-release-sha"
  )
  if (!GIT_SHA.test(expectedBackendReleaseSha)) {
    throw new Error(
      "--expected-backend-release-sha must be a full lowercase Git SHA"
    )
  }
  const expectedBackendSlot = values.get("--expected-backend-slot")
  if (expectedBackendSlot !== "blue" && expectedBackendSlot !== "green") {
    throw new Error("--expected-backend-slot must be blue or green")
  }
  return {
    commerceApplyReceiptPath: resolve(
      values.get("--commerce-apply-receipt") as string
    ),
    commerceApplyReceiptSha256: sha256(
      values.get("--commerce-apply-receipt-sha256"),
      "--commerce-apply-receipt-sha256"
    ),
    commercePlanFileSha256: sha256(
      values.get("--commerce-plan-file-sha256"),
      "--commerce-plan-file-sha256"
    ),
    commercePlanHash: sha256(
      values.get("--commerce-plan-hash"),
      "--commerce-plan-hash"
    ),
    commercePlanPath: resolve(values.get("--commerce-plan") as string),
    commerceRestoreArtifactPath: resolve(
      values.get("--commerce-restore-artifact") as string
    ),
    commerceRestoreArtifactSha256: sha256(
      values.get("--commerce-restore-artifact-sha256"),
      "--commerce-restore-artifact-sha256"
    ),
    expectedBackendBuildHash,
    expectedBackendDeploymentId: safeId(
      values.get("--expected-backend-deployment-id"),
      "--expected-backend-deployment-id"
    ),
    expectedBackendReleaseSha,
    expectedBackendSlot,
    expectedEnvironmentId: safeId(
      values.get("--expected-environment-id"),
      "--expected-environment-id"
    ),
    inventoryPath: resolve(values.get("--inventory") as string),
    inventorySha256: sha256(
      values.get("--inventory-sha256"),
      "--inventory-sha256"
    ),
    outputPath: resolve(values.get("--output") as string),
    preCommerceSharedInventoryFingerprintPath: resolve(
      values.get("--pre-commerce-shared-inventory-fingerprint") as string
    ),
    preCommerceSharedInventoryFingerprintSha256: sha256(
      values.get("--pre-commerce-shared-inventory-fingerprint-sha256"),
      "--pre-commerce-shared-inventory-fingerprint-sha256"
    ),
    priceAuthorityPath: resolve(values.get("--price-authority") as string),
    priceAuthoritySha256: sha256(
      values.get("--price-authority-sha256"),
      "--price-authority-sha256"
    ),
    rawLiveInventoryPath: resolve(values.get("--raw-live-inventory") as string),
    rawLiveInventorySha256: sha256(
      values.get("--raw-live-inventory-sha256"),
      "--raw-live-inventory-sha256"
    ),
  }
}

const parseJson = <Value>(text: string, label: string): Value => {
  try {
    return JSON.parse(text) as Value
  } catch {
    throw new Error(`${label} is not valid JSON`)
  }
}

export const writePostCommerceEnvelopeNoClobber = async (
  path: string,
  bytes: string
) => {
  const temporaryPath = `${path}.tmp-${process.pid}-${Date.now()}`
  const handle = await open(temporaryPath, "wx", 0o600)
  let closed = false
  let published = false
  try {
    await handle.writeFile(bytes, "utf8")
    await handle.sync()
    await handle.close()
    closed = true
    await hardLink(temporaryPath, path)
    published = true
  } finally {
    if (!closed) {
      await handle.close().catch(() => {
        // Preserve the original write failure.
      })
    }
    await unlink(temporaryPath).catch(() => {
      // Best-effort cleanup preserves the original write/publish failure.
    })
  }
  if (!published) {
    throw new Error("post-commerce envelope was not published")
  }
}

export const assertPostCommerceArtifactPaths = async (
  options: PostCommerceEnvelopeCliOptions
) => {
  const inputPaths = [
    options.commerceApplyReceiptPath,
    options.commercePlanPath,
    options.commerceRestoreArtifactPath,
    options.inventoryPath,
    options.preCommerceSharedInventoryFingerprintPath,
    options.priceAuthorityPath,
    options.rawLiveInventoryPath,
  ]
  const identities = new Set<string>()
  for (const path of inputPaths) {
    if (path !== resolve(path)) {
      throw new Error("post-commerce artifact paths must be absolute")
    }
    const [canonicalPath, metadata] = await Promise.all([
      realpath(path),
      stat(path),
    ])
    if (canonicalPath !== path || !metadata.isFile()) {
      throw new Error(
        "post-commerce input artifacts must be regular files without symlink aliases"
      )
    }
    const identity = `${metadata.dev}:${metadata.ino}`
    if (identities.has(identity)) {
      throw new Error("post-commerce input artifact paths must be distinct")
    }
    identities.add(identity)
  }
  const canonicalOutputParent = await realpath(dirname(options.outputPath))
  if (
    options.outputPath !== resolve(options.outputPath) ||
    canonicalOutputParent !== dirname(options.outputPath)
  ) {
    throw new Error(
      "post-commerce output must use an absolute non-symlink directory"
    )
  }
  const canonicalOutput = join(
    canonicalOutputParent,
    basename(options.outputPath)
  )
  if (inputPaths.includes(canonicalOutput)) {
    throw new Error("post-commerce output must not alias an input artifact")
  }
  try {
    await stat(canonicalOutput)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return
    }
    throw error
  }
  throw new Error("post-commerce output already exists; refusing to clobber")
}

const stringField = (value: unknown, label: string) => nonblank(value, label)
const recordField = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const numericField = (value: unknown, label: string) => {
  const parsed = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} is not numeric`)
  }
  return parsed
}

const readAll = async <Value>(
  query: QueryService,
  entity: string,
  fields: readonly string[]
) => {
  const rows: Value[] = []
  for (let skip = 0; ; skip += 500) {
    const { data = [] } = await query.graph<Value>({
      entity,
      fields,
      pagination: { skip, take: 500 },
    })
    rows.push(...data)
    if (data.length < 500) {
      return rows
    }
  }
}

export const buildSharedInventoryFingerprint = (
  input: Readonly<{
    levels: readonly Readonly<{
      inventoryItemId: string
      locationId: string
      reservedQuantity: number
      stockedQuantity: number
    }>[]
    links: readonly Readonly<{
      inventoryItemId: string
      requiredQuantity: number
      variantId: string
    }>[]
  }>
): PostCommerceStateFingerprint => {
  const links = [...input.links].sort((left, right) =>
    `${left.variantId}\u0000${left.inventoryItemId}`.localeCompare(
      `${right.variantId}\u0000${right.inventoryItemId}`,
      "en"
    )
  )
  const levels = [...input.levels].sort((left, right) =>
    `${left.inventoryItemId}\u0000${left.locationId}`.localeCompare(
      `${right.inventoryItemId}\u0000${right.locationId}`,
      "en"
    )
  )
  const duplicateLink = links.find(
    (link, index) =>
      index > 0 &&
      link.variantId === links[index - 1]?.variantId &&
      link.inventoryItemId === links[index - 1]?.inventoryItemId
  )
  const duplicateLevel = levels.find(
    (level, index) =>
      index > 0 &&
      level.inventoryItemId === levels[index - 1]?.inventoryItemId &&
      level.locationId === levels[index - 1]?.locationId
  )
  if (duplicateLink || duplicateLevel) {
    throw new Error("shared inventory projection contains duplicate rows")
  }
  return {
    count: links.length + levels.length,
    sha256: postCommerceSha256(stablePostCommerceJson({ levels, links })),
  }
}

export const inspectSharedInventoryFingerprint = async (
  container: ExecArgs["container"]
): Promise<PostCommerceStateFingerprint> => {
  const query = container.resolve<QueryService>(ContainerRegistrationKeys.QUERY)
  const [variants, rawLevels] = await Promise.all([
    readAll<{
      id?: unknown
      inventory_items?: readonly {
        inventory_item_id?: unknown
        required_quantity?: unknown
      }[]
    }>(query, "product_variant", [
      "id",
      "inventory_items.inventory_item_id",
      "inventory_items.required_quantity",
    ]),
    readAll<{
      inventory_item_id?: unknown
      location_id?: unknown
      reserved_quantity?: unknown
      stocked_quantity?: unknown
    }>(query, "inventory_level", [
      "inventory_item_id",
      "location_id",
      "reserved_quantity",
      "stocked_quantity",
    ]),
  ])
  const links = variants.flatMap((variant, variantIndex) => {
    const variantId = stringField(
      variant.id,
      `inventory variant ${variantIndex}`
    )
    return (variant.inventory_items ?? []).map((link, linkIndex) => ({
      inventoryItemId: stringField(
        link.inventory_item_id,
        `inventory variant ${variantIndex}.link ${linkIndex}.inventoryItemId`
      ),
      requiredQuantity: numericField(
        link.required_quantity,
        `inventory variant ${variantIndex}.link ${linkIndex}.requiredQuantity`
      ),
      variantId,
    }))
  })
  const referencedInventoryIds = new Set(
    links.map(({ inventoryItemId }) => inventoryItemId)
  )
  const levels = rawLevels.flatMap((level, index) => {
    const inventoryItemId = stringField(
      level.inventory_item_id,
      `inventory level ${index}.inventoryItemId`
    )
    if (!referencedInventoryIds.has(inventoryItemId)) {
      return []
    }
    return [
      {
        inventoryItemId,
        locationId: stringField(
          level.location_id,
          `inventory level ${index}.locationId`
        ),
        reservedQuantity: numericField(
          level.reserved_quantity,
          `inventory level ${index}.reservedQuantity`
        ),
        stockedQuantity: numericField(
          level.stocked_quantity,
          `inventory level ${index}.stockedQuantity`
        ),
      },
    ]
  })
  return buildSharedInventoryFingerprint({ levels, links })
}

export const inspectPostCommerceObservation = async (
  container: ExecArgs["container"]
): Promise<PostCommerceObservation> => {
  const { inspectRoDemoCommerce } = await import(
    "../ro-demo-commerce/runtime.js"
  )
  const query = container.resolve<QueryService>(ContainerRegistrationKeys.QUERY)
  const [commerce, shippingResult, salesChannelResult] = await Promise.all([
    inspectRoDemoCommerce(container),
    query.graph<{
      data?: unknown
      id?: unknown
      prices?: readonly {
        amount?: unknown
        currency_code?: unknown
        price_rules?: readonly {
          attribute?: unknown
          operator?: unknown
          value?: unknown
        }[]
      }[]
      provider_id?: unknown
      service_zone?: {
        fulfillment_set_id?: unknown
        geo_zones?: readonly { country_code?: unknown }[]
        id?: unknown
      }
      shipping_profile_id?: unknown
      type?: { code?: unknown }
    }>({
      entity: "shipping_option",
      fields: [
        "id",
        "data",
        "provider_id",
        "shipping_profile_id",
        "type.code",
        "service_zone.id",
        "service_zone.fulfillment_set_id",
        "service_zone.geo_zones.country_code",
        "prices.amount",
        "prices.currency_code",
        "prices.price_rules.attribute",
        "prices.price_rules.operator",
        "prices.price_rules.value",
      ],
      pagination: { take: 500 },
    }),
    query.graph<{ id?: unknown; metadata?: unknown }>({
      entity: "sales_channel",
      fields: ["id", "metadata"],
      pagination: { take: 500 },
    }),
  ])
  return {
    commerce,
    salesChannels: (salesChannelResult.data ?? []).map((channel, index) => ({
      id: stringField(channel.id, `sales channel ${index}.id`),
      metadata: recordField(channel.metadata),
    })),
    shippingOptions: (shippingResult.data ?? []).map((option, index) => ({
      code: stringField(option.type?.code, `shipping ${index}.code`),
      countryCodes: (option.service_zone?.geo_zones ?? []).map(
        (zone, zoneIndex) =>
          stringField(zone.country_code, `shipping ${index}.zone ${zoneIndex}`)
      ),
      data: recordField(option.data),
      fulfillmentSetId: stringField(
        option.service_zone?.fulfillment_set_id,
        `shipping ${index}.fulfillmentSetId`
      ),
      id: stringField(option.id, `shipping ${index}.id`),
      prices: (option.prices ?? []).map((price, priceIndex) => ({
        amount:
          typeof price.amount === "number"
            ? price.amount
            : Number.parseFloat(String(price.amount)),
        currencyCode: stringField(
          price.currency_code,
          `shipping ${index}.price ${priceIndex}.currency`
        ).toLowerCase(),
        rules: (price.price_rules ?? []).map((rule, ruleIndex) => ({
          attribute: stringField(
            rule.attribute,
            `shipping ${index}.price ${priceIndex}.rule ${ruleIndex}.attribute`
          ),
          operator: stringField(
            rule.operator,
            `shipping ${index}.price ${priceIndex}.rule ${ruleIndex}.operator`
          ),
          value: rule.value,
        })),
      })),
      providerId: stringField(
        option.provider_id,
        `shipping ${index}.providerId`
      ),
      serviceZoneId: stringField(
        option.service_zone?.id,
        `shipping ${index}.serviceZoneId`
      ),
      shippingProfileId: stringField(
        option.shipping_profile_id,
        `shipping ${index}.shippingProfileId`
      ),
    })),
  }
}

export default async function createPostCommerceEnvelope({
  args,
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const options = parsePostCommerceEnvelopeCliOptions(args)
  await assertPostCommerceArtifactPaths(options)
  const [
    applyReceiptBytes,
    inventoryBytes,
    rawLiveInventoryBytes,
    authorityBytes,
    planBytes,
    preInventoryFingerprintBytes,
    restoreArtifactBytes,
    observation,
    postCommerceSharedInventoryFingerprint,
  ] = await Promise.all([
    readFile(options.commerceApplyReceiptPath, "utf8"),
    readFile(options.inventoryPath, "utf8"),
    readFile(options.rawLiveInventoryPath, "utf8"),
    readFile(options.priceAuthorityPath, "utf8"),
    readFile(options.commercePlanPath, "utf8"),
    readFile(options.preCommerceSharedInventoryFingerprintPath, "utf8"),
    readFile(options.commerceRestoreArtifactPath, "utf8"),
    inspectPostCommerceObservation(container),
    inspectSharedInventoryFingerprint(container),
  ])
  if (
    sha256RoDemoArtifactBytes(applyReceiptBytes) !==
    options.commerceApplyReceiptSha256
  ) {
    throw new Error(
      "commerce apply receipt bytes do not match reviewed SHA-256"
    )
  }
  if (
    sha256RoDemoArtifactBytes(restoreArtifactBytes) !==
    options.commerceRestoreArtifactSha256
  ) {
    throw new Error(
      "commerce restore artifact bytes do not match reviewed SHA-256"
    )
  }
  if (postCommerceSha256(inventoryBytes) !== options.inventorySha256) {
    throw new Error("source inventory bytes do not match reviewed SHA-256")
  }
  if (postCommerceSha256(authorityBytes) !== options.priceAuthoritySha256) {
    throw new Error("price authority bytes do not match reviewed SHA-256")
  }
  if (
    postCommerceSha256(rawLiveInventoryBytes) !== options.rawLiveInventorySha256
  ) {
    throw new Error("raw live inventory bytes do not match reviewed SHA-256")
  }
  if (postCommerceSha256(planBytes) !== options.commercePlanFileSha256) {
    throw new Error("commerce plan bytes do not match reviewed SHA-256")
  }
  if (
    postCommerceSha256(preInventoryFingerprintBytes) !==
    options.preCommerceSharedInventoryFingerprintSha256
  ) {
    throw new Error(
      "pre-commerce shared inventory fingerprint bytes do not match reviewed SHA-256"
    )
  }
  const preCommerceSharedInventoryFingerprint =
    parseJson<PostCommerceStateFingerprint>(
      preInventoryFingerprintBytes,
      "pre-commerce shared inventory fingerprint"
    )
  if (
    Object.keys(preCommerceSharedInventoryFingerprint).sort().join(",") !==
      "count,sha256" ||
    !Number.isSafeInteger(preCommerceSharedInventoryFingerprint.count) ||
    preCommerceSharedInventoryFingerprint.count < 0 ||
    !SHA_256.test(preCommerceSharedInventoryFingerprint.sha256)
  ) {
    throw new Error("pre-commerce shared inventory fingerprint is invalid")
  }
  const observedDeployment = assertObservedPostCommerceDeployment(
    options,
    process.env
  )
  const envelope = buildPostCommerceEnvelope({
    backendBuildHash: observedDeployment.backendBuildHash,
    backendDeploymentId: observedDeployment.backendDeploymentId,
    backendReleaseSha: observedDeployment.backendReleaseSha,
    backendSlot: observedDeployment.backendSlot,
    capturedAt: new Date().toISOString(),
    commerceApplyReceipt: parseRoDemoApplyReceipt(applyReceiptBytes),
    commerceApplyReceiptSha256: options.commerceApplyReceiptSha256,
    commercePlan: parseJson<RoDemoCommercePlan>(planBytes, "commerce plan"),
    commercePlanFileSha256: options.commercePlanFileSha256,
    commercePlanHash: options.commercePlanHash,
    commerceRestoreArtifact: parseRoDemoRestoreArtifact(restoreArtifactBytes),
    commerceRestoreArtifactSha256: options.commerceRestoreArtifactSha256,
    environmentId: observedDeployment.environmentId,
    observation,
    postCommerceSharedInventoryFingerprint,
    preCommerceSharedInventoryFingerprint,
    priceAuthority: parsePrecommercePriceAuthority(authorityBytes),
    priceAuthoritySha256: options.priceAuthoritySha256,
    rawLiveInventorySha256: options.rawLiveInventorySha256,
    sourceInventory: parseJson<DemoLocalizationFileInput>(
      inventoryBytes,
      "source inventory"
    ),
    sourceInventoryEnvelopeSha256: options.inventorySha256,
  })
  const bytes = `${JSON.stringify(envelope, null, 2)}\n`
  await writePostCommerceEnvelopeNoClobber(options.outputPath, bytes)
  logger.info(
    `Fresh post-commerce envelope written read-only from Medusa state: ${options.outputPath}`
  )
  logger.info(
    `Post-commerce snapshot SHA-256: ${envelope.observedCommerceSnapshotSha256}`
  )
  return envelope
}
