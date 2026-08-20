const SHA256 = /^[a-f0-9]{64}$/
const RELEASE_SHA = /^[a-f0-9]{40}$/
const SAFE_ID = /^[A-Za-z0-9._:-]{1,160}$/
const DEMO_OMITTED_FIELDS = [
  "usage",
  "composition",
  "warning",
  "other",
] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

type StateFingerprint = Readonly<{ count: number; sha256: string }>
type MatchedBaselineProof = Readonly<{
  expected: StateFingerprint
  matched: boolean
  observed: StateFingerprint
}>

const isStateFingerprint = (value: unknown): value is StateFingerprint =>
  isRecord(value) &&
  Number.isSafeInteger(value.count) &&
  (value.count as number) >= 0 &&
  typeof value.sha256 === "string" &&
  SHA256.test(value.sha256)

const isMatchedBaselineProof = (
  value: unknown
): value is MatchedBaselineProof => {
  if (
    !isRecord(value) ||
    JSON.stringify(Object.keys(value).sort()) !==
      JSON.stringify(["expected", "matched", "observed"]) ||
    !isStateFingerprint(value.expected) ||
    !isStateFingerprint(value.observed) ||
    typeof value.matched !== "boolean"
  ) {
    return false
  }
  return (
    value.matched ===
    (value.expected.count === value.observed.count &&
      value.expected.sha256 === value.observed.sha256)
  )
}

const EXACT_REPORT_KEYS = [
  "cutoverChainProof",
  "generatedAt",
  "issues",
  "market",
  "ready",
  "readinessMode",
  "roBrandScope",
  "roCatalogPublication",
  "roCategoryScope",
  "roCompletenessProof",
  "roProductScope",
  "roVariantScope",
  "scope",
  "scopePlanProof",
  "sharedInventoryBaseline",
  "skBaseline",
  "skPublication",
  "summary",
] as const

export type RoCatalogReadinessArtifact = Readonly<{
  cutoverChainProof: Readonly<Record<string, unknown>>
  generatedAt: string
  issues: readonly unknown[]
  market: "ro"
  ready: boolean
  readinessMode: "demo" | "production"
  roBrandScope: Readonly<Record<string, unknown>>
  roCatalogPublication: Readonly<Record<string, unknown>>
  roCategoryScope: Readonly<Record<string, unknown>>
  roCompletenessProof: Readonly<{
    algorithm: "sha256-canonical-json-v1"
    dataHash: string
    demoOmissionLedgerHash: string | null
    locale: "ro-RO"
    provenance: "fresh-medusa-database-read" | "in-memory-audit-input"
    schemaVersion: 1
  }>
  roProductScope: Readonly<Record<string, unknown>>
  roVariantScope: Readonly<{
    dataHash: string
    sellable: number
    unavailable: number
  }>
  scope: "ro-published-products-and-catalog-assignments"
  scopePlanProof: Readonly<Record<string, unknown>>
  sharedInventoryBaseline: Readonly<Record<string, unknown>>
  skBaseline: Readonly<Record<string, unknown>>
  skPublication: Readonly<Record<string, unknown>>
  summary: Readonly<{
    errors: number
    warnings: number
  }> &
    Readonly<Record<string, unknown>>
}>

export type RoCatalogScopePlanArtifact = Readonly<{
  brandExcludedIds: readonly string[]
  brandIds: readonly string[]
  categoryExcludedIds: readonly string[]
  categoryPublishedIds: readonly string[]
  collectionIds: readonly string[]
  productExcludedIds: readonly string[]
  productPublishedIds: readonly string[]
}>

export type RoVariantAvailabilityExpectation = Readonly<{
  keyKind: "ean" | "sku"
  keyValue: string
  productId: string
  roAvailability: "sellable" | "unavailable"
  ronAmount: number | null
}>

export const hashRoVariantAvailabilityExpectations = (
  expectations: readonly RoVariantAvailabilityExpectation[]
) => {
  const sorted = [...expectations].sort((left, right) =>
    stableJson(left).localeCompare(stableJson(right))
  )
  return createHash("sha256").update(stableJson(sorted)).digest("hex")
}

export type RoDemoContentOmissionArtifact = Readonly<{
  omittedFields: readonly (typeof DEMO_OMITTED_FIELDS)[number][]
  productContentId: string
  productId: string
  roDescriptionSha256: string
  sourceContentSha256: string
  sourceUrl: string
}>

export type RoDemoContentOmissionLedgerArtifact = Readonly<{
  entries: readonly RoDemoContentOmissionArtifact[]
  mode: "official-ro-description-only"
  schemaVersion: 1
}>

type RoReceiptArtifactRef = Readonly<{ path: string; sha256: string }>

