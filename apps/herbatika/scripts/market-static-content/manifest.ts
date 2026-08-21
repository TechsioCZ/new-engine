import {
  assertStaticContentExactKeys,
  parseStaticContentJson,
  STATIC_CONTENT_ID,
  staticContentRecord,
  staticContentSha256,
  staticContentText,
  staticContentTimestamp,
} from "./primitives"
import {
  type MarketStaticContentAggregateRefs,
  type MarketStaticContentSourceManifest,
  OPERATOR_CONTACT_FIELDS,
  type OperatorContactAuthority,
  type SegmentRegistryAuthority,
  STATIC_CONTENT_KINDS,
  STATIC_CONTENT_LOCALE_BY_MARKET,
  STATIC_CONTENT_MARKETS,
  type StaticContentApproval,
  type StaticContentKind,
  type StaticContentMarket,
  type StaticContentSourceEntry,
} from "./types"

const SOURCE_HOST_SUFFIX: Readonly<Record<StaticContentMarket, string>> = {
  cz: "herbatica.cz",
  hu: "herbatica.hu",
  ro: "herbatica.ro",
  sk: "herbatica.sk",
}
const SINGLETON_KINDS = new Set<StaticContentKind>([
  "about",
  "faq",
  "footer",
  "operator-identity",
])
const FORBIDDEN_AUTHORITY_TEXT = /demo-generated|unreviewed|unapproved/i

type ApprovalContext = Readonly<{
  artifactSha256: string
  entryId: string
  label: string
  market: StaticContentMarket
  role: "editorial" | "legal"
  sourceSnapshotSha256: string
}>

const parseApproval = (
  value: unknown,
  context: ApprovalContext
): StaticContentApproval => {
  const { artifactSha256, entryId, label, market, role, sourceSnapshotSha256 } =
    context
  const approval = staticContentRecord(value, label)
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
    label
  )
  if (approval.status !== "approved") {
    throw new Error(`${label}.status must be approved`)
  }
  const approvalArtifact = staticContentRecord(
    approval.approvalArtifact,
    `${label}.approvalArtifact`
  )
  assertStaticContentExactKeys(
    approvalArtifact,
    ["kind", "mediaType", "ref", "sha256"],
    `${label}.approvalArtifact`
  )
  const expectedKind = `market-static-content-${role}-approval` as const
  if (
    approvalArtifact.kind !== expectedKind ||
    approvalArtifact.mediaType !== "application/json"
  ) {
    throw new Error(`${label}.approvalArtifact identity is invalid`)
  }
  const parsedApprovalArtifact = {
    kind: expectedKind,
    mediaType: "application/json" as const,
    ref: staticContentText(
      approvalArtifact.ref,
      `${label}.approvalArtifact.ref`
    ),
    sha256: staticContentSha256(
      approvalArtifact.sha256,
      `${label}.approvalArtifact.sha256`
    ),
  }
  if (
    parsedApprovalArtifact.ref !==
    `market-static-content/${market}/approvals/${role}/${entryId}.json`
  ) {
    throw new Error(`${label}.approvalArtifact.ref is not market-bound`)
  }
  const parsed = {
    approvalArtifact: parsedApprovalArtifact,
    approvedAt: staticContentTimestamp(
      approval.approvedAt,
      `${label}.approvedAt`
    ),
    approvedBy: staticContentText(approval.approvedBy, `${label}.approvedBy`),
    artifactSha256: staticContentSha256(
      approval.artifactSha256,
      `${label}.artifactSha256`
    ),
    reference: staticContentText(approval.reference, `${label}.reference`),
    sourceSnapshotSha256: staticContentSha256(
      approval.sourceSnapshotSha256,
      `${label}.sourceSnapshotSha256`
    ),
    status: "approved" as const,
  }
  if (!parsed.reference.startsWith(`${market.toUpperCase()}-`)) {
    throw new Error(`${label}.reference is not bound to market ${market}`)
  }
  if (
    parsed.artifactSha256 !== artifactSha256 ||
    parsed.sourceSnapshotSha256 !== sourceSnapshotSha256
  ) {
    throw new Error(`${label} is not hash-bound to the reviewed entry`)
  }
  return parsed
}

