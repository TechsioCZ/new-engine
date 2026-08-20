// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: release acceptance explicitly validates complete immutable operation artifacts and their cross-phase invariants
import { createHash } from "node:crypto"
import { lstat, readFile, realpath } from "node:fs/promises"
import { isAbsolute, relative, resolve, sep } from "node:path"
import {
  hashRoTwoPhaseProvenanceReceipt,
  parseRoCatalogScopePlanArtifact,
  parseRoTwoPhaseProvenanceReceipt,
} from "../../../medusa-be/src/scripts/ro-catalog-readiness-contract.ts"
import {
  parseRoDemoApplyReceipt,
  parseRoDemoRestoreArtifact,
} from "../../../medusa-be/src/scripts/ro-demo-commerce/artifacts.ts"
import { parseRoPostCommerceEnvelopeContract } from "../../../medusa-be/src/scripts/ro-demo-localization/postcommerce-envelope-contract.mjs"

const SHA256_PATTERN = /^[a-f0-9]{64}$/
const SHA256_LITERAL_PATTERN = /^sha256:[a-f0-9]{64}$/
const RELEASE_SHA_PATTERN = /^[a-f0-9]{40}$/
const DEPLOYMENT_ID_PATTERN = /^[A-Za-z0-9._:-]{1,160}$/
const STATIC_TAXONOMY_APPROVAL_HASH =
  "sha256:a532ad08f718b0a8ff5d58026144a24314dd53f1c7bb38a0840efb5fe59aae39"
const STATIC_TAXONOMY_PLAN_HASH =
  "sha256:0f7c1615586b9f1397290b87d2210dd47143d0dd17fcb53b0832e699221f6896"

const isRecord = (value) =>
  Boolean(value && typeof value === "object" && !Array.isArray(value))

const exactRecord = (value, expectedKeys, label) => {
  if (
    !isRecord(value) ||
    JSON.stringify(Object.keys(value).sort()) !==
      JSON.stringify([...expectedKeys].sort())
  ) {
    throw new Error(`cutover: ${label} has invalid fields`)
  }
  return value
}

const sha256Value = (value, label) => {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new Error(`cutover: ${label} must be a lowercase SHA-256`)
  }
  return value
}

const canonicalJson = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex")

const stableDemoValue = (value) => {
  if (Array.isArray(value)) {
    return value
      .map(stableDemoValue)
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right), "en")
      )
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right, "en"))
        .map(([key, child]) => [key, stableDemoValue(child)])
    )
  }
  return value
}

const stableDemoJson = (value) => JSON.stringify(stableDemoValue(value))

export const canonicalCutoverValue = canonicalJson

export const canonicalCutoverReceipt = (receipt) =>
  `${canonicalCutoverValue(receipt)}\n`

export const cutoverReceiptSha256 = (receipt) =>
  hashRoTwoPhaseProvenanceReceipt(receipt)

export const parseCutoverReceipt = (value) =>
  parseRoTwoPhaseProvenanceReceipt(value).receipt

const parseJsonBytes = (bytes, label) => {
  try {
    return JSON.parse(bytes.toString("utf8"))
  } catch {
    throw new Error(`cutover: ${label} is not valid JSON`)
  }
}

const timestampValue = (value, label) => {
  const parsed = new Date(value ?? "")
  if (
    typeof value !== "string" ||
    Number.isNaN(parsed.valueOf()) ||
    parsed.toISOString() !== value
  ) {
    throw new Error(`cutover: ${label} must be an ISO-8601 UTC timestamp`)
  }
  return parsed.valueOf()
}

const nonnegativeInteger = (value, label) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`cutover: ${label} must be a nonnegative integer`)
  }
  return value
}

const nonblank = (value, label) => {
  if (typeof value !== "string" || !value.trim() || value.trim() !== value) {
    throw new Error(`cutover: ${label} must be nonblank`)
  }
  return value
}

const parseProbe = (value, label, expectedUrl, allowedStatuses) => {
  const probe = exactRecord(
    value,
    [
      "checkedAt",
      "responseBodySha256",
      "responseHeadersSha256",
      "status",
      "url",
    ],
    label
  )
  timestampValue(probe.checkedAt, `${label}.checkedAt`)
  sha256Value(probe.responseBodySha256, `${label}.responseBodySha256`)
  sha256Value(probe.responseHeadersSha256, `${label}.responseHeadersSha256`)
  if (probe.url !== expectedUrl || !allowedStatuses.includes(probe.status)) {
    throw new Error(`cutover: ${label} did not observe the required host state`)
  }
  return probe
}

const parseDeploymentProbe = (value, label, expectedUrl) => {
  const probe = exactRecord(
    value,
    [
      "checkedAt",
      "deploymentHash",
      "deploymentSlot",
      "semanticBaselineSha256",
      "status",
      "url",
    ],
    label
  )
  timestampValue(probe.checkedAt, `${label}.checkedAt`)
  sha256Value(probe.semanticBaselineSha256, `${label}.semanticBaselineSha256`)
  nonblank(probe.deploymentHash, `${label}.deploymentHash`)
  if (
    probe.url !== expectedUrl ||
    probe.status !== 200 ||
    !["blue", "green"].includes(probe.deploymentSlot)
  ) {
    throw new Error(`cutover: ${label} did not preserve the SK storefront`)
  }
  return probe
}

