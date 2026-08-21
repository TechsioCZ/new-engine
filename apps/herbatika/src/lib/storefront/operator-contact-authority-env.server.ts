import type { Market } from "@/lib/url/types"
import {
  assertStaticContentExactKeys,
  parseStaticContentJson,
  staticContentRecord,
} from "../../../scripts/market-static-content/primitives"

export const OPERATOR_CONTACT_REVIEWED_AUTHORITIES_ENV =
  "HERBATIKA_OPERATOR_CONTACT_REVIEWED_AUTHORITIES_JSON"

export type OperatorContactAuthorityRawFiles = Readonly<{
  editorialApprovalCollectionRaw: string
  editorialApprovalRaw: string
  legalApprovalCollectionRaw: string
  legalApprovalRaw: string
  market: Market
  reviewedPayloadRaw: string
  sourceManifestRaw: string
  staticContentArtifactRaw: string
  staticContentCollectionRaw: string
}>

const rawJsonText = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be nonempty raw JSON text`)
  }
  return value
}

export const parseOperatorContactAuthorityEnv = (
  contents: string
): readonly OperatorContactAuthorityRawFiles[] => {
  const label = OPERATOR_CONTACT_REVIEWED_AUTHORITIES_ENV
  const raw = staticContentRecord(
    parseStaticContentJson(contents, label),
    label
  )
  assertStaticContentExactKeys(
    raw,
    ["authorities", "kind", "schemaVersion"],
    label
  )
  if (
    raw.schemaVersion !== 1 ||
    raw.kind !== "herbatika-operator-contact-reviewed-authorities" ||
    !Array.isArray(raw.authorities)
  ) {
    throw new Error(`${label} identity is invalid`)
  }
  const markets = new Set<Market>()
  return raw.authorities.map((value, index) => {
    const itemLabel = `${label}.authorities[${index}]`
    const item = staticContentRecord(value, itemLabel)
    assertStaticContentExactKeys(
      item,
      [
        "editorialApprovalCollectionRaw",
        "editorialApprovalRaw",
        "legalApprovalCollectionRaw",
        "legalApprovalRaw",
        "market",
        "reviewedPayloadRaw",
        "sourceManifestRaw",
        "staticContentArtifactRaw",
        "staticContentCollectionRaw",
      ],
      itemLabel
    )
    if (
      !(
        typeof item.market === "string" &&
        ["cz", "hu", "ro", "sk"].includes(item.market)
      )
    ) {
      throw new Error(`${itemLabel}.market is invalid`)
    }
    const market = item.market as Market
    if (markets.has(market)) {
      throw new Error(`${label} contains duplicate market authorities`)
    }
    markets.add(market)
    return {
      editorialApprovalCollectionRaw: rawJsonText(
        item.editorialApprovalCollectionRaw,
        `${itemLabel}.editorialApprovalCollectionRaw`
      ),
      editorialApprovalRaw: rawJsonText(
        item.editorialApprovalRaw,
        `${itemLabel}.editorialApprovalRaw`
      ),
      legalApprovalCollectionRaw: rawJsonText(
        item.legalApprovalCollectionRaw,
        `${itemLabel}.legalApprovalCollectionRaw`
      ),
      legalApprovalRaw: rawJsonText(
        item.legalApprovalRaw,
        `${itemLabel}.legalApprovalRaw`
      ),
      market,
      reviewedPayloadRaw: rawJsonText(
        item.reviewedPayloadRaw,
        `${itemLabel}.reviewedPayloadRaw`
      ),
      sourceManifestRaw: rawJsonText(
        item.sourceManifestRaw,
        `${itemLabel}.sourceManifestRaw`
      ),
      staticContentArtifactRaw: rawJsonText(
        item.staticContentArtifactRaw,
        `${itemLabel}.staticContentArtifactRaw`
      ),
      staticContentCollectionRaw: rawJsonText(
        item.staticContentCollectionRaw,
        `${itemLabel}.staticContentCollectionRaw`
      ),
    }
  })
}