const parseEntry = (
  value: unknown,
  index: number,
  market: StaticContentMarket,
  capturedAt: string
): StaticContentSourceEntry => {
  const label = `entries[${index}]`
  const entry = staticContentRecord(value, label)
  assertStaticContentExactKeys(
    entry,
    ["approvals", "artifact", "contentKind", "id", "provenance", "source"],
    label
  )
  if (entry.provenance !== "reviewed-official-source") {
    throw new Error(`${label}.provenance is not reviewed official source`)
  }
  if (!STATIC_CONTENT_KINDS.includes(entry.contentKind as StaticContentKind)) {
    throw new Error(`${label}.contentKind is invalid`)
  }
  const contentKind = entry.contentKind as StaticContentKind
  const id = staticContentText(entry.id, `${label}.id`)
  if (!STATIC_CONTENT_ID.test(id)) {
    throw new Error(`${label}.id is invalid`)
  }
  const artifact = staticContentRecord(entry.artifact, `${label}.artifact`)
  assertStaticContentExactKeys(
    artifact,
    ["kind", "mediaType", "ref", "sha256"],
    `${label}.artifact`
  )
  if (
    artifact.kind !== "market-static-content" ||
    artifact.mediaType !== "application/json"
  ) {
    throw new Error(`${label}.artifact identity is invalid`)
  }
  const parsedArtifact = {
    kind: "market-static-content" as const,
    mediaType: "application/json" as const,
    ref: staticContentText(artifact.ref, `${label}.artifact.ref`),
    sha256: staticContentSha256(artifact.sha256, `${label}.artifact.sha256`),
  }
  if (parsedArtifact.ref !== `market-static-content/${market}/${id}.json`) {
    throw new Error(`${label}.artifact.ref is not bound to market and id`)
  }
  const source = staticContentRecord(entry.source, `${label}.source`)
  assertStaticContentExactKeys(
    source,
    ["rawSnapshotSha256", "retrievedAt", "url"],
    `${label}.source`
  )
  const urlText = staticContentText(source.url, `${label}.source.url`)
  let url: URL
  try {
    url = new URL(urlText)
  } catch {
    throw new Error(`${label}.source.url is not a valid URL`)
  }
  const hostSuffix = SOURCE_HOST_SUFFIX[market]
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !(url.hostname === hostSuffix || url.hostname.endsWith(`.${hostSuffix}`))
  ) {
    throw new Error(`${label}.source.url is not an official ${market} source`)
  }
  const parsedSource = {
    rawSnapshotSha256: staticContentSha256(
      source.rawSnapshotSha256,
      `${label}.source.rawSnapshotSha256`
    ),
    retrievedAt: staticContentTimestamp(
      source.retrievedAt,
      `${label}.source.retrievedAt`
    ),
    url: urlText,
  }
  if (parsedSource.retrievedAt > capturedAt) {
    throw new Error(`${label}.source was retrieved after manifest capture`)
  }
  const approvals = staticContentRecord(entry.approvals, `${label}.approvals`)
  assertStaticContentExactKeys(
    approvals,
    ["editorial", "legal"],
    `${label}.approvals`
  )
  const editorial = parseApproval(approvals.editorial, {
    artifactSha256: parsedArtifact.sha256,
    entryId: id,
    label: `${label}.approvals.editorial`,
    market,
    role: "editorial",
    sourceSnapshotSha256: parsedSource.rawSnapshotSha256,
  })
  const legal = parseApproval(approvals.legal, {
    artifactSha256: parsedArtifact.sha256,
    entryId: id,
    label: `${label}.approvals.legal`,
    market,
    role: "legal",
    sourceSnapshotSha256: parsedSource.rawSnapshotSha256,
  })
  if (
    editorial.reference === legal.reference ||
    editorial.approvedAt < parsedSource.retrievedAt ||
    legal.approvedAt < parsedSource.retrievedAt ||
    editorial.approvedAt > capturedAt ||
    legal.approvedAt > capturedAt
  ) {
    throw new Error(
      `${label}.approvals are not independent capture-bound reviews`
    )
  }
  return {
    approvals: { editorial, legal },
    artifact: parsedArtifact,
    contentKind,
    id,
    provenance: "reviewed-official-source",
    source: parsedSource,
  }
}