const validateMaintenanceProof = (value, releaseIdentity, releaseId) => {
  const proof = exactRecord(
    value,
    [
      "activatedAt",
      "activationProbe",
      "kind",
      "policy",
      "postReleaseProbe",
      "preReleaseProbe",
      "releaseId",
      "releasedAt",
      "restriction",
      "schemaVersion",
      "skContinuity",
    ],
    "maintenance proof"
  )
  const restriction = exactRecord(
    proof.restriction,
    ["mode", "roOrigin", "zaneRouteConfigurationSha256"],
    "maintenance restriction"
  )
  const continuity = exactRecord(
    proof.skContinuity,
    ["after", "before"],
    "maintenance skContinuity"
  )
  const restrictedStatuses = [401, 403, 423, 503]
  const activation = parseProbe(
    proof.activationProbe,
    "maintenance activationProbe",
    `${releaseIdentity.roOrigin}/`,
    restrictedStatuses
  )
  const preRelease = parseProbe(
    proof.preReleaseProbe,
    "maintenance preReleaseProbe",
    `${releaseIdentity.roOrigin}/`,
    restrictedStatuses
  )
  const before = parseDeploymentProbe(
    continuity.before,
    "maintenance skContinuity.before",
    `${releaseIdentity.skOrigin}/sitemap.xml`
  )
  const after = parseDeploymentProbe(
    continuity.after,
    "maintenance skContinuity.after",
    `${releaseIdentity.skOrigin}/sitemap.xml`
  )
  const postRelease = exactRecord(
    proof.postReleaseProbe,
    [
      "checkedAt",
      "deploymentHash",
      "deploymentSlot",
      "responseBodySha256",
      "status",
      "url",
    ],
    "maintenance postReleaseProbe"
  )
  sha256Value(
    postRelease.responseBodySha256,
    "maintenance postReleaseProbe.responseBodySha256"
  )
  const activatedAt = timestampValue(
    proof.activatedAt,
    "maintenance.activatedAt"
  )
  const releasedAt = timestampValue(proof.releasedAt, "maintenance.releasedAt")
  const postReleasedAt = timestampValue(
    postRelease.checkedAt,
    "maintenance postReleaseProbe.checkedAt"
  )
  if (
    proof.schemaVersion !== 1 ||
    proof.kind !== "herbatika-ro-host-maintenance-proof" ||
    proof.releaseId !== releaseId ||
    proof.policy !== "ro-restricted-sk-live" ||
    restriction.mode !== "zane-host-access-restriction" ||
    restriction.roOrigin !== releaseIdentity.roOrigin ||
    !SHA256_PATTERN.test(restriction.zaneRouteConfigurationSha256 ?? "") ||
    before.semanticBaselineSha256 !== after.semanticBaselineSha256 ||
    after.deploymentHash !== releaseIdentity.storefrontBuildHash ||
    after.deploymentSlot !== releaseIdentity.storefrontSlot ||
    postRelease.url !== `${releaseIdentity.roOrigin}/sitemap.xml` ||
    postRelease.status !== 200 ||
    postRelease.deploymentHash !== releaseIdentity.storefrontBuildHash ||
    postRelease.deploymentSlot !== releaseIdentity.storefrontSlot ||
    !(
      activatedAt <=
        timestampValue(activation.checkedAt, "activation checkedAt") &&
      timestampValue(activation.checkedAt, "activation checkedAt") <
        timestampValue(preRelease.checkedAt, "pre-release checkedAt") &&
      timestampValue(preRelease.checkedAt, "pre-release checkedAt") <=
        releasedAt &&
      releasedAt <= postReleasedAt
    )
  ) {
    throw new Error(
      "cutover: maintenance proof does not preserve RO restriction and SK continuity"
    )
  }
  return proof
}

