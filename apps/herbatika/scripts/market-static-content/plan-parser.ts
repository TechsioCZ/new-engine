import {
  assertStaticContentExactKeys,
  canonicalStaticContentJson,
  hashStaticContentBytes,
  parseStaticContentJson,
  staticContentRecord,
  staticContentSha256,
  staticContentText,
  staticContentTimestamp,
} from "./primitives"
import {
  type MarketStaticContentPlan,
  OPERATOR_CONTACT_FIELDS,
  STATIC_CONTENT_KINDS,
  STATIC_CONTENT_LOCALE_BY_MARKET,
  STATIC_CONTENT_MARKETS,
  type StaticContentKind,
  type StaticContentMarket,
} from "./types"

export type ParsedMarketStaticContentPlan = Readonly<{
  plan: MarketStaticContentPlan
  sha256: string
}>

const SOURCE_HOST_SUFFIX: Readonly<Record<StaticContentMarket, string>> = {
  cz: "herbatica.cz",
  hu: "herbatica.hu",
  ro: "herbatica.ro",
  sk: "herbatica.sk",
}
const FORBIDDEN_AUTHORITY_TEXT = /demo-generated|unreviewed|unapproved/i

const validateOfficialUrl = (
  value: unknown,
  market: StaticContentMarket,
  label: string
) => {
  const urlText = staticContentText(value, label)
  let url: URL
  try {
    url = new URL(urlText)
  } catch {
    throw new Error(`${label} is not a valid URL`)
  }
  const suffix = SOURCE_HOST_SUFFIX[market]
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !(url.hostname === suffix || url.hostname.endsWith(`.${suffix}`))
  ) {
    throw new Error(`${label} is not an official ${market} source`)
  }
}

const validateApproval = (
  value: unknown,
  context: Readonly<{
    artifactSha256: string
    entryId: string
    label: string
    market: StaticContentMarket
    role: "editorial" | "legal"
    sourceSnapshotSha256: string
  }>
) => {
  const approval = staticContentRecord(value, context.label)
  assertStaticContentExactKeys(
    approval,
    [
      "approvalArtifact",
      "approvedAt",
      "approvedBy",
      "artifactSha256",
      "reference",
      "sourceSnapshotSha256",
      "status",
    ],
    context.label
  )
  const artifact = staticContentRecord(
    approval.approvalArtifact,
    `${context.label}.approvalArtifact`
  )
  assertStaticContentExactKeys(
    artifact,
    ["kind", "mediaType", "ref", "sha256"],
    `${context.label}.approvalArtifact`
  )
  const expectedKind = `market-static-content-${context.role}-approval`
  const expectedRef = `market-static-content/${context.market}/approvals/${context.role}/${context.entryId}.json`
  if (
    artifact.kind !== expectedKind ||
    artifact.mediaType !== "application/json" ||
    artifact.ref !== expectedRef ||
    approval.status !== "approved"
  ) {
    throw new Error(`${context.label} identity is invalid`)
  }
  staticContentSha256(
    artifact.sha256,
    `${context.label}.approvalArtifact.sha256`
  )
  staticContentTimestamp(approval.approvedAt, `${context.label}.approvedAt`)
  staticContentText(approval.approvedBy, `${context.label}.approvedBy`)
  const artifactSha256 = staticContentSha256(
    approval.artifactSha256,
    `${context.label}.artifactSha256`
  )
  const reference = staticContentText(
    approval.reference,
    `${context.label}.reference`
  )
  const snapshotSha256 = staticContentSha256(
    approval.sourceSnapshotSha256,
    `${context.label}.sourceSnapshotSha256`
  )
  if (
    artifactSha256 !== context.artifactSha256 ||
    snapshotSha256 !== context.sourceSnapshotSha256 ||
    !reference.startsWith(`${context.market.toUpperCase()}-`)
  ) {
    throw new Error(`${context.label} is not market and hash-bound`)
  }
}