type OperatorAuthorityContext = Readonly<{
  entries: readonly StaticContentSourceEntry[]
  label: string
  market: StaticContentMarket
}>

const parseOperatorContactAuthority = (
  value: unknown,
  context: OperatorAuthorityContext
): OperatorContactAuthority => {
  const { entries, label, market } = context
  const authority = staticContentRecord(value, label)
  assertStaticContentExactKeys(
    authority,
    [
      "editorialApprovalReference",
      "entryId",
      "fieldCoverage",
      "legalApprovalReference",
      "market",
    ],
    label
  )
  if (authority.market !== market) {
    throw new Error(`${label}.market does not match manifest market`)
  }
  const entryId = staticContentText(authority.entryId, `${label}.entryId`)
  const operatorEntry = entries.find(
    (entry) => entry.id === entryId && entry.contentKind === "operator-identity"
  )
  if (!operatorEntry) {
    throw new Error(`${label}.entryId does not identify operator authority`)
  }
  const coverage = staticContentRecord(
    authority.fieldCoverage,
    `${label}.fieldCoverage`
  )
  assertStaticContentExactKeys(
    coverage,
    OPERATOR_CONTACT_FIELDS,
    `${label}.fieldCoverage`
  )
  for (const field of OPERATOR_CONTACT_FIELDS) {
    if (coverage[field] !== "approved") {
      throw new Error(`${label}.fieldCoverage.${field} must be approved`)
    }
  }
  const editorialApprovalReference = staticContentText(
    authority.editorialApprovalReference,
    `${label}.editorialApprovalReference`
  )
  const legalApprovalReference = staticContentText(
    authority.legalApprovalReference,
    `${label}.legalApprovalReference`
  )
  if (
    editorialApprovalReference !==
      operatorEntry.approvals.editorial.reference ||
    legalApprovalReference !== operatorEntry.approvals.legal.reference
  ) {
    throw new Error(`${label} is not bound to operator approval references`)
  }
  return {
    editorialApprovalReference,
    entryId,
    fieldCoverage: {
      email: "approved",
      "legal-entity": "approved",
      phone: "approved",
      "social-ids": "approved",
      "support-origin": "approved",
    },
    legalApprovalReference,
    market,
  }
}

const parseSegmentRegistry = (
  value: unknown,
  label: string
): SegmentRegistryAuthority => {
  const registry = staticContentRecord(value, label)
  assertStaticContentExactKeys(registry, ["kind", "ref", "sha256"], label)
  if (
    registry.kind !== "market-route-segment-registry" ||
    registry.ref !== "market-static-content/shared/segment-registry.json"
  ) {
    throw new Error(`${label} identity is invalid`)
  }
  return {
    kind: "market-route-segment-registry",
    ref: "market-static-content/shared/segment-registry.json",
    sha256: staticContentSha256(registry.sha256, `${label}.sha256`),
  }
}