const validateUrlRegistryProof = (
  value,
  { catalogScopeSha256, releaseId, staticTaxonomyConvergenceSha256 }
) => {
  const proof = exactRecord(
    value,
    [
      "boundary",
      "catalogScopeSha256",
      "generatedAt",
      "kind",
      "market",
      "outbox",
      "releaseId",
      "routeProjection",
      "schemaVersion",
      "staticTaxonomyConvergenceSha256",
      "streams",
      "urlrReceipts",
    ],
    "URLR convergence proof"
  )
  const boundary = exactRecord(
    proof.boundary,
    [
      "expectedEntityCount",
      "expectedEntityKeysHash",
      "expectedEventCount",
      "expectedEventIdsHash",
      "expectedStreamCount",
      "expectedStreamKeysHash",
    ],
    "URLR boundary"
  )
  const outbox = exactRecord(
    proof.outbox,
    [
      "blockedStreamCount",
      "deliveredCount",
      "deliveryOutcomeCounts",
      "expectedIdsObservedHash",
      "failedCount",
      "lastErrorCodeCounts",
      "pendingFutureCount",
      "pendingReadyCount",
      "processingCount",
      "processingExpiredCount",
      "statusCounts",
    ],
    "URLR outbox"
  )
  const statusCounts = exactRecord(
    outbox.statusCounts,
    ["delivered", "failed", "pending", "processing"],
    "URLR outbox.statusCounts"
  )
  const outcomes = exactRecord(
    outbox.deliveryOutcomeCounts,
    ["alreadyApplied", "applied", "noopStale"],
    "URLR outbox.deliveryOutcomeCounts"
  )
  const streams = exactRecord(
    proof.streams,
    [
      "count",
      "keysHash",
      "notDeliveredThroughLastSequenceCount",
      "sequenceStateHash",
    ],
    "URLR streams"
  )
  const receipts = exactRecord(
    proof.urlrReceipts,
    [
      "actionCounts",
      "count",
      "cursorMismatchCount",
      "identityHash",
      "missingCommandBindingCount",
    ],
    "URLR receipts"
  )
  const projection = exactRecord(
    proof.routeProjection,
    [
      "activeEntityCount",
      "activeEntityKeysHash",
      "assignmentSetHash",
      "extraCount",
      "missingCount",
    ],
    "URLR routeProjection"
  )
  if (
    !(isRecord(receipts.actionCounts) && isRecord(outbox.lastErrorCodeCounts))
  ) {
    throw new Error("cutover: URLR count maps are invalid")
  }
  for (const [key, count] of Object.entries(receipts.actionCounts)) {
    nonblank(key, "URLR receipt action")
    nonnegativeInteger(count, `URLR actionCounts.${key}`)
  }
  for (const [key, count] of Object.entries(outbox.lastErrorCodeCounts)) {
    nonblank(key, "URLR last error code")
    nonnegativeInteger(count, `URLR lastErrorCodeCounts.${key}`)
  }
  for (const [label, record] of [
    ["boundary", boundary],
    ["statusCounts", statusCounts],
    ["outcomes", outcomes],
    ["streams", streams],
    ["receipts", receipts],
    ["projection", projection],
  ]) {
    for (const [key, count] of Object.entries(record)) {
      if (!key.toLowerCase().includes("hash") && key !== "actionCounts") {
        nonnegativeInteger(count, `URLR ${label}.${key}`)
      }
    }
  }
  for (const [label, hash] of [
    ["boundary.expectedEntityKeysHash", boundary.expectedEntityKeysHash],
    ["boundary.expectedEventIdsHash", boundary.expectedEventIdsHash],
    ["boundary.expectedStreamKeysHash", boundary.expectedStreamKeysHash],
    ["outbox.expectedIdsObservedHash", outbox.expectedIdsObservedHash],
    ["streams.keysHash", streams.keysHash],
    ["streams.sequenceStateHash", streams.sequenceStateHash],
    ["receipts.identityHash", receipts.identityHash],
    ["projection.activeEntityKeysHash", projection.activeEntityKeysHash],
    ["projection.assignmentSetHash", projection.assignmentSetHash],
  ]) {
    sha256Value(hash, `URLR ${label}`)
  }
  const actionTotal = Object.values(receipts.actionCounts).reduce(
    (sum, count) => sum + count,
    0
  )
  if (
    proof.schemaVersion !== 1 ||
    proof.kind !== "herbatika-ro-urlr-convergence-proof" ||
    proof.releaseId !== releaseId ||
    proof.market !== "ro" ||
    proof.catalogScopeSha256 !== catalogScopeSha256 ||
    proof.staticTaxonomyConvergenceSha256 !== staticTaxonomyConvergenceSha256 ||
    outbox.expectedIdsObservedHash !== boundary.expectedEventIdsHash ||
    outbox.deliveredCount !== boundary.expectedEventCount ||
    statusCounts.delivered !== boundary.expectedEventCount ||
    streams.count !== boundary.expectedStreamCount ||
    streams.keysHash !== boundary.expectedStreamKeysHash ||
    projection.activeEntityCount !== boundary.expectedEntityCount ||
    projection.activeEntityKeysHash !== boundary.expectedEntityKeysHash ||
    receipts.count !== actionTotal ||
    [
      statusCounts.pending,
      statusCounts.processing,
      statusCounts.failed,
      outbox.failedCount,
      outbox.processingCount,
      outbox.processingExpiredCount,
      outbox.pendingReadyCount,
      outbox.pendingFutureCount,
      outbox.blockedStreamCount,
      streams.notDeliveredThroughLastSequenceCount,
      receipts.missingCommandBindingCount,
      receipts.cursorMismatchCount,
      projection.missingCount,
      projection.extraCount,
      ...Object.values(outbox.lastErrorCodeCounts),
    ].some((count) => count !== 0)
  ) {
    throw new Error(
      "cutover: URLR outbox and route projection are not converged"
    )
  }
  timestampValue(proof.generatedAt, "URLR generatedAt")
  return proof
}

