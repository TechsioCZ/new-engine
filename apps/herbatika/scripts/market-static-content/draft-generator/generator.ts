import {
  canonicalStaticContentJson,
  hashStaticContentBytes,
} from "../primitives"
import type { StaticContentKind } from "../types"
import { draftLocaleForMarket, draftPagesForMarket } from "./content"
import {
  DRAFT_ENTRY_IDS,
  type DraftEntryId,
  type DraftMarket,
  type DraftOutputFile,
  LEGAL_TEMPLATE_ENTRY_IDS,
  type MarketStaticContentDraftBuild,
  type MarketStaticContentDraftPayload,
} from "./types"

const NON_LEGAL_REVIEW_CHECKLIST = [
  "editorial-language-reviewed",
  "claims-and-product-scope-reviewed",
  "links-and-route-targets-reviewed",
  "qualified-legal-review-recorded",
] as const

const LEGAL_REVIEW_CHECKLIST = [
  "all-operator-fields-replaced",
  "actual-operations-and-providers-verified",
  "consumer-rights-for-market-verified",
  "policy-versions-aligned",
  "qualified-legal-review-recorded",
] as const

const CONTENT_KIND_BY_ENTRY_ID = {
  about: "about",
  affiliate: "cms-static",
  "contact-neutral": "cms-static",
  cookies: "cms-legal",
  dropshipping: "cms-static",
  faq: "faq",
  footer: "footer",
  "gift-voucher": "cms-static",
  homepage: "homepage-hero",
  "private-label": "cms-static",
  privacy: "cms-legal",
  returns: "cms-legal",
  shipping: "cms-legal",
  terms: "cms-legal",
  wholesale: "cms-static",
} as const satisfies Readonly<Record<DraftEntryId, StaticContentKind>>

const isLegalTemplate = (
  entryId: DraftEntryId
): entryId is (typeof LEGAL_TEMPLATE_ENTRY_IDS)[number] =>
  LEGAL_TEMPLATE_ENTRY_IDS.includes(
    entryId as (typeof LEGAL_TEMPLATE_ENTRY_IDS)[number]
  )

const assertCompleteSource = (market: DraftMarket): void => {
  const pages = draftPagesForMarket(market)
  const ids = pages.map(({ entryId }) => entryId)
  if (
    ids.length !== DRAFT_ENTRY_IDS.length ||
    new Set(ids).size !== ids.length ||
    DRAFT_ENTRY_IDS.some((entryId) => !ids.includes(entryId))
  ) {
    throw new Error(`${market} draft source is not exhaustive and unique`)
  }
}

const buildPayload = (
  market: DraftMarket,
  entryId: DraftEntryId
): MarketStaticContentDraftPayload => {
  const source = draftPagesForMarket(market).find(
    (page) => page.entryId === entryId
  )
  if (!source) {
    throw new Error(`${market} draft source is missing ${entryId}`)
  }
  const legal = isLegalTemplate(entryId)
  return {
    content: {
      lead: source.lead,
      sections: source.sections,
      title: source.title,
    },
    contentKind: CONTENT_KIND_BY_ENTRY_ID[entryId],
    entryId,
    kind: "market-static-content-draft-payload",
    locale: draftLocaleForMarket(market),
    market,
    pageType: legal ? "operator-fill-template" : "non-legal-draft",
    provenance: "ai-generated-unreviewed",
    publicationGate: "blocked-until-reviewed-official-source",
    requiredOperatorFields: source.requiredOperatorFields,
    reviewChecklist: legal
      ? LEGAL_REVIEW_CHECKLIST
      : NON_LEGAL_REVIEW_CHECKLIST,
    schemaVersion: 1,
  }
}

export const buildMarketStaticContentDrafts = (
  market: DraftMarket
): MarketStaticContentDraftBuild => {
  assertCompleteSource(market)
  const payloadFiles = DRAFT_ENTRY_IDS.map((entryId) => {
    const contents = canonicalStaticContentJson(buildPayload(market, entryId))
    return {
      contents,
      path: `market-static-content-drafts/${market}/payload/${entryId}.json`,
      sha256: hashStaticContentBytes(contents),
    } satisfies DraftOutputFile
  })
  const entries = payloadFiles.map((file, index) => {
    const entryId = DRAFT_ENTRY_IDS[index]
    return {
      contentKind: CONTENT_KIND_BY_ENTRY_ID[entryId],
      draftPayload: {
        kind: "market-static-content-draft-payload" as const,
        mediaType: "application/json" as const,
        ref: file.path,
        sha256: file.sha256,
      },
      entryId,
      provenance: "ai-generated-unreviewed" as const,
      publicationGate: "blocked-until-reviewed-official-source" as const,
      target: {
        artifactRef: `market-static-content/${market}/${entryId}.json`,
        editorialApprovalRef: `market-static-content/${market}/approvals/editorial/${entryId}.json`,
        legalApprovalRef: `market-static-content/${market}/approvals/legal/${entryId}.json`,
        payloadRef: `market-static-content/${market}/payload/${entryId}.json`,
      },
    }
  })
  const bundle = {
    approvalStatus: { editorial: "required", legal: "required" },
    authorization: "none",
    entries,
    kind: "market-static-content-draft-bundle",
    locale: draftLocaleForMarket(market),
    market,
    provenance: "ai-generated-unreviewed",
    ready: false,
    schemaVersion: 1,
  } as const
  const bundleContents = canonicalStaticContentJson(bundle)
  const bundleFile = {
    contents: bundleContents,
    path: `market-static-content-drafts/${market}/bundle.json`,
    sha256: hashStaticContentBytes(bundleContents),
  }
  return {
    bundle,
    files: [bundleFile, ...payloadFiles].sort((left, right) =>
      left.path.localeCompare(right.path, "en")
    ),
    market,
  }
}

export const buildAllMarketStaticContentDrafts = () =>
  (["cz", "hu", "ro"] as const).map(buildMarketStaticContentDrafts)