export type RoTwoPhaseProvenanceReceipt = Readonly<{
  artifacts: Readonly<{
    staticTaxonomyConvergence: RoReceiptArtifactRef
  }>
  catalog: Readonly<{
    bundle: RoReceiptArtifactRef
    importPlan: RoReceiptArtifactRef &
      Readonly<{ planHash: string; scopeSha256: string }>
    manifest: RoReceiptArtifactRef
    omissionLedger: RoReceiptArtifactRef
  }>
  commerce: Readonly<{
    applyReceipt: RoReceiptArtifactRef
    manifest: RoReceiptArtifactRef
    plan: RoReceiptArtifactRef
    priceAuthoritySha256: string
    restoreArtifact: RoReceiptArtifactRef
    skBaselineSha256: string
  }>
  kind: "herbatika-ro-demo-cutover-receipt"
  locale: "ro-RO"
  market: "ro"
  operations: Readonly<{
    maintenance: RoReceiptArtifactRef
    meilisearchConvergence: RoReceiptArtifactRef
    urlRegistryConvergence: RoReceiptArtifactRef
  }>
  postCommerce: Readonly<{
    commerceApplyReceiptSha256: string
    commerceManifestSha256: string
    commercePlanFileSha256: string
    commercePlanHash: string
    commerceRestoreArtifactSha256: string
    envelope: RoReceiptArtifactRef
    observedCommerceSnapshotSha256: string
    payloadSha256: string
    postCommerceSharedInventoryFingerprintCount: number
    postCommerceSharedInventoryFingerprintSha256: string
    postCommerceSkBaselineCount: number
    postCommerceSkBaselineErrors: number
    postCommerceSkBaselineSha256: string
    preCommerceSharedInventoryFingerprintCount: number
    preCommerceSharedInventoryFingerprintSha256: string
    preCommerceSkBaselineArtifactSha256: string
    preCommerceSkBaselineCount: number
    preCommerceSkBaselineErrors: number
    preCommerceSkBaselineSha256: string
    priceAuthoritySha256: string
    rawLiveInventorySha256: string
    sourceInventoryEnvelopeSha256: string
  }>
  preCommerce: Readonly<{
    inventoryEnvelope: RoReceiptArtifactRef
    priceAuthority: RoReceiptArtifactRef
    rawLiveInventory: RoReceiptArtifactRef
  }>
  releaseIdentity: Readonly<{
    backendBuildHash: string
    backendDeploymentId: string
    backendReleaseSha: string
    backendSlot: "blue" | "green"
    databaseFingerprint: string
    databaseInstanceFingerprint: string
    environmentId: string
    locale: "ro-RO"
    marketCode: "ro"
    roOrigin: "https://test-engine-herbatika-ro-zane.web-revolution.cz"
    salesChannelId: string
    skOrigin: "https://test-engine-herbatika-zane.web-revolution.cz"
    storefrontBuildHash: string
    storefrontDeploymentId: string
    storefrontReleaseSha: string
    storefrontSlot: "blue" | "green"
  }>
  releaseId: string
  schemaVersion: 1
}>

const SCOPE_KEYS = [
  "brandExcludedIds",
  "brandIds",
  "categoryExcludedIds",
  "categoryPublishedIds",
  "collectionIds",
  "productExcludedIds",
  "productPublishedIds",
] as const

export const hashRoCatalogScopePlan = (scope: RoCatalogScopePlanArtifact) =>
  createHash("sha256").update(stableJson(scope)).digest("hex")

export const hashRoCatalogImportPlanValue = (plan: unknown) =>
  createHash("sha256").update(stableJson(plan)).digest("hex")

const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value) ?? "null"
}

export const hashRoTwoPhaseProvenanceReceipt = (
  receipt: RoTwoPhaseProvenanceReceipt
) =>
  createHash("sha256")
    .update(`${stableJson(receipt)}\n`)
    .digest("hex")

const parseArtifactRef = (
  value: unknown,
  expectedPath: string,
  path: string
): RoReceiptArtifactRef => {
  if (
    !isRecord(value) ||
    JSON.stringify(Object.keys(value).sort()) !==
      JSON.stringify(["path", "sha256"])
  ) {
    throw new Error(`${path} has invalid keys`)
  }
  if (
    value.path !== expectedPath ||
    typeof value.sha256 !== "string" ||
    !SHA256.test(value.sha256)
  ) {
    throw new Error(`${path} is invalid`)
  }
  return { path: value.path, sha256: value.sha256 }
}

