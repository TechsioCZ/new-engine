import {
  assertStaticContentExactKeys,
  canonicalStaticContentJson,
  parseStaticContentJson,
  staticContentRecord,
  staticContentSha256,
  staticContentText,
  staticContentTimestamp,
} from "./primitives"
import {
  type MarketStaticContentApprovalArtifact,
  type MarketStaticContentApprovalCollectionArtifact,
  type MarketStaticContentArtifact,
  type MarketStaticContentCollectionArtifact,
  STATIC_CONTENT_KINDS,
  STATIC_CONTENT_LOCALE_BY_MARKET,
  STATIC_CONTENT_MARKETS,
  STATIC_CONTENT_POLICY_VERSIONS,
  type StaticContentKind,
  type StaticContentMarket,
} from "./types"

const SINGLETON_KINDS = new Set<StaticContentKind>([
  "about",
  "faq",
  "footer",
  "homepage-hero",
  "operator-identity",
])
const FORBIDDEN_AUTHORITY_TEXT = /demo-generated|unreviewed|unapproved/i

const SOURCE_HOST_SUFFIX: Readonly<Record<StaticContentMarket, string>> = {
  cz: "herbatica.cz",
  hu: "herbatica.hu",
  ro: "herbatica.ro",
  sk: "herbatica.sk",
}

