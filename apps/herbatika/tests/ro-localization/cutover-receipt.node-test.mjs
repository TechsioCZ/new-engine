import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { appendFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterEach, test } from "node:test"
import {
  hashRoCatalogImportPlanValue,
  hashRoCatalogScopePlan,
} from "../../../medusa-be/src/scripts/ro-catalog-readiness-contract.ts"
import { serializeRoDemoArtifact } from "../../../medusa-be/src/scripts/ro-demo-commerce/artifacts.ts"
import {
  postCommerceSha256,
  stablePostCommerceJson,
} from "../../../medusa-be/src/scripts/ro-demo-localization/postcommerce-envelope-contract.mjs"
import {
  canonicalCutoverReceipt,
  canonicalCutoverValue,
  verifyCutoverReceiptArtifacts,
} from "./cutover-receipt.mjs"

const hashBytes = (value) => createHash("sha256").update(value).digest("hex")
const hashLabel = (value) => hashBytes(`fixture:${value}`)
const canonicalBytes = (value) => `${canonicalCutoverValue(value)}\n`
const RAW_TAMPER_PATTERN = /rawLiveInventory file SHA-256 mismatch/
const ENVELOPE_MISMATCH_PATTERN =
  /post-commerce envelope does not match receipt/
const STALE_ENVELOPE_PATTERN = /capture is stale or from the future/
const SK_MUTATION_PATTERN =
  /Two-phase provenance receipt chain is broken|SK commerce baseline changed/
const INVENTORY_MUTATION_PATTERN =
  /Two-phase provenance receipt chain is broken|shared inventory changed/
const RELEASE_MISMATCH_PATTERN =
  /maintenance proof does not preserve RO restriction/
const SCOPE_MISMATCH_PATTERN =
  /URLR outbox and route projection are not converged/
const STATIC_TAXONOMY_APPROVAL_HASH =
  "sha256:a532ad08f718b0a8ff5d58026144a24314dd53f1c7bb38a0840efb5fe59aae39"
const STATIC_TAXONOMY_PLAN_HASH =
  "sha256:0f7c1615586b9f1397290b87d2210dd47143d0dd17fcb53b0832e699221f6896"
const evidenceDirectories = new Set()

afterEach(async () => {
  await Promise.all(
    [...evidenceDirectories].map((directoryPath) =>
      rm(directoryPath, { force: true, recursive: true })
    )
  )
  evidenceDirectories.clear()
})

const stableDemoValue = (value) => {
  if (Array.isArray(value)) {
    return value
      .map(stableDemoValue)
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right), "en")
      )
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right, "en"))
        .map(([key, child]) => [key, stableDemoValue(child)])
    )
  }
  return value
}

const stableDemoHash = (value) =>
  hashBytes(JSON.stringify(stableDemoValue(value)))

const iso = (now, offsetMinutes) =>
  new Date(now.getTime() + offsetMinutes * 60_000).toISOString()