export const parseRoTwoPhaseProvenanceReceipt = (
  value: unknown,
  expectedReceiptSha256?: string
) => {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    value.kind !== "herbatika-ro-demo-cutover-receipt" ||
    value.market !== "ro" ||
    value.locale !== "ro-RO" ||
    JSON.stringify(Object.keys(value).sort()) !==
      JSON.stringify(
        [
          "artifacts",
          "catalog",
          "commerce",
          "kind",
          "locale",
          "market",
          "operations",
          "postCommerce",
          "preCommerce",
          "releaseIdentity",
          "releaseId",
          "schemaVersion",
        ].sort()
      )
  ) {
    throw new Error("Two-phase provenance receipt header is invalid")
  }
  if (
    !isRecord(value.artifacts) ||
    JSON.stringify(Object.keys(value.artifacts).sort()) !==
      JSON.stringify(["staticTaxonomyConvergence"]) ||
    !isRecord(value.preCommerce) ||
    JSON.stringify(Object.keys(value.preCommerce).sort()) !==
      JSON.stringify([
        "inventoryEnvelope",
        "priceAuthority",
        "rawLiveInventory",
      ]) ||
    !isRecord(value.commerce) ||
    JSON.stringify(Object.keys(value.commerce).sort()) !==
      JSON.stringify([
        "applyReceipt",
        "manifest",
        "plan",
        "priceAuthoritySha256",
        "restoreArtifact",
        "skBaselineSha256",
      ]) ||
    !isRecord(value.postCommerce) ||
    !isRecord(value.catalog) ||
    !isRecord(value.operations) ||
    !isRecord(value.releaseIdentity)
  ) {
    throw new Error("Two-phase provenance receipt sections are invalid")
  }
  if (
    typeof value.releaseId !== "string" ||
    !value.releaseId.startsWith("ro-demo-") ||
    !SAFE_ID.test(value.releaseId)
  ) {
    throw new Error("receipt.releaseId is invalid")
  }
  const artifacts = {
    staticTaxonomyConvergence: parseArtifactRef(
      value.artifacts.staticTaxonomyConvergence,
      "urlr/static-taxonomy-convergence.json",
      "receipt.artifacts.staticTaxonomyConvergence"
    ),
  }
  const preCommerce = {
    inventoryEnvelope: parseArtifactRef(
      value.preCommerce.inventoryEnvelope,
      "precommerce/inventory-envelope.json",
      "receipt.preCommerce.inventoryEnvelope"
    ),
    priceAuthority: parseArtifactRef(
      value.preCommerce.priceAuthority,
      "precommerce/price-authority.json",
      "receipt.preCommerce.priceAuthority"
    ),
    rawLiveInventory: parseArtifactRef(
      value.preCommerce.rawLiveInventory,
      "precommerce/raw-live-inventory.json",
      "receipt.preCommerce.rawLiveInventory"
    ),
  }
  if (
    typeof value.commerce.priceAuthoritySha256 !== "string" ||
    !SHA256.test(value.commerce.priceAuthoritySha256) ||
    typeof value.commerce.skBaselineSha256 !== "string" ||
    !SHA256.test(value.commerce.skBaselineSha256)
  ) {
    throw new Error("receipt.commerce hashes are invalid")
  }
  const commerce = {
    applyReceipt: parseArtifactRef(
      value.commerce.applyReceipt,
      "commerce/apply-receipt.json",
      "receipt.commerce.applyReceipt"
    ),
    manifest: parseArtifactRef(
      value.commerce.manifest,
      "commerce/manifest.json",
      "receipt.commerce.manifest"
    ),
    plan: parseArtifactRef(
      value.commerce.plan,
      "commerce/plan.json",
      "receipt.commerce.plan"
    ),
    priceAuthoritySha256: value.commerce.priceAuthoritySha256,
    restoreArtifact: parseArtifactRef(
      value.commerce.restoreArtifact,
      "commerce/restore-artifact.json",
      "receipt.commerce.restoreArtifact"
    ),
    skBaselineSha256: value.commerce.skBaselineSha256,
  }
  const rawPostCommerce = value.postCommerce
  const postHashKeys = [
    "commerceApplyReceiptSha256",
    "commerceManifestSha256",
    "commercePlanFileSha256",
    "commercePlanHash",
    "commerceRestoreArtifactSha256",
    "observedCommerceSnapshotSha256",
    "payloadSha256",
    "postCommerceSharedInventoryFingerprintSha256",
    "postCommerceSkBaselineSha256",
    "preCommerceSharedInventoryFingerprintSha256",
    "preCommerceSkBaselineArtifactSha256",
    "preCommerceSkBaselineSha256",
    "priceAuthoritySha256",
    "rawLiveInventorySha256",
    "sourceInventoryEnvelopeSha256",
  ] as const
  const postCountKeys = [
    "postCommerceSharedInventoryFingerprintCount",
    "postCommerceSkBaselineCount",
    "postCommerceSkBaselineErrors",
    "preCommerceSharedInventoryFingerprintCount",
    "preCommerceSkBaselineCount",
    "preCommerceSkBaselineErrors",
  ] as const
  if (
    JSON.stringify(Object.keys(rawPostCommerce).sort()) !==
      JSON.stringify([...postHashKeys, ...postCountKeys, "envelope"].sort()) ||
    !postHashKeys.every(
      (key) =>
        typeof rawPostCommerce[key] === "string" &&
        SHA256.test(rawPostCommerce[key] as string)
    ) ||
    !postCountKeys.every(
      (key) =>
        Number.isSafeInteger(rawPostCommerce[key]) &&
        (rawPostCommerce[key] as number) >= 0
    )
  ) {
    throw new Error("receipt.postCommerce is invalid")
  }
  const envelope = parseArtifactRef(
    rawPostCommerce.envelope,
    "postcommerce/envelope.json",
    "receipt.postCommerce.envelope"
  )
  const postCommerce: RoTwoPhaseProvenanceReceipt["postCommerce"] = {
    commerceApplyReceiptSha256:
      rawPostCommerce.commerceApplyReceiptSha256 as string,
    commerceManifestSha256: rawPostCommerce.commerceManifestSha256 as string,
    commercePlanFileSha256: rawPostCommerce.commercePlanFileSha256 as string,
    commercePlanHash: rawPostCommerce.commercePlanHash as string,
    commerceRestoreArtifactSha256:
      rawPostCommerce.commerceRestoreArtifactSha256 as string,
    envelope,
    observedCommerceSnapshotSha256:
      rawPostCommerce.observedCommerceSnapshotSha256 as string,
    payloadSha256: rawPostCommerce.payloadSha256 as string,
    postCommerceSharedInventoryFingerprintCount:
      rawPostCommerce.postCommerceSharedInventoryFingerprintCount as number,
    postCommerceSharedInventoryFingerprintSha256:
      rawPostCommerce.postCommerceSharedInventoryFingerprintSha256 as string,
    postCommerceSkBaselineCount:
      rawPostCommerce.postCommerceSkBaselineCount as number,
    postCommerceSkBaselineErrors:
      rawPostCommerce.postCommerceSkBaselineErrors as number,
    postCommerceSkBaselineSha256:
      rawPostCommerce.postCommerceSkBaselineSha256 as string,
    preCommerceSharedInventoryFingerprintCount:
      rawPostCommerce.preCommerceSharedInventoryFingerprintCount as number,
    preCommerceSharedInventoryFingerprintSha256:
      rawPostCommerce.preCommerceSharedInventoryFingerprintSha256 as string,
    preCommerceSkBaselineArtifactSha256:
      rawPostCommerce.preCommerceSkBaselineArtifactSha256 as string,
    preCommerceSkBaselineCount:
      rawPostCommerce.preCommerceSkBaselineCount as number,
    preCommerceSkBaselineErrors:
      rawPostCommerce.preCommerceSkBaselineErrors as number,
    preCommerceSkBaselineSha256:
      rawPostCommerce.preCommerceSkBaselineSha256 as string,
    priceAuthoritySha256: rawPostCommerce.priceAuthoritySha256 as string,
    rawLiveInventorySha256: rawPostCommerce.rawLiveInventorySha256 as string,
    sourceInventoryEnvelopeSha256:
      rawPostCommerce.sourceInventoryEnvelopeSha256 as string,
  }
  const catalogKeys = ["bundle", "importPlan", "manifest", "omissionLedger"]
  if (
    JSON.stringify(Object.keys(value.catalog).sort()) !==
    JSON.stringify(catalogKeys)
  ) {
    throw new Error("receipt.catalog has invalid keys")
  }
  const importPlanValue = value.catalog.importPlan
  if (
    !isRecord(importPlanValue) ||
    JSON.stringify(Object.keys(importPlanValue).sort()) !==
      JSON.stringify(["path", "planHash", "scopeSha256", "sha256"]) ||
    importPlanValue.path !== "catalog/import-plan.json" ||
    typeof importPlanValue.sha256 !== "string" ||
    !SHA256.test(importPlanValue.sha256) ||
    typeof importPlanValue.planHash !== "string" ||
    !SHA256.test(importPlanValue.planHash) ||
    typeof importPlanValue.scopeSha256 !== "string" ||
    !SHA256.test(importPlanValue.scopeSha256)
  ) {
    throw new Error("receipt.catalog.importPlan is invalid")
  }
  const catalog = {
    bundle: parseArtifactRef(
      value.catalog.bundle,
      "catalog/bundle.json",
      "receipt.catalog.bundle"
    ),
    importPlan: {
      path: importPlanValue.path,
      planHash: importPlanValue.planHash,
      scopeSha256: importPlanValue.scopeSha256,
      sha256: importPlanValue.sha256,
    },
    manifest: parseArtifactRef(
      value.catalog.manifest,
      "catalog/manifest.json",
      "receipt.catalog.manifest"
    ),
    omissionLedger: parseArtifactRef(
      value.catalog.omissionLedger,
      "catalog/omission-ledger.json",
      "receipt.catalog.omissionLedger"
    ),
  }
  const operationKeys = [
    "maintenance",
    "meilisearchConvergence",
    "urlRegistryConvergence",
  ]
  if (
    JSON.stringify(Object.keys(value.operations).sort()) !==
    JSON.stringify(operationKeys)
  ) {
    throw new Error("receipt.operations has invalid keys")
  }
  const operations = {
    maintenance: parseArtifactRef(
      value.operations.maintenance,
      "operations/maintenance-proof.json",
      "receipt.operations.maintenance"
    ),
    meilisearchConvergence: parseArtifactRef(
      value.operations.meilisearchConvergence,
      "operations/meili-convergence.json",
      "receipt.operations.meilisearchConvergence"
    ),
    urlRegistryConvergence: parseArtifactRef(
      value.operations.urlRegistryConvergence,
      "operations/urlr-convergence.json",
      "receipt.operations.urlRegistryConvergence"
    ),
  }
  const releaseKeys = [
    "backendBuildHash",
    "backendDeploymentId",
    "backendReleaseSha",
    "backendSlot",
    "databaseFingerprint",
    "databaseInstanceFingerprint",
    "environmentId",
    "locale",
    "marketCode",
    "roOrigin",
    "salesChannelId",
    "skOrigin",
    "storefrontBuildHash",
    "storefrontDeploymentId",
    "storefrontReleaseSha",
    "storefrontSlot",
  ]
  if (
    JSON.stringify(Object.keys(value.releaseIdentity).sort()) !==
      JSON.stringify(releaseKeys) ||
    !SAFE_ID.test(String(value.releaseIdentity.environmentId)) ||
    typeof value.releaseIdentity.databaseFingerprint !== "string" ||
    !SHA256.test(value.releaseIdentity.databaseFingerprint) ||
    typeof value.releaseIdentity.databaseInstanceFingerprint !== "string" ||
    !SHA256.test(value.releaseIdentity.databaseInstanceFingerprint) ||
    value.releaseIdentity.marketCode !== "ro" ||
    value.releaseIdentity.locale !== "ro-RO" ||
    !SAFE_ID.test(String(value.releaseIdentity.salesChannelId)) ||
    typeof value.releaseIdentity.backendReleaseSha !== "string" ||
    !RELEASE_SHA.test(value.releaseIdentity.backendReleaseSha) ||
    !SAFE_ID.test(String(value.releaseIdentity.backendDeploymentId)) ||
    !SAFE_ID.test(String(value.releaseIdentity.backendBuildHash)) ||
    (value.releaseIdentity.backendSlot !== "blue" &&
      value.releaseIdentity.backendSlot !== "green") ||
    typeof value.releaseIdentity.storefrontReleaseSha !== "string" ||
    !RELEASE_SHA.test(value.releaseIdentity.storefrontReleaseSha) ||
    !SAFE_ID.test(String(value.releaseIdentity.storefrontDeploymentId)) ||
    !SAFE_ID.test(String(value.releaseIdentity.storefrontBuildHash)) ||
    (value.releaseIdentity.storefrontSlot !== "blue" &&
      value.releaseIdentity.storefrontSlot !== "green") ||
    value.releaseIdentity.roOrigin !==
      "https://test-engine-herbatika-ro-zane.web-revolution.cz" ||
    value.releaseIdentity.skOrigin !==
      "https://test-engine-herbatika-zane.web-revolution.cz"
  ) {
    throw new Error("receipt.releaseIdentity is invalid")
  }
  const releaseIdentity =
    value.releaseIdentity as RoTwoPhaseProvenanceReceipt["releaseIdentity"]
  if (
    preCommerce.priceAuthority.sha256 !== commerce.priceAuthoritySha256 ||
    commerce.priceAuthoritySha256 !== postCommerce.priceAuthoritySha256 ||
    preCommerce.inventoryEnvelope.sha256 !==
      postCommerce.sourceInventoryEnvelopeSha256 ||
    preCommerce.rawLiveInventory.sha256 !==
      postCommerce.rawLiveInventorySha256 ||
    commerce.plan.sha256 !== postCommerce.commercePlanFileSha256 ||
    commerce.manifest.sha256 !== postCommerce.commerceManifestSha256 ||
    commerce.applyReceipt.sha256 !== postCommerce.commerceApplyReceiptSha256 ||
    commerce.restoreArtifact.sha256 !==
      postCommerce.commerceRestoreArtifactSha256 ||
    commerce.skBaselineSha256 !== postCommerce.preCommerceSkBaselineSha256 ||
    postCommerce.preCommerceSkBaselineErrors !== 0 ||
    postCommerce.postCommerceSkBaselineErrors !== 0 ||
    postCommerce.preCommerceSkBaselineCount !==
      postCommerce.postCommerceSkBaselineCount ||
    postCommerce.preCommerceSkBaselineSha256 !==
      postCommerce.postCommerceSkBaselineSha256 ||
    postCommerce.preCommerceSharedInventoryFingerprintCount !==
      postCommerce.postCommerceSharedInventoryFingerprintCount ||
    postCommerce.preCommerceSharedInventoryFingerprintSha256 !==
      postCommerce.postCommerceSharedInventoryFingerprintSha256
  ) {
    throw new Error("Two-phase provenance receipt chain is broken")
  }
  const receipt: RoTwoPhaseProvenanceReceipt = {
    artifacts,
    catalog,
    commerce,
    kind: "herbatika-ro-demo-cutover-receipt",
    locale: "ro-RO",
    market: "ro",
    operations,
    postCommerce: { ...postCommerce, envelope },
    preCommerce,
    releaseIdentity,
    releaseId: value.releaseId,
    schemaVersion: 1,
  }
  const receiptSha256 = hashRoTwoPhaseProvenanceReceipt(receipt)
  if (
    expectedReceiptSha256 &&
    (!SHA256.test(expectedReceiptSha256) ||
      receiptSha256 !== expectedReceiptSha256)
  ) {
    throw new Error("Two-phase provenance receipt SHA-256 mismatch")
  }
  return { receipt, receiptSha256 }
}