const parseMarketArtifacts = (
  value: unknown,
  market: StaticContentMarket,
  label: string
): MarketStaticContentAggregateRefs => {
  const artifacts = staticContentRecord(value, label)
  assertStaticContentExactKeys(
    artifacts,
    ["editorialApproval", "legalApproval", "staticContent"],
    label
  )
  const parseRef = <
    Kind extends
      MarketStaticContentAggregateRefs[keyof MarketStaticContentAggregateRefs]["kind"],
  >(
    key: keyof MarketStaticContentAggregateRefs,
    kind: Kind,
    ref: string
  ): Readonly<{
    kind: Kind
    mediaType: "application/json"
    ref: string
    sha256: string
  }> => {
    const item = staticContentRecord(artifacts[key], `${label}.${key}`)
    assertStaticContentExactKeys(
      item,
      ["kind", "mediaType", "ref", "sha256"],
      `${label}.${key}`
    )
    if (
      item.kind !== kind ||
      item.mediaType !== "application/json" ||
      item.ref !== ref
    ) {
      throw new Error(`${label}.${key} identity is invalid`)
    }
    return {
      kind,
      mediaType: "application/json" as const,
      ref,
      sha256: staticContentSha256(item.sha256, `${label}.${key}.sha256`),
    }
  }
  return {
    editorialApproval: parseRef(
      "editorialApproval",
      "market-static-content-editorial-approval-collection",
      `market-static-content/${market}/approvals/editorial.json`
    ),
    legalApproval: parseRef(
      "legalApproval",
      "market-static-content-legal-approval-collection",
      `market-static-content/${market}/approvals/legal.json`
    ),
    staticContent: parseRef(
      "staticContent",
      "market-static-content-collection",
      `market-static-content/${market}/static-content.json`
    ),
  }
}

export const parseMarketStaticContentManifest = (
  contents: string,
  label = "market static-content manifest"
): MarketStaticContentSourceManifest => {
  const raw = parseStaticContentJson(contents, label)
  if (FORBIDDEN_AUTHORITY_TEXT.test(JSON.stringify(raw))) {
    throw new Error(`${label} contains demo-generated or unreviewed authority`)
  }
  const manifest = staticContentRecord(raw, label)
  assertStaticContentExactKeys(
    manifest,
    [
      "authorization",
      "capturedAt",
      "entries",
      "kind",
      "locale",
      "market",
      "marketArtifacts",
      "operatorContactAuthority",
      "provenance",
      "schemaVersion",
      "segmentRegistry",
    ],
    label
  )
  if (
    manifest.schemaVersion !== 1 ||
    manifest.kind !== "market-static-content-source-manifest" ||
    manifest.authorization !== "customer-reviewed-static-content" ||
    manifest.provenance !== "reviewed-official-source" ||
    !STATIC_CONTENT_MARKETS.includes(manifest.market as StaticContentMarket)
  ) {
    throw new Error(`${label} identity is invalid`)
  }
  const market = manifest.market as StaticContentMarket
  const locale = STATIC_CONTENT_LOCALE_BY_MARKET[market]
  if (manifest.locale !== locale) {
    throw new Error(`${label}.locale does not match market ${market}`)
  }
  const capturedAt = staticContentTimestamp(
    manifest.capturedAt,
    `${label}.capturedAt`
  )
  const segmentRegistry = parseSegmentRegistry(
    manifest.segmentRegistry,
    `${label}.segmentRegistry`
  )
  const marketArtifacts = parseMarketArtifacts(
    manifest.marketArtifacts,
    market,
    `${label}.marketArtifacts`
  )
  if (!Array.isArray(manifest.entries)) {
    throw new Error(`${label}.entries must be an array`)
  }
  const entries = manifest.entries
    .map((entry, index) => parseEntry(entry, index, market, capturedAt))
    .sort((left, right) => left.id.localeCompare(right.id, "en"))
  const ids = new Set(entries.map(({ id }) => id))
  if (ids.size !== entries.length) {
    throw new Error(`${label} contains duplicate entry ids`)
  }
  for (const contentKind of STATIC_CONTENT_KINDS) {
    const count = entries.filter(
      (entry) => entry.contentKind === contentKind
    ).length
    if (count === 0 || (SINGLETON_KINDS.has(contentKind) && count !== 1)) {
      throw new Error(`${label} has invalid ${contentKind} coverage`)
    }
  }
  const operatorContactAuthority = parseOperatorContactAuthority(
    manifest.operatorContactAuthority,
    {
      entries,
      label: `${label}.operatorContactAuthority`,
      market,
    }
  )
  return {
    authorization: "customer-reviewed-static-content",
    capturedAt,
    entries,
    kind: "market-static-content-source-manifest",
    locale,
    market,
    marketArtifacts,
    operatorContactAuthority,
    provenance: "reviewed-official-source",
    schemaVersion: 1,
    segmentRegistry,
  }
}
