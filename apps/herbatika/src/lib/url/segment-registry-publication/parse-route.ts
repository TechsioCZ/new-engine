import { LEGAL_STATIC_ROOT_PAGE_KEYS } from "@/lib/url/segments"
import type { Market, StaticRootPageKey } from "@/lib/url/types"
import type {
  PublicationApprovalRef,
  SegmentRegistryPublicationRoute,
} from "./contract"
import {
  publicationExactKeys,
  publicationRecord,
  publicationSha256,
  publicationText,
} from "./primitives"

type ApprovalInput = Readonly<{
  artifactSha256: string
  entryId: string
  label: string
  market: Market
  role: "editorial" | "legal"
  value: unknown
}>

const approval = (context: ApprovalInput): PublicationApprovalRef => {
  const { artifactSha256, entryId, label, market, role, value } = context
  const input = publicationRecord(value, label)
  publicationExactKeys(
    input,
    ["artifact", "artifactSha256", "reference", "sourceSnapshotSha256"],
    label
  )
  const artifact = publicationRecord(input.artifact, `${label}.artifact`)
  publicationExactKeys(
    artifact,
    ["kind", "mediaType", "ref", "sha256"],
    `${label}.artifact`
  )
  const kind = `market-static-content-${role}-approval` as const
  const expectedRef = `market-static-content/${market}/approvals/${role}/${entryId}.json`
  if (
    artifact.kind !== kind ||
    artifact.mediaType !== "application/json" ||
    artifact.ref !== expectedRef
  ) {
    throw new Error(`${label}.artifact identity is invalid`)
  }
  const parsed = {
    artifact: {
      kind,
      mediaType: "application/json" as const,
      ref: expectedRef,
      sha256: publicationSha256(artifact.sha256, `${label}.artifact.sha256`),
    },
    artifactSha256: publicationSha256(
      input.artifactSha256,
      `${label}.artifactSha256`
    ),
    reference: publicationText(input.reference, `${label}.reference`),
    sourceSnapshotSha256: publicationSha256(
      input.sourceSnapshotSha256,
      `${label}.sourceSnapshotSha256`
    ),
  }
  if (
    parsed.artifactSha256 !== artifactSha256 ||
    !parsed.reference.startsWith(`${market.toUpperCase()}-`)
  ) {
    throw new Error(`${label} is not market/hash bound`)
  }
  return parsed
}

const entryIdFor = (pageKey: StaticRootPageKey) => {
  if (pageKey === "giftVoucher") {
    return "gift-voucher"
  }
  if (pageKey === "privateLabel") {
    return "private-label"
  }
  return pageKey
}

export const contentKindForStaticPage = (
  pageKey: StaticRootPageKey
): "about" | "cms-legal" | "cms-static" | "faq" => {
  if (pageKey === "about" || pageKey === "faq") {
    return pageKey
  }
  return (LEGAL_STATIC_ROOT_PAGE_KEYS as readonly StaticRootPageKey[]).includes(
    pageKey
  )
    ? "cms-legal"
    : "cms-static"
}

export const entityKeyForStaticPage = (
  market: Market,
  pageKey: StaticRootPageKey
): string =>
  `${market}:${contentKindForStaticPage(pageKey)}:${entryIdFor(pageKey)}`

type ParseRouteInput = Readonly<{
  expected: Readonly<{ routeKey: string; staticPageKey: StaticRootPageKey }>
  frozenRegistrySha256: string
  index: number
  market: Market
  value: unknown
}>

export const parsePublicationRoute = (
  context: ParseRouteInput
): SegmentRegistryPublicationRoute => {
  const { expected, frozenRegistrySha256, index, market, value } = context
  const label = `routes[${index}]`
  const input = publicationRecord(value, label)
  publicationExactKeys(
    input,
    [
      "editorialApproval",
      "frozenRegistrySha256",
      "legalApproval",
      "routeKey",
      "staticContentArtifact",
      "staticPageKey",
    ],
    label
  )
  if (
    input.routeKey !== expected.routeKey ||
    input.staticPageKey !== expected.staticPageKey ||
    input.frozenRegistrySha256 !== frozenRegistrySha256
  ) {
    throw new Error(`${label} does not match required route/registry`)
  }
  const artifact = publicationRecord(
    input.staticContentArtifact,
    `${label}.staticContentArtifact`
  )
  publicationExactKeys(
    artifact,
    ["kind", "mediaType", "ref", "sha256"],
    `${label}.staticContentArtifact`
  )
  const entryId = entityKeyForStaticPage(market, expected.staticPageKey).split(
    ":"
  )[2]
  const expectedRef = `market-static-content/${market}/${entryId}.json`
  if (
    artifact.kind !== "market-static-content" ||
    artifact.mediaType !== "application/json" ||
    artifact.ref !== expectedRef
  ) {
    throw new Error(`${label}.staticContentArtifact identity is invalid`)
  }
  const staticContentArtifact = {
    kind: "market-static-content" as const,
    mediaType: "application/json" as const,
    ref: expectedRef,
    sha256: publicationSha256(
      artifact.sha256,
      `${label}.staticContentArtifact.sha256`
    ),
  }
  const editorialApproval = approval({
    value: input.editorialApproval,
    role: "editorial",
    market,
    entryId,
    artifactSha256: staticContentArtifact.sha256,
    label: `${label}.editorialApproval`,
  })
  const legalApproval = approval({
    value: input.legalApproval,
    role: "legal",
    market,
    entryId,
    artifactSha256: staticContentArtifact.sha256,
    label: `${label}.legalApproval`,
  })
  if (editorialApproval.reference === legalApproval.reference) {
    throw new Error(`${label} approval references are not independent`)
  }
  return {
    editorialApproval,
    frozenRegistrySha256,
    legalApproval,
    routeKey: expected.routeKey,
    staticContentArtifact,
    staticPageKey: expected.staticPageKey,
  }
}