export const hashRoDemoContentOmissionLedger = (
  ledger: RoDemoContentOmissionLedgerArtifact
) => createHash("sha256").update(stableJson(ledger)).digest("hex")

export const parseRoDemoContentOmissionLedgerArtifact = (value: unknown) => {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    value.mode !== "official-ro-description-only" ||
    !Array.isArray(value.entries)
  ) {
    throw new Error("Demo omission ledger header is invalid")
  }
  if (
    JSON.stringify(Object.keys(value).sort()) !==
    JSON.stringify(["entries", "mode", "schemaVersion"])
  ) {
    throw new Error("Demo omission ledger has invalid keys")
  }
  const entries = value.entries.map((candidate, index) => {
    if (!isRecord(candidate)) {
      throw new Error(`ledger.entries[${index}] must be an object`)
    }
    if (
      JSON.stringify(Object.keys(candidate).sort()) !==
      JSON.stringify(
        [
          "omittedFields",
          "productContentId",
          "productId",
          "roDescriptionSha256",
          "sourceContentSha256",
          "sourceUrl",
        ].sort()
      )
    ) {
      throw new Error(`ledger.entries[${index}] has invalid keys`)
    }
    const omittedFields = candidate.omittedFields
    let sourceUrl: URL
    try {
      sourceUrl = new URL(String(candidate.sourceUrl))
    } catch {
      throw new Error(`ledger.entries[${index}] provenance is invalid`)
    }
    if (
      typeof candidate.productId !== "string" ||
      candidate.productId.trim().length === 0 ||
      typeof candidate.productContentId !== "string" ||
      candidate.productContentId.trim().length === 0 ||
      typeof candidate.roDescriptionSha256 !== "string" ||
      !SHA256.test(candidate.roDescriptionSha256) ||
      typeof candidate.sourceContentSha256 !== "string" ||
      !SHA256.test(candidate.sourceContentSha256) ||
      sourceUrl.protocol !== "https:" ||
      Boolean(sourceUrl.username || sourceUrl.password) ||
      !(
        sourceUrl.hostname === "herbatica.ro" ||
        sourceUrl.hostname.endsWith(".herbatica.ro")
      ) ||
      !Array.isArray(omittedFields) ||
      omittedFields.length !== DEMO_OMITTED_FIELDS.length ||
      !DEMO_OMITTED_FIELDS.every((field) => omittedFields.includes(field))
    ) {
      throw new Error(`ledger.entries[${index}] provenance is invalid`)
    }
    return {
      omittedFields: [...DEMO_OMITTED_FIELDS],
      productContentId: candidate.productContentId,
      productId: candidate.productId,
      roDescriptionSha256: candidate.roDescriptionSha256,
      sourceContentSha256: candidate.sourceContentSha256,
      sourceUrl: candidate.sourceUrl as string,
    }
  })
  entries.sort((left, right) =>
    stableJson(left).localeCompare(stableJson(right))
  )
  if (
    new Set(entries.map(({ productId }) => productId)).size !==
      entries.length ||
    new Set(entries.map(({ productContentId }) => productContentId)).size !==
      entries.length
  ) {
    throw new Error("Demo omission ledger contains duplicate identities")
  }
  return {
    entries,
    mode: "official-ro-description-only",
    schemaVersion: 1,
  } satisfies RoDemoContentOmissionLedgerArtifact
}