const buildEvidence = async (options = {}) => {
  const directoryPath = await mkdtemp(join(tmpdir(), "ro-cutover-receipt-"))
  evidenceDirectories.add(directoryPath)

  const writeArtifact = async (path, bytes, fileOptions) => {
    const target = join(directoryPath, path)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, bytes, fileOptions)
    return { path, sha256: hashBytes(bytes) }
  }
  const writeCanonical = (path, value) =>
    writeArtifact(path, canonicalBytes(value))

  const now = new Date()
  const releaseId = "ro-demo-release-gate-fixture"
  const releaseIdentity = {
    backendBuildHash: "backend-build-blue-20260820",
    backendDeploymentId: "backend-deployment-42",
    backendReleaseSha: "a".repeat(40),
    backendSlot: "blue",
    databaseFingerprint: hashLabel("database"),
    environmentId: "zane-production",
    locale: "ro-RO",
    marketCode: "ro",
    roOrigin: "https://test-engine-herbatika-ro-zane.web-revolution.cz",
    salesChannelId: "sc_ro",
    skOrigin: "https://test-engine-herbatika-zane.web-revolution.cz",
    storefrontBuildHash: "storefront-build-blue-20260820",
    storefrontDeploymentId: "storefront-deployment-84",
    storefrontReleaseSha: "b".repeat(40),
    storefrontSlot: "blue",
  }
  const deploymentIdentity = {
    backendBuildHash: releaseIdentity.backendBuildHash,
    backendDeploymentId: releaseIdentity.backendDeploymentId,
    backendReleaseSha: releaseIdentity.backendReleaseSha,
    backendSlot: releaseIdentity.backendSlot,
    databaseFingerprint: releaseIdentity.databaseFingerprint,
    environmentId: releaseIdentity.environmentId,
  }

  const inventoryEnvelope = await writeCanonical(
    "precommerce/inventory-envelope.json",
    { fixture: "inventory-envelope", schemaVersion: 1 }
  )
  const rawLiveInventory = await writeCanonical(
    "precommerce/raw-live-inventory.json",
    { fixture: "raw-live-inventory", schemaVersion: 1 }
  )
  const priceAuthority = await writeCanonical(
    "precommerce/price-authority.json",
    { fixture: "price-authority", schemaVersion: 1 }
  )

  const commercePlanHash = hashLabel("commerce-plan-semantic")
  const commercePlan = await writeCanonical("commerce/plan.json", {
    fixture: "commerce-plan",
    planHash: commercePlanHash,
    schemaVersion: 1,
  })
  const restoreValue = {
    demo: true,
    deploymentIdentity,
    kind: "ro-demo-commerce-restore",
    market: "ro",
    planHash: commercePlanHash,
    priceAuthorityKind: "ro-demo-precommerce-price-authority",
    priceAuthoritySha256: priceAuthority.sha256,
    schemaVersion: 1,
    snapshot: {},
  }
  const restoreArtifact = await writeArtifact(
    "commerce/restore-artifact.json",
    serializeRoDemoArtifact(restoreValue),
    { mode: 0o600 }
  )
  const skBaselineSha256 = hashLabel("sk-commerce-baseline")
  const postState = {
    paymentProviderIds: ["pp_system_default"],
    regionId: "reg_ro",
    salesChannelId: releaseIdentity.salesChannelId,
    serviceZoneId: "serzo_ro",
    shippingOptions: [
      { code: "ro-demo-cargus", id: "so_cargus" },
      { code: "ro-demo-packeta-address", id: "so_packeta_address" },
      { code: "ro-demo-packeta-pickup", id: "so_packeta_pickup" },
    ],
    taxRateIds: ["txr_ro"],
    taxRegionIds: ["txreg_ro"],
    variantPrices: [
      { amount: 1290, productId: "prod_1", variantId: "variant_1" },
    ],
  }
  const applyValue = {
    demo: true,
    deploymentIdentity,
    kind: "ro-demo-commerce-apply-receipt",
    market: "ro",
    planHash: commercePlanHash,
    postState,
    postStateSha256: hashBytes(serializeRoDemoArtifact(postState)),
    priceAuthorityKind: "ro-demo-precommerce-price-authority",
    priceAuthoritySha256: priceAuthority.sha256,
    restoreArtifactSha256:
      options.applyRestoreArtifactSha256 ?? restoreArtifact.sha256,
    schemaVersion: 1,
    skBaselineHashAfter: skBaselineSha256,
    skBaselineHashBefore: skBaselineSha256,
  }
  const applyReceipt = await writeArtifact(
    "commerce/apply-receipt.json",
    serializeRoDemoArtifact(applyValue),
    { mode: 0o600 }
  )

  const environment = {
    backendBuildHash: releaseIdentity.backendBuildHash,
    backendDeploymentId: releaseIdentity.backendDeploymentId,
    backendReleaseSha: releaseIdentity.backendReleaseSha,
    backendSlot: releaseIdentity.backendSlot,
    databaseFingerprint: releaseIdentity.databaseFingerprint,
    environmentId: releaseIdentity.environmentId,
    locale: "ro-RO",
    marketCode: "ro",
    salesChannelId: releaseIdentity.salesChannelId,
    ...options.environment,
  }
  const skBefore = { count: 31, errors: [], sha256: skBaselineSha256 }
  const skAfter = { ...skBefore, ...options.postSkBaseline }
  const inventoryBefore = {
    count: 2151,
    sha256: hashLabel("shared-inventory"),
  }
  const inventoryAfter = {
    ...inventoryBefore,
    ...options.postInventoryFingerprint,
  }
  const payload = { catalogProducts: 2151, commerceReady: true }
  const envelopeValue = {
    capturedAt: options.capturedAt ?? iso(now, -0.5),
    commerceApplyReceiptSha256: applyReceipt.sha256,
    commercePlanFileSha256: commercePlan.sha256,
    commercePlanHash,
    commerceRestoreArtifactSha256: restoreArtifact.sha256,
    environment,
    kind: "ro-demo-post-commerce-envelope",
    observedCommerceSnapshotSha256: hashLabel("observed-commerce-snapshot"),
    payload,
    payloadSha256: postCommerceSha256(stablePostCommerceJson(payload)),
    postCommerceSharedInventoryFingerprint: inventoryAfter,
    postCommerceSkBaseline: skAfter,
    preCommerceSharedInventoryFingerprint: inventoryBefore,
    preCommerceSkBaseline: skBefore,
    priceAuthoritySha256: priceAuthority.sha256,
    rawLiveInventorySha256: rawLiveInventory.sha256,
    schemaVersion: 1,
    sourceInventoryEnvelopeSha256: inventoryEnvelope.sha256,
  }
  const envelope = await writeArtifact(
    "postcommerce/envelope.json",
    `${stablePostCommerceJson(envelopeValue)}\n`
  )

  const manifestValue = { entries: [], schemaVersion: 1 }
  const omissionLedgerValue = {
    entries: [],
    mode: "official-ro-description-only",
    schemaVersion: 1,
  }
  const manifest = await writeCanonical("catalog/manifest.json", manifestValue)
  const omissionLedger = await writeCanonical(
    "catalog/omission-ledger.json",
    omissionLedgerValue
  )
  const bundleValue = {
    bootstrap: {
      commercePlanSha256: commercePlanHash,
      observedCommerceSnapshotSha256:
        envelopeValue.observedCommerceSnapshotSha256,
      postCommerceEnvelopeSha256: envelope.sha256,
      priceAuthoritySha256: priceAuthority.sha256,
      sourceInventoryEnvelopeSha256: inventoryEnvelope.sha256,
    },
    demoOmissionLedger: omissionLedgerValue,
    demoOmissionLedgerSha256: stableDemoHash(omissionLedgerValue),
    manifest: manifestValue,
    manifestSha256: stableDemoHash(manifestValue),
    schemaVersion: 1,
  }
  const bundle = await writeCanonical("catalog/bundle.json", bundleValue)

  const scope = {
    brandExcludedIds: [],
    brandIds: ["brand_1"],
    categoryExcludedIds: [],
    categoryPublishedIds: ["category_1"],
    collectionIds: [],
    productExcludedIds: [],
    productPublishedIds: ["product_1"],
  }
  const scopeSha256 = hashRoCatalogScopePlan(scope)
  const plan = {
    brandItems: [],
    categoryItems: [],
    excludedBrandItems: [],
    excludedCategoryItems: [],
    excludedItems: [],
    expectedSkBaseline: { count: 31, sha256: skBaselineSha256 },
    items: [
      {
        entry: {
          variants: [
            {
              key: { kind: "sku", value: "sku_1" },
              roAvailability: "sellable",
              ronPrice: { amount: 1290 },
            },
          ],
        },
        productId: "product_1",
      },
    ],
    omissionLedger: null,
    omissionLedgerSha256: null,
    scope,
    scopeSha256,
    summary: {},
  }
  const importPlanValue = {
    plan,
    planHash: hashRoCatalogImportPlanValue(plan),
    schemaVersion: 1,
  }
  const importPlan = await writeCanonical(
    "catalog/import-plan.json",
    importPlanValue
  )

  const releaseForOperations = options.operationReleaseId ?? releaseId
  const scopeForOperations = options.operationScopeSha256 ?? scopeSha256
  const probeHash = hashLabel("probe")
  const staticTaxonomyValue = {
    actionsRequired: 0,
    blockers: 0,
    capturedAt: iso(now, -7),
    environmentId: releaseIdentity.environmentId,
    kind: "ro-static-taxonomy-convergence",
    planHash: STATIC_TAXONOMY_PLAN_HASH,
    policy: {
      indexable: { count: 2, routeKeys: ["root:about", "root:faq"] },
      market: "ro",
      noindex: {
        count: 11,
        routeKeys: [
          "root:affiliate",
          "root:contact",
          "root:cookies",
          "root:dropshipping",
          "root:giftVoucher",
          "root:privacy",
          "root:privateLabel",
          "root:returns",
          "root:shipping",
          "root:terms",
          "root:wholesale",
        ],
      },
    },
    populationManifestSha256: `sha256:${hashLabel("static-population-manifest")}`,
    releaseId: releaseForOperations,
    schemaVersion: 1,
    state: "converged",
    taxonomyApprovalHash: STATIC_TAXONOMY_APPROVAL_HASH,
  }
  const staticTaxonomyConvergence = await writeCanonical(
    "urlr/static-taxonomy-convergence.json",
    staticTaxonomyValue
  )
  const maintenanceValue = {
    activatedAt: iso(now, -10),
    activationProbe: {
      checkedAt: iso(now, -9),
      responseBodySha256: probeHash,
      responseHeadersSha256: probeHash,
      status: 503,
      url: `${releaseIdentity.roOrigin}/`,
    },
    kind: "herbatika-ro-host-maintenance-proof",
    policy: "ro-restricted-sk-live",
    postReleaseProbe: {
      checkedAt: iso(now, -0.25),
      deploymentHash: releaseIdentity.storefrontBuildHash,
      deploymentSlot: releaseIdentity.storefrontSlot,
      responseBodySha256: probeHash,
      status: 200,
      url: `${releaseIdentity.roOrigin}/sitemap.xml`,
    },
    preReleaseProbe: {
      checkedAt: iso(now, -2),
      responseBodySha256: probeHash,
      responseHeadersSha256: probeHash,
      status: 503,
      url: `${releaseIdentity.roOrigin}/`,
    },
    releaseId: releaseForOperations,
    releasedAt: iso(now, -1),
    restriction: {
      mode: "zane-host-access-restriction",
      roOrigin: releaseIdentity.roOrigin,
      zaneRouteConfigurationSha256: hashLabel("zane-route"),
    },
    schemaVersion: 1,
    skContinuity: {
      after: {
        checkedAt: iso(now, -0.75),
        deploymentHash: releaseIdentity.storefrontBuildHash,
        deploymentSlot: releaseIdentity.storefrontSlot,
        semanticBaselineSha256: hashLabel("sk-semantic"),
        status: 200,
        url: `${releaseIdentity.skOrigin}/sitemap.xml`,
      },
      before: {
        checkedAt: iso(now, -11),
        deploymentHash: "storefront-build-before",
        deploymentSlot: "green",
        semanticBaselineSha256: hashLabel("sk-semantic"),
        status: 200,
        url: `${releaseIdentity.skOrigin}/sitemap.xml`,
      },
    },
  }
  const maintenance = await writeCanonical(
    "operations/maintenance-proof.json",
    maintenanceValue
  )

  const eventHash = hashLabel("urlr-event-ids")
  const entityHash = hashLabel("urlr-entity-keys")
  const streamHash = hashLabel("urlr-stream-keys")
  const urlRegistryValue = {
    boundary: {
      expectedEntityCount: 1,
      expectedEntityKeysHash: entityHash,
      expectedEventCount: 1,
      expectedEventIdsHash: eventHash,
      expectedStreamCount: 1,
      expectedStreamKeysHash: streamHash,
    },
    catalogScopeSha256: scopeForOperations,
    generatedAt: iso(now, -6),
    kind: "herbatika-ro-urlr-convergence-proof",
    market: "ro",
    outbox: {
      blockedStreamCount: 0,
      deliveredCount: 1,
      deliveryOutcomeCounts: { alreadyApplied: 0, applied: 1, noopStale: 0 },
      expectedIdsObservedHash: eventHash,
      failedCount: 0,
      lastErrorCodeCounts: {},
      pendingFutureCount: 0,
      pendingReadyCount: 0,
      processingCount: 0,
      processingExpiredCount: 0,
      statusCounts: { delivered: 1, failed: 0, pending: 0, processing: 0 },
    },
    releaseId: releaseForOperations,
    routeProjection: {
      activeEntityCount: 1,
      activeEntityKeysHash: entityHash,
      assignmentSetHash: hashLabel("urlr-assignment-set"),
      extraCount: 0,
      missingCount: 0,
    },
    schemaVersion: 1,
    staticTaxonomyConvergenceSha256: staticTaxonomyConvergence.sha256,
    streams: {
      count: 1,
      keysHash: streamHash,
      notDeliveredThroughLastSequenceCount: 0,
      sequenceStateHash: hashLabel("urlr-sequence-state"),
    },
    urlrReceipts: {
      actionCounts: { applied: 1 },
      count: 1,
      cursorMismatchCount: 0,
      identityHash: hashLabel("urlr-receipts"),
      missingCommandBindingCount: 0,
    },
  }
  const urlRegistryConvergence = await writeCanonical(
    "operations/urlr-convergence.json",
    urlRegistryValue
  )

  const roUids = ["ro_brand", "ro_category", "ro_content", "ro_product"]
  const skUids = ["sk_brand", "sk_category", "sk_content", "sk_product"]
  const index = (uid, documentCount, entityIds) => ({
    documentCount,
    documentIdsSha256: hashLabel(`${uid}-documents`),
    ...(entityIds
      ? {
          entityCount: entityIds.length,
          entityIdsSha256: hashBytes(canonicalCutoverValue(entityIds)),
          extraScopeCount: 0,
          missingScopeCount: 0,
        }
      : {}),
    settingsSha256: hashLabel(`${uid}-settings`),
    uid,
  })
  const skIndex = (uid) => ({
    documentsSha256: hashLabel(`${uid}-documents`),
    settingsSha256: hashLabel(`${uid}-settings`),
    uid,
  })
  const meilisearchValue = {
    atomicSwap: {
      activeIndexUids: {
        brand: roUids[0],
        category: roUids[1],
        content: roUids[2],
        product: roUids[3],
      },
      completionMarkerCount: 0,
      failedTaskCount: 0,
      stagingIndexesRemaining: 0,
      unsettledTaskCount: 0,
    },
    catalogScopeSha256: scopeForOperations,
    generatedAt: iso(now, -3),
    indexes: {
      brand: index(roUids[0], 1, scope.brandIds),
      category: index(roUids[1], 1, scope.categoryPublishedIds),
      content: index(roUids[2], 0),
      product: index(roUids[3], 1, scope.productPublishedIds),
    },
    isolation: {
      roIndexUidsSha256: hashBytes(canonicalCutoverValue([...roUids].sort())),
      sharedIndexUidCount: 0,
      skIndexUidsSha256: hashBytes(canonicalCutoverValue([...skUids].sort())),
    },
    kind: "herbatika-ro-meilisearch-convergence-proof",
    locale: "ro-RO",
    market: "ro",
    profile: {
      domain: new URL(releaseIdentity.roOrigin).hostname,
      key: "ro-production",
      lastSyncError: null,
      lastSyncMode: "full",
      lastSyncStartedAt: iso(now, -5),
      lastSyncStatus: "succeeded",
      lastSyncedAt: iso(now, -4),
      locale: "ro-ro",
      salesChannelIds: [releaseIdentity.salesChannelId],
      shop: "herbatika-ro",
      strict: true,
    },
    releaseId: releaseForOperations,
    schemaVersion: 1,
    scope: {
      brandEntityCount: 1,
      brandEntityIdsSha256: hashBytes(canonicalCutoverValue(scope.brandIds)),
      categoryEntityCount: 1,
      categoryEntityIdsSha256: hashBytes(
        canonicalCutoverValue(scope.categoryPublishedIds)
      ),
      productEntityCount: 1,
      productEntityIdsSha256: hashBytes(
        canonicalCutoverValue(scope.productPublishedIds)
      ),
    },
    skPreservation: {
      afterSha256: hashLabel("sk-meili-state"),
      beforeSha256: hashLabel("sk-meili-state"),
      indexes: {
        brand: skIndex(skUids[0]),
        category: skIndex(skUids[1]),
        content: skIndex(skUids[2]),
        product: skIndex(skUids[3]),
      },
    },
  }
  const meilisearchConvergence = await writeCanonical(
    "operations/meili-convergence.json",
    meilisearchValue
  )

  const receipt = {
    artifacts: { staticTaxonomyConvergence },
    catalog: {
      bundle,
      importPlan: {
        ...importPlan,
        planHash: importPlanValue.planHash,
        scopeSha256,
      },
      manifest,
      omissionLedger,
    },
    commerce: {
      applyReceipt,
      plan: commercePlan,
      priceAuthoritySha256: priceAuthority.sha256,
      restoreArtifact,
      skBaselineSha256,
    },
    kind: "herbatika-ro-demo-cutover-receipt",
    locale: "ro-RO",
    market: "ro",
    operations: {
      maintenance,
      meilisearchConvergence,
      urlRegistryConvergence,
    },
    postCommerce: {
      commerceApplyReceiptSha256: applyReceipt.sha256,
      commercePlanFileSha256: commercePlan.sha256,
      commercePlanHash,
      commerceRestoreArtifactSha256: restoreArtifact.sha256,
      envelope,
      observedCommerceSnapshotSha256:
        envelopeValue.observedCommerceSnapshotSha256,
      payloadSha256: envelopeValue.payloadSha256,
      postCommerceSharedInventoryFingerprintCount: inventoryAfter.count,
      postCommerceSharedInventoryFingerprintSha256: inventoryAfter.sha256,
      postCommerceSkBaselineCount: skAfter.count,
      postCommerceSkBaselineErrors: skAfter.errors.length,
      postCommerceSkBaselineSha256: skAfter.sha256,
      preCommerceSharedInventoryFingerprintCount: inventoryBefore.count,
      preCommerceSharedInventoryFingerprintSha256: inventoryBefore.sha256,
      preCommerceSkBaselineCount: skBefore.count,
      preCommerceSkBaselineErrors: skBefore.errors.length,
      preCommerceSkBaselineSha256: skBefore.sha256,
      priceAuthoritySha256: priceAuthority.sha256,
      rawLiveInventorySha256: rawLiveInventory.sha256,
      sourceInventoryEnvelopeSha256: inventoryEnvelope.sha256,
    },
    preCommerce: {
      inventoryEnvelope,
      priceAuthority,
      rawLiveInventory,
    },
    releaseIdentity,
    releaseId,
    schemaVersion: 1,
  }
  const receiptPath = join(directoryPath, "receipt.json")
  await writeFile(receiptPath, canonicalCutoverReceipt(receipt))
  return { directoryPath, receipt, receiptPath }
}