const validateOperation = (value: unknown, index: number) => {
  const label = `plan.operations[${index}]`
  const operation = staticContentRecord(value, label)
  assertStaticContentExactKeys(
    operation,
    [
      "approvals",
      "artifact",
      "contentKind",
      "entityKey",
      "locale",
      "market",
      "ready",
      "source",
    ],
    label
  )
  if (
    !STATIC_CONTENT_MARKETS.includes(operation.market as StaticContentMarket)
  ) {
    throw new Error(`${label}.market is invalid`)
  }
  const market = operation.market as StaticContentMarket
  if (
    operation.locale !== STATIC_CONTENT_LOCALE_BY_MARKET[market] ||
    operation.ready !== true ||
    !STATIC_CONTENT_KINDS.includes(operation.contentKind as StaticContentKind)
  ) {
    throw new Error(`${label} is not ready for its market and locale`)
  }
  const contentKind = operation.contentKind as StaticContentKind
  const entityKey = staticContentText(operation.entityKey, `${label}.entityKey`)
  const prefix = `${market}:${contentKind}:`
  if (!entityKey.startsWith(prefix)) {
    throw new Error(`${label}.entityKey is invalid`)
  }
  const entryId = entityKey.slice(prefix.length)
  const artifact = staticContentRecord(operation.artifact, `${label}.artifact`)
  assertStaticContentExactKeys(
    artifact,
    ["kind", "mediaType", "ref", "sha256"],
    `${label}.artifact`
  )
  const artifactSha256 = staticContentSha256(
    artifact.sha256,
    `${label}.artifact.sha256`
  )
  if (
    artifact.kind !== "market-static-content" ||
    artifact.mediaType !== "application/json" ||
    artifact.ref !== `market-static-content/${market}/${entryId}.json`
  ) {
    throw new Error(`${label}.artifact identity is invalid`)
  }
  const source = staticContentRecord(operation.source, `${label}.source`)
  assertStaticContentExactKeys(
    source,
    ["rawSnapshotSha256", "retrievedAt", "url"],
    `${label}.source`
  )
  const sourceSnapshotSha256 = staticContentSha256(
    source.rawSnapshotSha256,
    `${label}.source.rawSnapshotSha256`
  )
  staticContentTimestamp(source.retrievedAt, `${label}.source.retrievedAt`)
  validateOfficialUrl(source.url, market, `${label}.source.url`)
  const approvals = staticContentRecord(
    operation.approvals,
    `${label}.approvals`
  )
  assertStaticContentExactKeys(
    approvals,
    ["editorial", "legal"],
    `${label}.approvals`
  )
  for (const role of ["editorial", "legal"] as const) {
    validateApproval(approvals[role], {
      artifactSha256,
      entryId,
      label: `${label}.approvals.${role}`,
      market,
      role,
      sourceSnapshotSha256,
    })
  }
}

const validatePlanCoverage = (plan: Record<string, unknown>) => {
  const operations = plan.operations as readonly Record<string, unknown>[]
  const readiness = staticContentRecord(plan.readiness, "plan.readiness")
  assertStaticContentExactKeys(
    readiness,
    ["markets", "ready", "requiredContentKinds"],
    "plan.readiness"
  )
  if (
    readiness.ready !== true ||
    JSON.stringify(readiness.requiredContentKinds) !==
      JSON.stringify(STATIC_CONTENT_KINDS) ||
    !Array.isArray(readiness.markets) ||
    readiness.markets.length !== STATIC_CONTENT_MARKETS.length
  ) {
    throw new Error("plan.readiness is not exhaustive")
  }
  for (const [index, expectedMarket] of STATIC_CONTENT_MARKETS.entries()) {
    const item = staticContentRecord(
      readiness.markets[index],
      `plan.readiness.markets[${index}]`
    )
    assertStaticContentExactKeys(
      item,
      ["counts", "locale", "market", "ready"],
      `plan.readiness.markets[${index}]`
    )
    const counts = staticContentRecord(
      item.counts,
      `plan.readiness.markets[${index}].counts`
    )
    assertStaticContentExactKeys(
      counts,
      STATIC_CONTENT_KINDS,
      "readiness counts"
    )
    if (
      item.market !== expectedMarket ||
      item.locale !== STATIC_CONTENT_LOCALE_BY_MARKET[expectedMarket] ||
      item.ready !== true
    ) {
      throw new Error(`readiness for market ${expectedMarket} is invalid`)
    }
    for (const kind of STATIC_CONTENT_KINDS) {
      const observed = operations.filter(
        (operation) =>
          operation.market === expectedMarket && operation.contentKind === kind
      ).length
      if (counts[kind] !== observed || observed < 1) {
        throw new Error(
          `readiness count for ${expectedMarket}/${kind} is invalid`
        )
      }
    }
  }
}

