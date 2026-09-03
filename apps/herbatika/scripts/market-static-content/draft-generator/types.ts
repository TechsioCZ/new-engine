import type {
  StaticContentKind,
  StaticContentLocale,
  StaticContentMarket,
} from "../types"

export const DRAFT_MARKETS = ["cz", "hu", "ro"] as const
export type DraftMarket = (typeof DRAFT_MARKETS)[number]

export const NON_LEGAL_DRAFT_ENTRY_IDS = [
  "homepage",
  "about",
  "faq",
  "contact-neutral",
  "footer",
  "affiliate",
  "wholesale",
  "dropshipping",
  "private-label",
  "gift-voucher",
] as const

export const LEGAL_TEMPLATE_ENTRY_IDS = [
  "terms",
  "privacy",
  "cookies",
  "returns",
  "shipping",
] as const

export const DRAFT_ENTRY_IDS = [
  ...NON_LEGAL_DRAFT_ENTRY_IDS,
  ...LEGAL_TEMPLATE_ENTRY_IDS,
] as const

export type NonLegalDraftEntryId = (typeof NON_LEGAL_DRAFT_ENTRY_IDS)[number]
export type LegalTemplateEntryId = (typeof LEGAL_TEMPLATE_ENTRY_IDS)[number]
export type DraftEntryId = (typeof DRAFT_ENTRY_IDS)[number]

export type DraftSection = Readonly<{
  body: readonly string[]
  heading: string
}>

export type DraftSourcePage = Readonly<{
  entryId: DraftEntryId
  lead: string
  requiredOperatorFields: readonly string[]
  sections: readonly DraftSection[]
  title: string
}>

export type MarketStaticContentDraftPayload = Readonly<{
  content: Readonly<{
    lead: string
    sections: readonly DraftSection[]
    title: string
  }>
  contentKind: StaticContentKind
  entryId: DraftEntryId
  kind: "market-static-content-draft-payload"
  locale: StaticContentLocale
  market: DraftMarket
  pageType: "non-legal-draft" | "operator-fill-template"
  provenance: "ai-generated-unreviewed"
  publicationGate: "blocked-until-reviewed-official-source"
  requiredOperatorFields: readonly string[]
  reviewChecklist: readonly string[]
  schemaVersion: 1
}>

export type MarketStaticContentDraftBundleEntry = Readonly<{
  contentKind: StaticContentKind
  draftPayload: Readonly<{
    kind: "market-static-content-draft-payload"
    mediaType: "application/json"
    ref: string
    sha256: string
  }>
  entryId: DraftEntryId
  provenance: "ai-generated-unreviewed"
  publicationGate: "blocked-until-reviewed-official-source"
  target: Readonly<{
    artifactRef: string
    editorialApprovalRef: string
    legalApprovalRef: string
    payloadRef: string
  }>
}>

export type MarketStaticContentDraftBundle = Readonly<{
  approvalStatus: Readonly<{
    editorial: "required"
    legal: "required"
  }>
  authorization: "none"
  entries: readonly MarketStaticContentDraftBundleEntry[]
  kind: "market-static-content-draft-bundle"
  locale: StaticContentLocale
  market: DraftMarket
  provenance: "ai-generated-unreviewed"
  ready: false
  schemaVersion: 1
}>

export type DraftOutputFile = Readonly<{
  contents: string
  path: string
  sha256: string
}>

export type MarketStaticContentDraftBuild = Readonly<{
  bundle: MarketStaticContentDraftBundle
  files: readonly DraftOutputFile[]
  market: DraftMarket
}>

export const isDraftMarket = (
  market: StaticContentMarket
): market is DraftMarket => DRAFT_MARKETS.includes(market as DraftMarket)