const validateStaticTaxonomyProof = (value, receipt) => {
  const proof = exactRecord(
    value,
    [
      "actionsRequired",
      "blockers",
      "capturedAt",
      "environmentId",
      "kind",
      "planHash",
      "policy",
      "populationManifestSha256",
      "releaseId",
      "schemaVersion",
      "state",
      "taxonomyApprovalHash",
    ],
    "static taxonomy convergence proof"
  )
  const policy = exactRecord(
    proof.policy,
    ["indexable", "market", "noindex"],
    "static taxonomy policy"
  )
  const indexable = exactRecord(
    policy.indexable,
    ["count", "routeKeys"],
    "static taxonomy indexable policy"
  )
  const noindex = exactRecord(
    policy.noindex,
    ["count", "routeKeys"],
    "static taxonomy noindex policy"
  )
  timestampValue(proof.capturedAt, "static taxonomy capturedAt")
  if (!SHA256_LITERAL_PATTERN.test(proof.populationManifestSha256 ?? "")) {
    throw new Error(
      "cutover: static taxonomy populationManifestSha256 is invalid"
    )
  }
  const expectedIndexable = ["root:about", "root:faq"]
  const expectedNoindex = [
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
  ]
  if (
    proof.schemaVersion !== 1 ||
    proof.kind !== "ro-static-taxonomy-convergence" ||
    proof.state !== "converged" ||
    proof.releaseId !== receipt.releaseId ||
    proof.environmentId !== receipt.releaseIdentity.environmentId ||
    proof.taxonomyApprovalHash !== STATIC_TAXONOMY_APPROVAL_HASH ||
    proof.planHash !== STATIC_TAXONOMY_PLAN_HASH ||
    proof.actionsRequired !== 0 ||
    proof.blockers !== 0 ||
    policy.market !== "ro" ||
    indexable.count !== expectedIndexable.length ||
    noindex.count !== expectedNoindex.length ||
    canonicalJson(indexable.routeKeys) !== canonicalJson(expectedIndexable) ||
    canonicalJson(noindex.routeKeys) !== canonicalJson(expectedNoindex)
  ) {
    throw new Error("cutover: static taxonomy convergence is not approved")
  }
  return proof
}

const validateMeiliIndex = (value, label, expectedUid, expectedScope) => {
  const entityKeys = expectedScope
    ? ["entityCount", "entityIdsSha256", "extraScopeCount", "missingScopeCount"]
    : []
  const index = exactRecord(
    value,
    [
      "documentCount",
      "documentIdsSha256",
      "settingsSha256",
      "uid",
      ...entityKeys,
    ],
    label
  )
  nonnegativeInteger(index.documentCount, `${label}.documentCount`)
  sha256Value(index.documentIdsSha256, `${label}.documentIdsSha256`)
  sha256Value(index.settingsSha256, `${label}.settingsSha256`)
  if (index.uid !== expectedUid) {
    throw new Error(`cutover: ${label}.uid does not match active index`)
  }
  if (expectedScope) {
    nonnegativeInteger(index.entityCount, `${label}.entityCount`)
    nonnegativeInteger(index.missingScopeCount, `${label}.missingScopeCount`)
    nonnegativeInteger(index.extraScopeCount, `${label}.extraScopeCount`)
    sha256Value(index.entityIdsSha256, `${label}.entityIdsSha256`)
    if (
      index.entityCount !== expectedScope.count ||
      index.entityIdsSha256 !== expectedScope.sha256 ||
      index.missingScopeCount !== 0 ||
      index.extraScopeCount !== 0
    ) {
      throw new Error(`cutover: ${label} does not exactly cover catalog scope`)
    }
  }
  return index
}