const validateSourceManifest = (
  value: unknown,
  index: number,
  market: StaticContentMarket,
  operations: readonly Record<string, unknown>[]
): string => {
  const label = `plan.sourceManifests[${index}]`
  const source = staticContentRecord(value, label)
  assertStaticContentExactKeys(
    source,
    [
      "capturedAt",
      "locale",
      "manifestSha256",
      "market",
      "marketArtifacts",
      "operatorContactAuthority",
      "segmentRegistry",
    ],
    label
  )
  if (
    source.market !== market ||
    source.locale !== STATIC_CONTENT_LOCALE_BY_MARKET[market]
  ) {
    throw new Error(`${label} market and locale are invalid`)
  }
  const capturedAt = staticContentTimestamp(
    source.capturedAt,
    `${label}.capturedAt`
  )
  staticContentSha256(source.manifestSha256, `${label}.manifestSha256`)
  validateMarketAggregateRefs(source.marketArtifacts, market, label)
  const registry = staticContentRecord(
    source.segmentRegistry,
    `${label}.segmentRegistry`
  )
  assertStaticContentExactKeys(
    registry,
    ["kind", "ref", "sha256"],
    `${label}.segmentRegistry`
  )
  if (
    registry.kind !== "market-route-segment-registry" ||
    registry.ref !== "market-static-content/shared/segment-registry.json"
  ) {
    throw new Error(`${label}.segmentRegistry identity is invalid`)
  }
  const registrySha256 = staticContentSha256(
    registry.sha256,
    `${label}.segmentRegistry.sha256`
  )
  const authority = staticContentRecord(
    source.operatorContactAuthority,
    `${label}.operatorContactAuthority`
  )
  assertStaticContentExactKeys(
    authority,
    [
      "editorialApprovalReference",
      "entryId",
      "fieldCoverage",
      "legalApprovalReference",
      "market",
    ],
    `${label}.operatorContactAuthority`
  )
  const entryId = staticContentText(
    authority.entryId,
    `${label}.operatorContactAuthority.entryId`
  )
  const operatorOperation = operations.find(
    (candidate) =>
      candidate.entityKey === `${market}:operator-identity:${entryId}`
  )
  const operationApprovals = staticContentRecord(
    operatorOperation?.approvals,
    `${label}.operatorOperation.approvals`
  )
  const editorial = staticContentRecord(
    operationApprovals.editorial,
    `${label}.operatorOperation.approvals.editorial`
  )
  const legal = staticContentRecord(
    operationApprovals.legal,
    `${label}.operatorOperation.approvals.legal`
  )
  if (
    authority.market !== market ||
    authority.editorialApprovalReference !== editorial.reference ||
    authority.legalApprovalReference !== legal.reference
  ) {
    throw new Error(`${label}.operatorContactAuthority is not operation-bound`)
  }
  const coverage = staticContentRecord(
    authority.fieldCoverage,
    `${label}.operatorContactAuthority.fieldCoverage`
  )
  assertStaticContentExactKeys(
    coverage,
    OPERATOR_CONTACT_FIELDS,
    `${label}.operatorContactAuthority.fieldCoverage`
  )
  for (const field of OPERATOR_CONTACT_FIELDS) {
    if (coverage[field] !== "approved") {
      throw new Error(`${label} operator field ${field} is not approved`)
    }
  }
  validateCaptureWindows(operations, market, capturedAt, label)
  return registrySha256
}

const validateMarketAggregateRefs = (
  value: unknown,
  market: StaticContentMarket,
  parentLabel: string
) => {
  const label = `${parentLabel}.marketArtifacts`
  const refs = staticContentRecord(value, label)
  assertStaticContentExactKeys(
    refs,
    ["editorialApproval", "legalApproval", "staticContent"],
    label
  )
  const expected = {
    editorialApproval: {
      kind: "market-static-content-editorial-approval-collection",
      ref: `market-static-content/${market}/approvals/editorial.json`,
    },
    legalApproval: {
      kind: "market-static-content-legal-approval-collection",
      ref: `market-static-content/${market}/approvals/legal.json`,
    },
    staticContent: {
      kind: "market-static-content-collection",
      ref: `market-static-content/${market}/static-content.json`,
    },
  } as const
  for (const key of [
    "editorialApproval",
    "legalApproval",
    "staticContent",
  ] as const) {
    const item = staticContentRecord(refs[key], `${label}.${key}`)
    assertStaticContentExactKeys(
      item,
      ["kind", "mediaType", "ref", "sha256"],
      `${label}.${key}`
    )
    if (
      item.kind !== expected[key].kind ||
      item.mediaType !== "application/json" ||
      item.ref !== expected[key].ref
    ) {
      throw new Error(`${label}.${key} identity is invalid`)
    }
    staticContentSha256(item.sha256, `${label}.${key}.sha256`)
  }
}