test("accepts a complete immutable two-phase cutover evidence chain", async () => {
  const fixture = await buildEvidence()
  const verified = await verifyCutoverReceiptArtifacts(fixture)

  assert.equal(verified.receipt.releaseId, fixture.receipt.releaseId)
  assert.equal(verified.cutoverChainProof.matched, true)
  assert.equal(
    verified.cutoverChainProof.catalogPlanHash,
    fixture.receipt.catalog.importPlan.planHash
  )
  assert.equal(
    verified.cutoverChainProof.scopeSha256,
    fixture.receipt.catalog.importPlan.scopeSha256
  )
})

test("rejects tampered raw artifact bytes even when JSON remains valid", async () => {
  const fixture = await buildEvidence()
  await appendFile(
    join(fixture.directoryPath, "precommerce/raw-live-inventory.json"),
    " "
  )

  await assert.rejects(
    verifyCutoverReceiptArtifacts(fixture),
    RAW_TAMPER_PATTERN
  )
})

test("rejects an apply receipt bound to the wrong restore artifact hash", async () => {
  const fixture = await buildEvidence({
    applyRestoreArtifactSha256: hashLabel("different-restore-artifact"),
  })

  await assert.rejects(
    verifyCutoverReceiptArtifacts(fixture),
    ENVELOPE_MISMATCH_PATTERN
  )
})