const validateMeilisearchProof = (
  value,
  {
    catalogScopeSha256,
    releaseId,
    releaseIdentity,
    scopePlan,
    urlRegistryProof,
  }
) => {
  const proof = exactRecord(
    value,
    [
      "atomicSwap",
      "catalogScopeSha256",
      "generatedAt",
      "indexes",
      "isolation",
      "kind",
      "locale",
      "market",
      "profile",
      "releaseId",
      "schemaVersion",
      "scope",
      "skPreservation",
    ],
    "Meilisearch convergence proof"
  )
  const profile = exactRecord(
    proof.profile,
    [
      "domain",
      "key",
      "lastSyncError",
      "lastSyncMode",
      "lastSyncStartedAt",
      "lastSyncStatus",
      "lastSyncedAt",
      "locale",
      "salesChannelIds",
      "shop",
      "strict",
    ],
    "Meilisearch profile"
  )
  const atomicSwap = exactRecord(
    proof.atomicSwap,
    [
      "activeIndexUids",
      "completionMarkerCount",
      "failedTaskCount",
      "stagingIndexesRemaining",
      "unsettledTaskCount",
    ],
    "Meilisearch atomicSwap"
  )
  const activeUids = exactRecord(
    atomicSwap.activeIndexUids,
    ["brand", "category", "content", "product"],
    "Meilisearch activeIndexUids"
  )
  const scope = exactRecord(
    proof.scope,
    [
      "brandEntityCount",
      "brandEntityIdsSha256",
      "categoryEntityCount",
      "categoryEntityIdsSha256",
      "productEntityCount",
      "productEntityIdsSha256",
    ],
    "Meilisearch scope"
  )
  const expectedScope = {
    brand: {
      count: scopePlan.scope.brandIds.length,
      sha256: sha256(canonicalJson(scopePlan.scope.brandIds)),
    },
    category: {
      count: scopePlan.scope.categoryPublishedIds.length,
      sha256: sha256(canonicalJson(scopePlan.scope.categoryPublishedIds)),
    },
    product: {
      count: scopePlan.scope.productPublishedIds.length,
      sha256: sha256(canonicalJson(scopePlan.scope.productPublishedIds)),
    },
  }
  for (const kind of ["brand", "category", "product"]) {
    const prefix = `${kind}Entity`
    nonnegativeInteger(
      scope[`${prefix}Count`],
      `Meilisearch scope ${kind} count`
    )
    sha256Value(scope[`${prefix}IdsSha256`], `Meilisearch scope ${kind} hash`)
    if (
      scope[`${prefix}Count`] !== expectedScope[kind].count ||
      scope[`${prefix}IdsSha256`] !== expectedScope[kind].sha256
    ) {
      throw new Error("cutover: Meilisearch scope does not match importer plan")
    }
  }
  const indexes = exactRecord(
    proof.indexes,
    ["brand", "category", "content", "product"],
    "Meilisearch indexes"
  )
  const parsedIndexes = {
    brand: validateMeiliIndex(
      indexes.brand,
      "Meilisearch brand index",
      activeUids.brand,
      expectedScope.brand
    ),
    category: validateMeiliIndex(
      indexes.category,
      "Meilisearch category index",
      activeUids.category,
      expectedScope.category
    ),
    content: validateMeiliIndex(
      indexes.content,
      "Meilisearch content index",
      activeUids.content
    ),
    product: validateMeiliIndex(
      indexes.product,
      "Meilisearch product index",
      activeUids.product,
      expectedScope.product
    ),
  }
  const isolation = exactRecord(
    proof.isolation,
    ["roIndexUidsSha256", "sharedIndexUidCount", "skIndexUidsSha256"],
    "Meilisearch isolation"
  )
  const preservation = exactRecord(
    proof.skPreservation,
    ["afterSha256", "beforeSha256", "indexes"],
    "Meilisearch SK preservation"
  )
  const skIndexes = exactRecord(
    preservation.indexes,
    ["brand", "category", "content", "product"],
    "Meilisearch SK indexes"
  )
  const skUids = []
  for (const kind of ["brand", "category", "content", "product"]) {
    const index = exactRecord(
      skIndexes[kind],
      ["documentsSha256", "settingsSha256", "uid"],
      `Meilisearch SK ${kind} index`
    )
    nonblank(index.uid, `Meilisearch SK ${kind} uid`)
    sha256Value(index.documentsSha256, `Meilisearch SK ${kind} documents`)
    sha256Value(index.settingsSha256, `Meilisearch SK ${kind} settings`)
    skUids.push(index.uid)
  }
  const roUids = Object.values(activeUids)
  for (const uid of roUids) {
    nonblank(uid, "Meilisearch RO active UID")
  }
  for (const field of [
    "completionMarkerCount",
    "failedTaskCount",
    "stagingIndexesRemaining",
    "unsettledTaskCount",
  ]) {
    nonnegativeInteger(atomicSwap[field], `Meilisearch atomicSwap.${field}`)
  }
  sha256Value(isolation.roIndexUidsSha256, "Meilisearch RO UID hash")
  sha256Value(isolation.skIndexUidsSha256, "Meilisearch SK UID hash")
  sha256Value(preservation.beforeSha256, "Meilisearch SK before hash")
  sha256Value(preservation.afterSha256, "Meilisearch SK after hash")
  const generatedAt = timestampValue(
    proof.generatedAt,
    "Meilisearch generatedAt"
  )
  const syncStartedAt = timestampValue(
    profile.lastSyncStartedAt,
    "Meilisearch lastSyncStartedAt"
  )
  const syncedAt = timestampValue(
    profile.lastSyncedAt,
    "Meilisearch lastSyncedAt"
  )
  if (
    proof.schemaVersion !== 1 ||
    proof.kind !== "herbatika-ro-meilisearch-convergence-proof" ||
    proof.releaseId !== releaseId ||
    proof.market !== "ro" ||
    proof.locale !== "ro-RO" ||
    proof.catalogScopeSha256 !== catalogScopeSha256 ||
    profile.locale !== "ro-ro" ||
    profile.strict !== true ||
    profile.lastSyncStatus !== "succeeded" ||
    profile.lastSyncMode !== "full" ||
    profile.lastSyncError !== null ||
    !Array.isArray(profile.salesChannelIds) ||
    profile.salesChannelIds.length !== 1 ||
    profile.salesChannelIds[0] !== releaseIdentity.salesChannelId ||
    profile.domain !== new URL(releaseIdentity.roOrigin).hostname ||
    !profile.key ||
    !profile.shop ||
    syncStartedAt <
      timestampValue(urlRegistryProof.generatedAt, "URLR generatedAt") ||
    syncStartedAt > syncedAt ||
    syncedAt > generatedAt ||
    Object.values(atomicSwap)
      .filter((entry) => typeof entry === "number")
      .some((count) => count !== 0) ||
    new Set(roUids).size !== roUids.length ||
    new Set(skUids).size !== skUids.length ||
    roUids.some((uid) => skUids.includes(uid)) ||
    isolation.sharedIndexUidCount !== 0 ||
    isolation.roIndexUidsSha256 !== sha256(canonicalJson([...roUids].sort())) ||
    isolation.skIndexUidsSha256 !== sha256(canonicalJson([...skUids].sort())) ||
    preservation.beforeSha256 !== preservation.afterSha256 ||
    parsedIndexes.category.documentCount !== expectedScope.category.count ||
    parsedIndexes.brand.documentCount !== expectedScope.brand.count ||
    parsedIndexes.product.documentCount < expectedScope.product.count
  ) {
    throw new Error(
      "cutover: Meilisearch convergence or SK isolation is invalid"
    )
  }
  return proof
}