export const parseRoCatalogScopePlanArtifact = (value: unknown) => {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    typeof value.planHash !== "string" ||
    !SHA256.test(value.planHash) ||
    !isRecord(value.plan)
  ) {
    throw new Error("Expected nested importer plan artifact")
  }
  if (
    JSON.stringify(Object.keys(value).sort()) !==
    JSON.stringify(["plan", "planHash", "schemaVersion"])
  ) {
    throw new Error("Importer plan artifact has invalid keys")
  }
  const plan = value.plan
  if (!isRecord(plan.scope) || typeof plan.scopeSha256 !== "string") {
    throw new Error("Importer plan artifact has no nested scope proof")
  }
  const recomputedPlanHash = hashRoCatalogImportPlanValue(plan)
  if (value.planHash !== recomputedPlanHash) {
    throw new Error("Importer planHash does not match canonical plan")
  }
  if (!Array.isArray(plan.items)) {
    throw new Error("Importer plan items are missing")
  }
  const variantExpectations: RoVariantAvailabilityExpectation[] = []
  for (const [itemIndex, item] of plan.items.entries()) {
    if (
      !isRecord(item) ||
      typeof item.productId !== "string" ||
      !isRecord(item.entry) ||
      !Array.isArray(item.entry.variants)
    ) {
      throw new Error(`Importer plan item ${itemIndex} is invalid`)
    }
    for (const [variantIndex, variant] of item.entry.variants.entries()) {
      if (
        !(isRecord(variant) && isRecord(variant.key)) ||
        (variant.key.kind !== "ean" && variant.key.kind !== "sku") ||
        typeof variant.key.value !== "string" ||
        variant.key.value.length === 0 ||
        (variant.roAvailability !== "sellable" &&
          variant.roAvailability !== "unavailable")
      ) {
        throw new Error(
          `Importer plan item ${itemIndex} variant ${variantIndex} is invalid`
        )
      }
      const ronPrice = isRecord(variant.ronPrice) ? variant.ronPrice : null
      const ronAmount =
        typeof ronPrice?.amount === "number" &&
        Number.isSafeInteger(ronPrice.amount) &&
        ronPrice.amount >= 0
          ? ronPrice.amount
          : null
      if (
        (variant.roAvailability === "sellable" && ronAmount === null) ||
        (variant.roAvailability === "unavailable" &&
          variant.ronPrice !== undefined)
      ) {
        throw new Error(
          `Importer plan item ${itemIndex} variant ${variantIndex} price authority is invalid`
        )
      }
      variantExpectations.push({
        keyKind: variant.key.kind,
        keyValue: variant.key.value,
        productId: item.productId,
        roAvailability: variant.roAvailability,
        ronAmount,
      })
    }
  }
  const identities = variantExpectations.map(
    (entry) => `${entry.productId}:${entry.keyKind}:${entry.keyValue}`
  )
  if (new Set(identities).size !== identities.length) {
    throw new Error("Importer plan contains duplicate variant expectations")
  }
  const rawScope = plan.scope
  if (
    JSON.stringify(Object.keys(rawScope).sort()) !==
    JSON.stringify([...SCOPE_KEYS].sort())
  ) {
    throw new Error("Importer plan scope has invalid keys")
  }
  const readIds = (key: (typeof SCOPE_KEYS)[number]) => {
    const ids = rawScope[key]
    if (
      !Array.isArray(ids) ||
      ids.some((id) => typeof id !== "string" || id.trim().length === 0) ||
      new Set(ids).size !== ids.length ||
      JSON.stringify(ids) !== JSON.stringify([...ids].sort())
    ) {
      throw new Error(`plan.scope.${key} must be unique sorted IDs`)
    }
    return ids as string[]
  }
  const scope: RoCatalogScopePlanArtifact = {
    brandExcludedIds: readIds("brandExcludedIds"),
    brandIds: readIds("brandIds"),
    categoryExcludedIds: readIds("categoryExcludedIds"),
    categoryPublishedIds: readIds("categoryPublishedIds"),
    collectionIds: readIds("collectionIds"),
    productExcludedIds: readIds("productExcludedIds"),
    productPublishedIds: readIds("productPublishedIds"),
  }
  const hash = hashRoCatalogScopePlan(scope)
  if (plan.scopeSha256 !== hash) {
    throw new Error("Importer plan scopeSha256 does not match plan.scope")
  }
  return {
    hash,
    planHash: recomputedPlanHash,
    scope,
    variantExpectations,
  }
}