const parseOfficialSourceUrl = (
  value: unknown,
  market: StaticContentMarket,
  label: string
): string => {
  const text = staticContentText(value, label)
  let url: URL
  try {
    url = new URL(text)
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
  return text
}

const parseIdentity = (value: Record<string, unknown>, label: string) => {
  if (!STATIC_CONTENT_MARKETS.includes(value.market as StaticContentMarket)) {
    throw new Error(`${label}.market is invalid`)
  }
  const market = value.market as StaticContentMarket
  if (value.locale !== STATIC_CONTENT_LOCALE_BY_MARKET[market]) {
    throw new Error(`${label}.locale does not match market ${market}`)
  }
  if (!STATIC_CONTENT_KINDS.includes(value.contentKind as StaticContentKind)) {
    throw new Error(`${label}.contentKind is invalid`)
  }
  return {
    contentKind: value.contentKind as StaticContentKind,
    entryId: staticContentText(value.entryId, `${label}.entryId`),
    locale: STATIC_CONTENT_LOCALE_BY_MARKET[market],
    market,
  }
}

const requireCanonicalArtifact = (contents: string, label: string) => {
  const raw = parseStaticContentJson(contents, label)
  if (FORBIDDEN_AUTHORITY_TEXT.test(JSON.stringify(raw))) {
    throw new Error(`${label} contains demo-generated or unreviewed authority`)
  }
  if (canonicalStaticContentJson(raw) !== contents) {
    throw new Error(`${label} is not canonical JSON with a trailing newline`)
  }
  return staticContentRecord(raw, label)
}

export const parseMarketStaticContentArtifact = (
  contents: string,
  label = "market static-content artifact"
): MarketStaticContentArtifact => {
  const artifact = requireCanonicalArtifact(contents, label)
  assertStaticContentExactKeys(
    artifact,
    [
      "contentKind",
      "entryId",
      "kind",
      "locale",
      "market",
      "payload",
      "policyVersions",
      "provenance",
      "schemaVersion",
      "segmentRegistrySha256",
      "source",
    ],
    label
  )
  if (
    artifact.schemaVersion !== 1 ||
    artifact.kind !== "market-static-content" ||
    artifact.provenance !== "reviewed-official-source"
  ) {
    throw new Error(`${label} identity is invalid`)
  }
  const identity = parseIdentity(artifact, label)
  const payload = staticContentRecord(artifact.payload, `${label}.payload`)
  assertStaticContentExactKeys(
    payload,
    ["kind", "mediaType", "ref", "sha256"],
    `${label}.payload`
  )
  const expectedPayloadRef = `market-static-content/${identity.market}/payload/${identity.entryId}.json`
  if (
    payload.kind !== "market-static-content-reviewed-payload" ||
    payload.mediaType !== "application/json" ||
    payload.ref !== expectedPayloadRef
  ) {
    throw new Error(`${label}.payload identity is invalid`)
  }
  const source = staticContentRecord(artifact.source, `${label}.source`)
  assertStaticContentExactKeys(
    source,
    ["rawSnapshotSha256", "retrievedAt", "url"],
    `${label}.source`
  )
  const policyVersions = parsePolicyVersions(
    artifact.policyVersions,
    `${label}.policyVersions`
  )
  return {
    ...identity,
    kind: "market-static-content",
    payload: {
      kind: "market-static-content-reviewed-payload",
      mediaType: "application/json",
      ref: expectedPayloadRef,
      sha256: staticContentSha256(payload.sha256, `${label}.payload.sha256`),
    },
    policyVersions,
    provenance: "reviewed-official-source",
    schemaVersion: 1,
    segmentRegistrySha256: staticContentSha256(
      artifact.segmentRegistrySha256,
      `${label}.segmentRegistrySha256`
    ),
    source: {
      rawSnapshotSha256: staticContentSha256(
        source.rawSnapshotSha256,
        `${label}.source.rawSnapshotSha256`
      ),
      retrievedAt: staticContentTimestamp(
        source.retrievedAt,
        `${label}.source.retrievedAt`
      ),
      url: parseOfficialSourceUrl(
        source.url,
        identity.market,
        `${label}.source.url`
      ),
    },
  }
}

export const parseMarketStaticContentApprovalArtifact = (
  contents: string,
  role: "editorial" | "legal",
  label = `market static-content ${role} approval`
): MarketStaticContentApprovalArtifact => {
  const approval = requireCanonicalArtifact(contents, label)
  assertStaticContentExactKeys(
    approval,
    [
      "approvedAt",
      "approvedBy",
      "contentKind",
      "entryId",
      "kind",
      "locale",
      "market",
      "reference",
      "schemaVersion",
      "status",
      "subject",
    ],
    label
  )
  const expectedKind = `market-static-content-${role}-approval` as const
  if (
    approval.schemaVersion !== 1 ||
    approval.kind !== expectedKind ||
    approval.status !== "approved"
  ) {
    throw new Error(`${label} identity is invalid`)
  }
  const identity = parseIdentity(approval, label)
  const subject = staticContentRecord(approval.subject, `${label}.subject`)
  assertStaticContentExactKeys(
    subject,
    [
      "segmentRegistrySha256",
      "policyVersions",
      "sourceSnapshotSha256",
      "staticContentArtifactRef",
      "staticContentArtifactSha256",
    ],
    `${label}.subject`
  )
  const expectedRef = `market-static-content/${identity.market}/${identity.entryId}.json`
  if (subject.staticContentArtifactRef !== expectedRef) {
    throw new Error(`${label}.subject.staticContentArtifactRef is invalid`)
  }
  const reference = staticContentText(approval.reference, `${label}.reference`)
  if (!reference.startsWith(`${identity.market.toUpperCase()}-`)) {
    throw new Error(`${label}.reference is not market-bound`)
  }
  return {
    approvedAt: staticContentTimestamp(
      approval.approvedAt,
      `${label}.approvedAt`
    ),
    approvedBy: staticContentText(approval.approvedBy, `${label}.approvedBy`),
    ...identity,
    kind: expectedKind,
    reference,
    schemaVersion: 1,
    status: "approved",
    subject: {
      policyVersions: parsePolicyVersions(
        subject.policyVersions,
        `${label}.subject.policyVersions`
      ),
      segmentRegistrySha256: staticContentSha256(
        subject.segmentRegistrySha256,
        `${label}.subject.segmentRegistrySha256`
      ),
      sourceSnapshotSha256: staticContentSha256(
        subject.sourceSnapshotSha256,
        `${label}.subject.sourceSnapshotSha256`
      ),
      staticContentArtifactRef: expectedRef,
      staticContentArtifactSha256: staticContentSha256(
        subject.staticContentArtifactSha256,
        `${label}.subject.staticContentArtifactSha256`
      ),
    },
  }
}

const parsePolicyVersions = (
  value: unknown,
  label: string
): typeof STATIC_CONTENT_POLICY_VERSIONS => {
  const versions = staticContentRecord(value, label)
  assertStaticContentExactKeys(
    versions,
    ["checkoutConsent", "registrationTerms"],
    label
  )
  if (
    versions.checkoutConsent !==
      STATIC_CONTENT_POLICY_VERSIONS.checkoutConsent ||
    versions.registrationTerms !==
      STATIC_CONTENT_POLICY_VERSIONS.registrationTerms
  ) {
    throw new Error(`${label} does not match frozen runtime policy versions`)
  }
  return STATIC_CONTENT_POLICY_VERSIONS
}

const parseCollectionRoot = (
  contents: string,
  expectedKind:
    | "market-static-content-collection"
    | "market-static-content-editorial-approval-collection"
    | "market-static-content-legal-approval-collection",
  label: string
) => {
  const collection = requireCanonicalArtifact(contents, label)
  assertStaticContentExactKeys(
    collection,
    [
      "entries",
      "kind",
      "locale",
      "market",
      "policyVersions",
      "ready",
      "schemaVersion",
      "segmentRegistrySha256",
    ],
    label
  )
  if (
    collection.schemaVersion !== 1 ||
    collection.kind !== expectedKind ||
    collection.ready !== true ||
    !Array.isArray(collection.entries)
  ) {
    throw new Error(`${label} identity is invalid`)
  }
  const identity = parseIdentity(
    { ...collection, contentKind: "cms-static", entryId: "collection" },
    label
  )
  return {
    entries: collection.entries,
    locale: identity.locale,
    market: identity.market,
    policyVersions: parsePolicyVersions(
      collection.policyVersions,
      `${label}.policyVersions`
    ),
    segmentRegistrySha256: staticContentSha256(
      collection.segmentRegistrySha256,
      `${label}.segmentRegistrySha256`
    ),
  }
}

const assertSortedExhaustiveEntries = (
  entries: readonly Readonly<{
    contentKind: StaticContentKind
    entryId: string
  }>[],
  label: string
) => {
  const keys = entries.map(
    ({ contentKind, entryId }) => `${contentKind}:${entryId}`
  )
  if (
    new Set(keys).size !== keys.length ||
    keys.some(
      (key, index) => index > 0 && keys[index - 1].localeCompare(key, "en") >= 0
    )
  ) {
    throw new Error(`${label} entries are not unique and sorted`)
  }
  for (const contentKind of STATIC_CONTENT_KINDS) {
    const count = entries.filter(
      (entry) => entry.contentKind === contentKind
    ).length
    if (count < 1 || (SINGLETON_KINDS.has(contentKind) && count !== 1)) {
      throw new Error(`${label} has invalid ${contentKind} coverage`)
    }
  }
}

export const parseMarketStaticContentCollectionArtifact = (
  contents: string,
  label = "market static-content collection"
): MarketStaticContentCollectionArtifact => {
  const root = parseCollectionRoot(
    contents,
    "market-static-content-collection",
    label
  )
  const entries = root.entries.map((value, index) => {
    const itemLabel = `${label}.entries[${index}]`
    const entry = staticContentRecord(value, itemLabel)
    assertStaticContentExactKeys(
      entry,
      [
        "contentKind",
        "entryId",
        "payloadRef",
        "payloadSha256",
        "ref",
        "sha256",
      ],
      itemLabel
    )
    const identity = parseIdentity(
      { ...entry, locale: root.locale, market: root.market },
      itemLabel
    )
    const expectedRef = `market-static-content/${root.market}/${identity.entryId}.json`
    const expectedPayloadRef = `market-static-content/${root.market}/payload/${identity.entryId}.json`
    if (entry.ref !== expectedRef || entry.payloadRef !== expectedPayloadRef) {
      throw new Error(`${itemLabel} refs are invalid`)
    }
    return {
      contentKind: identity.contentKind,
      entryId: identity.entryId,
      payloadRef: expectedPayloadRef,
      payloadSha256: staticContentSha256(
        entry.payloadSha256,
        `${itemLabel}.payloadSha256`
      ),
      ref: expectedRef,
      sha256: staticContentSha256(entry.sha256, `${itemLabel}.sha256`),
    }
  })
  assertSortedExhaustiveEntries(entries, label)
  return {
    entries,
    kind: "market-static-content-collection",
    locale: root.locale,
    market: root.market,
    policyVersions: root.policyVersions,
    ready: true,
    schemaVersion: 1,
    segmentRegistrySha256: root.segmentRegistrySha256,
  }
}

export const parseMarketStaticContentApprovalCollectionArtifact = (
  contents: string,
  role: "editorial" | "legal",
  label = `market static-content ${role} approval collection`
): MarketStaticContentApprovalCollectionArtifact => {
  const kind = `market-static-content-${role}-approval-collection` as const
  const root = parseCollectionRoot(contents, kind, label)
  const entries = root.entries.map((value, index) => {
    const itemLabel = `${label}.entries[${index}]`
    const entry = staticContentRecord(value, itemLabel)
    assertStaticContentExactKeys(
      entry,
      [
        "contentKind",
        "entryId",
        "ref",
        "sha256",
        "sourceSnapshotSha256",
        "staticContentArtifactRef",
        "staticContentArtifactSha256",
      ],
      itemLabel
    )
    const identity = parseIdentity(
      { ...entry, locale: root.locale, market: root.market },
      itemLabel
    )
    const expectedRef = `market-static-content/${root.market}/approvals/${role}/${identity.entryId}.json`
    const expectedStaticRef = `market-static-content/${root.market}/${identity.entryId}.json`
    if (
      entry.ref !== expectedRef ||
      entry.staticContentArtifactRef !== expectedStaticRef
    ) {
      throw new Error(`${itemLabel} refs are invalid`)
    }
    return {
      contentKind: identity.contentKind,
      entryId: identity.entryId,
      ref: expectedRef,
      sha256: staticContentSha256(entry.sha256, `${itemLabel}.sha256`),
      sourceSnapshotSha256: staticContentSha256(
        entry.sourceSnapshotSha256,
        `${itemLabel}.sourceSnapshotSha256`
      ),
      staticContentArtifactRef: expectedStaticRef,
      staticContentArtifactSha256: staticContentSha256(
        entry.staticContentArtifactSha256,
        `${itemLabel}.staticContentArtifactSha256`
      ),
    }
  })
  assertSortedExhaustiveEntries(entries, label)
  return {
    entries,
    kind,
    locale: root.locale,
    market: root.market,
    policyVersions: root.policyVersions,
    ready: true,
    schemaVersion: 1,
    segmentRegistrySha256: root.segmentRegistrySha256,
  }
}