test("rejects a post-commerce envelope from the wrong backend environment", async () => {
  const fixture = await buildEvidence({
    environment: { backendBuildHash: "backend-build-from-other-deployment" },
  })

  await assert.rejects(
    verifyCutoverReceiptArtifacts(fixture),
    ENVELOPE_MISMATCH_PATTERN
  )
})

test("rejects a stale post-commerce envelope", async () => {
  const fixture = await buildEvidence({
    capturedAt: "2026-01-01T00:00:00.000Z",
  })

  await assert.rejects(
    verifyCutoverReceiptArtifacts(fixture),
    STALE_ENVELOPE_PATTERN
  )
})

test("rejects mutated SK baseline across the RO commerce phase", async () => {
  const fixture = await buildEvidence({
    postSkBaseline: { sha256: hashLabel("mutated-sk-baseline") },
  })

  await assert.rejects(
    verifyCutoverReceiptArtifacts(fixture),
    SK_MUTATION_PATTERN
  )
})

test("rejects mutated shared inventory across the RO commerce phase", async () => {
  const fixture = await buildEvidence({
    postInventoryFingerprint: { sha256: hashLabel("mutated-inventory") },
  })

  await assert.rejects(
    verifyCutoverReceiptArtifacts(fixture),
    INVENTORY_MUTATION_PATTERN
  )
})

test("rejects operation proofs for a different release", async () => {
  const fixture = await buildEvidence({
    operationReleaseId: "ro-demo-another-release",
  })

  await assert.rejects(
    verifyCutoverReceiptArtifacts(fixture),
    RELEASE_MISMATCH_PATTERN
  )
})

test("rejects operation proofs for a different catalog scope", async () => {
  const fixture = await buildEvidence({
    operationScopeSha256: hashLabel("another-catalog-scope"),
  })

  await assert.rejects(
    verifyCutoverReceiptArtifacts(fixture),
    SCOPE_MISMATCH_PATTERN
  )
})