/** Side-effect-free runtime boundary used by the deployment release gate. */
export const parseRoCatalogReadinessReportArtifact = (
  value: unknown
): RoCatalogReadinessArtifact => {
  if (!isRecord(value)) {
    throw new Error("RO readiness report must be an object")
  }
  const keys = Object.keys(value).sort()
  if (JSON.stringify(keys) !== JSON.stringify([...EXACT_REPORT_KEYS].sort())) {
    throw new Error("RO readiness report has invalid keys")
  }
  const proof = value.roCompletenessProof
  const scopeProof = value.scopePlanProof
  const cutoverProof = value.cutoverChainProof
  const sharedInventoryBaseline = value.sharedInventoryBaseline
  const skBaseline = value.skBaseline
  const skPublication = value.skPublication
  const summary = value.summary
  if (
    value.market !== "ro" ||
    (value.readinessMode !== "production" && value.readinessMode !== "demo") ||
    value.scope !== "ro-published-products-and-catalog-assignments" ||
    typeof value.ready !== "boolean" ||
    typeof value.generatedAt !== "string" ||
    !Number.isFinite(Date.parse(value.generatedAt)) ||
    !Array.isArray(value.issues) ||
    !isRecord(value.roCatalogPublication) ||
    !isRecord(cutoverProof) ||
    JSON.stringify(Object.keys(cutoverProof).sort()) !==
      JSON.stringify(
        [
          "catalogPlanHash",
          "commerceManifestSha256",
          "commercePlanSha256",
          "databaseInstanceFingerprint",
          "maintenanceProofSha256",
          "matched",
          "meilisearchConvergenceSha256",
          "postCommerceEnvelopeSha256",
          "receiptSha256",
          "releaseId",
          "schemaVersion",
          "scopeSha256",
          "staticTaxonomyConvergenceSha256",
          "urlRegistryConvergenceSha256",
        ].sort()
      ) ||
    cutoverProof.schemaVersion !== 1 ||
    cutoverProof.matched !== true ||
    typeof cutoverProof.releaseId !== "string" ||
    !cutoverProof.releaseId.startsWith("ro-demo-") ||
    ![
      "catalogPlanHash",
      "commerceManifestSha256",
      "commercePlanSha256",
      "databaseInstanceFingerprint",
      "maintenanceProofSha256",
      "meilisearchConvergenceSha256",
      "postCommerceEnvelopeSha256",
      "receiptSha256",
      "scopeSha256",
      "staticTaxonomyConvergenceSha256",
      "urlRegistryConvergenceSha256",
    ].every(
      (key) =>
        typeof cutoverProof[key] === "string" &&
        SHA256.test(cutoverProof[key] as string)
    ) ||
    !isRecord(value.roBrandScope) ||
    !isRecord(value.roCategoryScope) ||
    !isRecord(value.roProductScope) ||
    !isRecord(value.roVariantScope) ||
    JSON.stringify(Object.keys(value.roVariantScope).sort()) !==
      JSON.stringify(["dataHash", "sellable", "unavailable"]) ||
    typeof value.roVariantScope.dataHash !== "string" ||
    !SHA256.test(value.roVariantScope.dataHash) ||
    !Number.isSafeInteger(value.roVariantScope.sellable) ||
    !Number.isSafeInteger(value.roVariantScope.unavailable) ||
    (value.roVariantScope.sellable as number) < 0 ||
    (value.roVariantScope.unavailable as number) < 0 ||
    !isMatchedBaselineProof(skBaseline) ||
    (value.ready && !skBaseline.matched) ||
    !isRecord(skPublication) ||
    JSON.stringify(Object.keys(skPublication).sort()) !==
      JSON.stringify([
        "brands",
        "categories",
        "collections",
        "errors",
        "products",
      ]) ||
    !["brands", "categories", "collections", "errors", "products"].every(
      (key) =>
        Number.isSafeInteger(skPublication[key]) &&
        (skPublication[key] as number) >= 0
    ) ||
    (value.ready && skPublication.errors !== 0) ||
    !isMatchedBaselineProof(sharedInventoryBaseline) ||
    (value.ready && !sharedInventoryBaseline.matched) ||
    !isRecord(scopeProof) ||
    scopeProof.schemaVersion !== 1 ||
    typeof scopeProof.importPlanHash !== "string" ||
    !SHA256.test(scopeProof.importPlanHash) ||
    typeof scopeProof.expectedDataHash !== "string" ||
    !SHA256.test(scopeProof.expectedDataHash) ||
    typeof scopeProof.observedDataHash !== "string" ||
    !SHA256.test(scopeProof.observedDataHash) ||
    typeof scopeProof.matched !== "boolean" ||
    scopeProof.matched !==
      (scopeProof.expectedDataHash === scopeProof.observedDataHash) ||
    (value.ready && !scopeProof.matched) ||
    !isRecord(proof) ||
    proof.schemaVersion !== 1 ||
    proof.algorithm !== "sha256-canonical-json-v1" ||
    proof.locale !== "ro-RO" ||
    (proof.provenance !== "fresh-medusa-database-read" &&
      proof.provenance !== "in-memory-audit-input") ||
    typeof proof.dataHash !== "string" ||
    !SHA256.test(proof.dataHash) ||
    !(
      proof.demoOmissionLedgerHash === null ||
      (typeof proof.demoOmissionLedgerHash === "string" &&
        SHA256.test(proof.demoOmissionLedgerHash))
    ) ||
    !isRecord(summary) ||
    !Number.isSafeInteger(summary.errors) ||
    !Number.isSafeInteger(summary.warnings) ||
    value.ready !== (summary.errors === 0) ||
    value.issues.length !== Number(summary.errors) + Number(summary.warnings)
  ) {
    throw new Error("RO readiness report contract is invalid")
  }
  if (
    cutoverProof.catalogPlanHash !== scopeProof.importPlanHash ||
    cutoverProof.scopeSha256 !== scopeProof.expectedDataHash
  ) {
    throw new Error("RO readiness cutover and importer plan proofs diverge")
  }
  if (
    (value.readinessMode === "production" &&
      proof.demoOmissionLedgerHash !== null) ||
    (value.readinessMode === "demo" &&
      (typeof proof.demoOmissionLedgerHash !== "string" ||
        !SHA256.test(proof.demoOmissionLedgerHash)))
  ) {
    throw new Error("RO readiness report demo proof is invalid")
  }
  return value as RoCatalogReadinessArtifact
}

import { createHash } from "node:crypto"