const withinDirectory = (root, target) => {
  const path = relative(root, target)
  return path === "" || !(path === ".." || path.startsWith(`..${sep}`))
}

export const verifyCutoverReceiptArtifacts = async ({
  directoryPath,
  receiptPath,
}) => {
  if (!(isAbsolute(directoryPath) && isAbsolute(receiptPath))) {
    throw new Error(
      "cutover: evidence directory and receipt path must be absolute"
    )
  }
  const root = await realpath(directoryPath)
  const resolvedReceipt = await realpath(receiptPath)
  if (
    resolvedReceipt !== resolve(root, "receipt.json") ||
    !withinDirectory(root, resolvedReceipt)
  ) {
    throw new Error("cutover: receipt must be DIR/receipt.json without escape")
  }
  const receiptBytes = await readFile(resolvedReceipt)
  const receipt = parseCutoverReceipt(
    parseJsonBytes(receiptBytes, "receipt.json")
  )
  if (receiptBytes.toString("utf8") !== canonicalCutoverReceipt(receipt)) {
    throw new Error("cutover: receipt bytes are not canonical JSON plus LF")
  }

  const readArtifact = async (ref, label, { privateArtifact = false } = {}) => {
    const requestedTarget = resolve(root, ref.path)
    const fileStatus = await lstat(requestedTarget)
    if (fileStatus.isSymbolicLink() || !fileStatus.isFile()) {
      throw new Error(`cutover: ${label} must be a regular non-symlink file`)
    }
    // biome-ignore lint/suspicious/noBitwiseOperators: POSIX permission bits are a bit mask.
    if (privateArtifact && (fileStatus.mode & 0o077) !== 0) {
      throw new Error(`cutover: ${label} must not grant group/world access`)
    }
    const target = await realpath(requestedTarget)
    if (!withinDirectory(root, target)) {
      throw new Error(`cutover: ${label} escapes the evidence directory`)
    }
    const bytes = await readFile(target)
    if (sha256(bytes) !== ref.sha256) {
      throw new Error(`cutover: ${label} file SHA-256 mismatch`)
    }
    return { bytes, value: parseJsonBytes(bytes, label) }
  }
  const [
    postEnvelope,
    bundle,
    manifest,
    omissionLedger,
    importPlan,
    _preInventory,
    _rawInventory,
    _priceAuthority,
    _commercePlan,
    commerceApplyReceiptArtifact,
    commerceRestoreArtifact,
    staticTaxonomyArtifact,
    maintenanceArtifact,
    urlRegistryArtifact,
    meilisearchArtifact,
  ] = await Promise.all([
    readArtifact(receipt.postCommerce.envelope, "postCommerce.envelope"),
    readArtifact(receipt.catalog.bundle, "catalog.bundle"),
    readArtifact(receipt.catalog.manifest, "catalog.manifest"),
    readArtifact(receipt.catalog.omissionLedger, "catalog.omissionLedger"),
    readArtifact(receipt.catalog.importPlan, "catalog.importPlan"),
    readArtifact(
      receipt.preCommerce.inventoryEnvelope,
      "preCommerce.inventoryEnvelope"
    ),
    readArtifact(
      receipt.preCommerce.rawLiveInventory,
      "preCommerce.rawLiveInventory"
    ),
    readArtifact(
      receipt.preCommerce.priceAuthority,
      "preCommerce.priceAuthority"
    ),
    readArtifact(receipt.commerce.plan, "commerce.plan"),
    readArtifact(receipt.commerce.applyReceipt, "commerce.applyReceipt", {
      privateArtifact: true,
    }),
    readArtifact(receipt.commerce.restoreArtifact, "commerce.restoreArtifact", {
      privateArtifact: true,
    }),
    readArtifact(
      receipt.artifacts.staticTaxonomyConvergence,
      "artifacts.staticTaxonomyConvergence"
    ),
    readArtifact(receipt.operations.maintenance, "operations.maintenance"),
    readArtifact(
      receipt.operations.urlRegistryConvergence,
      "operations.urlRegistryConvergence"
    ),
    readArtifact(
      receipt.operations.meilisearchConvergence,
      "operations.meilisearchConvergence"
    ),
  ])
  const envelope = parseRoPostCommerceEnvelopeContract(
    postEnvelope.bytes.toString("utf8")
  )
  const applyReceipt = parseRoDemoApplyReceipt(
    commerceApplyReceiptArtifact.bytes.toString("utf8")
  )
  const restoreArtifact = parseRoDemoRestoreArtifact(
    commerceRestoreArtifact.bytes.toString("utf8")
  )
  const { environment } = envelope
  const preSk = envelope.preCommerceSkBaseline
  const postSk = envelope.postCommerceSkBaseline
  const preInventory = envelope.preCommerceSharedInventoryFingerprint
  const postInventory = envelope.postCommerceSharedInventoryFingerprint
  const post = receipt.postCommerce
  if (
    environment.locale !== "ro-RO" ||
    environment.marketCode !== "ro" ||
    environment.salesChannelId !== receipt.releaseIdentity.salesChannelId ||
    environment.environmentId !== receipt.releaseIdentity.environmentId ||
    environment.databaseFingerprint !==
      receipt.releaseIdentity.databaseFingerprint ||
    environment.backendReleaseSha !==
      receipt.releaseIdentity.backendReleaseSha ||
    environment.backendDeploymentId !==
      receipt.releaseIdentity.backendDeploymentId ||
    environment.backendBuildHash !== receipt.releaseIdentity.backendBuildHash ||
    environment.backendSlot !== receipt.releaseIdentity.backendSlot ||
    !SHA256_PATTERN.test(environment.databaseFingerprint ?? "") ||
    !DEPLOYMENT_ID_PATTERN.test(environment.environmentId ?? "") ||
    !RELEASE_SHA_PATTERN.test(environment.backendReleaseSha ?? "") ||
    !DEPLOYMENT_ID_PATTERN.test(environment.backendDeploymentId ?? "") ||
    !DEPLOYMENT_ID_PATTERN.test(environment.backendBuildHash ?? "") ||
    !["blue", "green"].includes(environment.backendSlot) ||
    envelope.sourceInventoryEnvelopeSha256 !==
      receipt.preCommerce.inventoryEnvelope.sha256 ||
    envelope.rawLiveInventorySha256 !==
      receipt.preCommerce.rawLiveInventory.sha256 ||
    envelope.priceAuthoritySha256 !==
      receipt.preCommerce.priceAuthority.sha256 ||
    envelope.commercePlanFileSha256 !== receipt.commerce.plan.sha256 ||
    envelope.commerceApplyReceiptSha256 !==
      receipt.commerce.applyReceipt.sha256 ||
    envelope.commerceRestoreArtifactSha256 !==
      receipt.commerce.restoreArtifact.sha256 ||
    restoreArtifact.planHash !== envelope.commercePlanHash ||
    applyReceipt.planHash !== envelope.commercePlanHash ||
    restoreArtifact.priceAuthoritySha256 !== envelope.priceAuthoritySha256 ||
    applyReceipt.priceAuthoritySha256 !== envelope.priceAuthoritySha256 ||
    applyReceipt.restoreArtifactSha256 !==
      receipt.commerce.restoreArtifact.sha256 ||
    applyReceipt.skBaselineHashBefore !== preSk.sha256 ||
    applyReceipt.skBaselineHashAfter !== postSk.sha256 ||
    post.sourceInventoryEnvelopeSha256 !==
      envelope.sourceInventoryEnvelopeSha256 ||
    post.rawLiveInventorySha256 !== envelope.rawLiveInventorySha256 ||
    post.priceAuthoritySha256 !== envelope.priceAuthoritySha256 ||
    post.commercePlanFileSha256 !== envelope.commercePlanFileSha256 ||
    post.commercePlanHash !== envelope.commercePlanHash ||
    post.commerceApplyReceiptSha256 !== envelope.commerceApplyReceiptSha256 ||
    post.commerceRestoreArtifactSha256 !==
      envelope.commerceRestoreArtifactSha256 ||
    post.observedCommerceSnapshotSha256 !==
      envelope.observedCommerceSnapshotSha256 ||
    post.payloadSha256 !== envelope.payloadSha256 ||
    post.preCommerceSkBaselineSha256 !== preSk.sha256 ||
    post.preCommerceSkBaselineCount !== preSk.count ||
    post.preCommerceSkBaselineErrors !== preSk.errors.length ||
    post.postCommerceSkBaselineSha256 !== postSk.sha256 ||
    post.postCommerceSkBaselineCount !== postSk.count ||
    post.postCommerceSkBaselineErrors !== postSk.errors.length ||
    post.preCommerceSharedInventoryFingerprintSha256 !== preInventory.sha256 ||
    post.preCommerceSharedInventoryFingerprintCount !== preInventory.count ||
    post.postCommerceSharedInventoryFingerprintSha256 !==
      postInventory.sha256 ||
    post.postCommerceSharedInventoryFingerprintCount !== postInventory.count
  ) {
    throw new Error("cutover: post-commerce envelope does not match receipt")
  }
  if (!isRecord(bundle.value)) {
    throw new Error("cutover: catalog bundle must be an object")
  }
  const bundleValue = bundle.value
  const bootstrap = exactRecord(
    bundleValue.bootstrap,
    [
      "commercePlanSha256",
      "observedCommerceSnapshotSha256",
      "postCommerceEnvelopeSha256",
      "priceAuthoritySha256",
      "sourceInventoryEnvelopeSha256",
    ],
    "catalog bundle bootstrap"
  )
  if (
    bundleValue.manifestSha256 !== sha256(stableDemoJson(manifest.value)) ||
    bundleValue.demoOmissionLedgerSha256 !==
      sha256(stableDemoJson(omissionLedger.value)) ||
    canonicalJson(bundleValue.manifest) !== canonicalJson(manifest.value) ||
    canonicalJson(bundleValue.demoOmissionLedger) !==
      canonicalJson(omissionLedger.value) ||
    bootstrap.sourceInventoryEnvelopeSha256 !==
      receipt.preCommerce.inventoryEnvelope.sha256 ||
    bootstrap.priceAuthoritySha256 !==
      receipt.preCommerce.priceAuthority.sha256 ||
    bootstrap.commercePlanSha256 !== receipt.postCommerce.commercePlanHash ||
    bootstrap.postCommerceEnvelopeSha256 !==
      receipt.postCommerce.envelope.sha256 ||
    bootstrap.observedCommerceSnapshotSha256 !==
      receipt.postCommerce.observedCommerceSnapshotSha256
  ) {
    throw new Error("cutover: catalog bundle references do not match artifacts")
  }
  const parsedImportPlan = parseRoCatalogScopePlanArtifact(importPlan.value)
  if (
    parsedImportPlan.planHash !== receipt.catalog.importPlan.planHash ||
    parsedImportPlan.hash !== receipt.catalog.importPlan.scopeSha256
  ) {
    throw new Error("cutover: importer plan semantics do not match receipt")
  }
  for (const [label, artifact] of [
    ["static taxonomy convergence proof", staticTaxonomyArtifact],
    ["maintenance proof", maintenanceArtifact],
    ["URLR convergence proof", urlRegistryArtifact],
    ["Meilisearch convergence proof", meilisearchArtifact],
  ]) {
    if (
      artifact.bytes.toString("utf8") !== `${canonicalJson(artifact.value)}\n`
    ) {
      throw new Error(`cutover: ${label} bytes are not canonical JSON plus LF`)
    }
  }
  const maintenanceProof = validateMaintenanceProof(
    maintenanceArtifact.value,
    receipt.releaseIdentity,
    receipt.releaseId
  )
  validateStaticTaxonomyProof(staticTaxonomyArtifact.value, receipt)
  const urlRegistryProof = validateUrlRegistryProof(urlRegistryArtifact.value, {
    catalogScopeSha256: parsedImportPlan.hash,
    releaseId: receipt.releaseId,
    staticTaxonomyConvergenceSha256:
      receipt.artifacts.staticTaxonomyConvergence.sha256,
  })
  const meilisearchProof = validateMeilisearchProof(meilisearchArtifact.value, {
    catalogScopeSha256: parsedImportPlan.hash,
    releaseId: receipt.releaseId,
    releaseIdentity: receipt.releaseIdentity,
    scopePlan: parsedImportPlan,
    urlRegistryProof,
  })
  if (
    timestampValue(
      maintenanceProof.preReleaseProbe.checkedAt,
      "maintenance preReleaseProbe.checkedAt"
    ) < timestampValue(meilisearchProof.generatedAt, "Meilisearch generatedAt")
  ) {
    throw new Error("cutover: RO maintenance was not held through convergence")
  }
  const cutoverChainProof = {
    catalogPlanHash: parsedImportPlan.planHash,
    commercePlanSha256: receipt.postCommerce.commercePlanHash,
    maintenanceProofSha256: receipt.operations.maintenance.sha256,
    matched: true,
    meilisearchConvergenceSha256:
      receipt.operations.meilisearchConvergence.sha256,
    postCommerceEnvelopeSha256: receipt.postCommerce.envelope.sha256,
    receiptSha256: cutoverReceiptSha256(receipt),
    releaseId: receipt.releaseId,
    schemaVersion: 1,
    scopeSha256: parsedImportPlan.hash,
    staticTaxonomyConvergenceSha256:
      receipt.artifacts.staticTaxonomyConvergence.sha256,
    urlRegistryConvergenceSha256:
      receipt.operations.urlRegistryConvergence.sha256,
  }
  return {
    cutoverChainProof,
    importPlanArtifact: importPlan.value,
    receipt,
  }
}