const validateCaptureWindows = (
  operations: readonly Record<string, unknown>[],
  market: StaticContentMarket,
  capturedAt: string,
  label: string
) => {
  const marketOperations = operations.filter((item) => item.market === market)
  for (const item of marketOperations) {
    const source = staticContentRecord(item.source, "operation.source")
    const retrievedAt = staticContentTimestamp(
      source.retrievedAt,
      "operation.source.retrievedAt"
    )
    const approvals = staticContentRecord(item.approvals, "operation.approvals")
    for (const role of ["editorial", "legal"] as const) {
      const approval = staticContentRecord(
        approvals[role],
        `operation.approvals.${role}`
      )
      const approvedAt = staticContentTimestamp(
        approval.approvedAt,
        `operation.approvals.${role}.approvedAt`
      )
      if (retrievedAt > approvedAt || approvedAt > capturedAt) {
        throw new Error(`${label} has an approval outside its capture window`)
      }
    }
  }
}

const validateSourceManifests = (plan: Record<string, unknown>) => {
  const manifests = plan.sourceManifests as readonly unknown[]
  const operations = plan.operations as readonly Record<string, unknown>[]
  if (manifests.length !== STATIC_CONTENT_MARKETS.length) {
    throw new Error("plan.sourceManifests is not exhaustive")
  }
  const registryHashes = new Set(
    STATIC_CONTENT_MARKETS.map((market, index) =>
      validateSourceManifest(manifests[index], index, market, operations)
    )
  )
  if (registryHashes.size !== 1) {
    throw new Error("plan.sourceManifests use different segment registries")
  }
}

export const parseMarketStaticContentPlan = (
  contents: string,
  label = "market static-content plan"
): ParsedMarketStaticContentPlan => {
  const raw = parseStaticContentJson(contents, label)
  if (FORBIDDEN_AUTHORITY_TEXT.test(JSON.stringify(raw))) {
    throw new Error(`${label} contains demo-generated or unreviewed authority`)
  }
  if (canonicalStaticContentJson(raw) !== contents) {
    throw new Error(`${label} is not canonical JSON with a trailing newline`)
  }
  const plan = staticContentRecord(raw, label)
  assertStaticContentExactKeys(
    plan,
    [
      "authorization",
      "kind",
      "operations",
      "planSha256",
      "readiness",
      "schemaVersion",
      "sourceManifests",
    ],
    label
  )
  if (
    plan.schemaVersion !== 1 ||
    plan.kind !== "market-static-content-import-readiness-plan" ||
    plan.authorization !== "customer-reviewed-static-content" ||
    !Array.isArray(plan.operations) ||
    !Array.isArray(plan.sourceManifests)
  ) {
    throw new Error(`${label} identity is invalid`)
  }
  const embeddedHash = staticContentSha256(
    plan.planSha256,
    `${label}.planSha256`
  )
  const { planSha256: _ignored, ...withoutPlanHash } = plan
  if (
    embeddedHash !==
    hashStaticContentBytes(canonicalStaticContentJson(withoutPlanHash))
  ) {
    throw new Error(`${label}.planSha256 does not match plan semantics`)
  }
  plan.operations.forEach(validateOperation)
  const keys = plan.operations.map((operation, index) =>
    staticContentText(
      staticContentRecord(operation, `plan.operations[${index}]`).entityKey,
      `plan.operations[${index}].entityKey`
    )
  )
  if (
    new Set(keys).size !== keys.length ||
    keys.some(
      (key, index) => index > 0 && keys[index - 1].localeCompare(key, "en") >= 0
    )
  ) {
    throw new Error(`${label}.operations are not unique and sorted`)
  }
  validatePlanCoverage(plan)
  validateSourceManifests(plan)
  return {
    plan: plan as MarketStaticContentPlan,
    sha256: hashStaticContentBytes(contents),
  }
}
