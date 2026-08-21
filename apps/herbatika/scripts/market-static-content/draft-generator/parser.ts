import {
  assertStaticContentExactKeys,
  canonicalStaticContentJson,
  hashStaticContentBytes,
  parseStaticContentJson,
  staticContentRecord,
  staticContentSha256,
  staticContentText,
} from "../primitives"
import { STATIC_CONTENT_LOCALE_BY_MARKET } from "../types"
import {
  DRAFT_ENTRY_IDS,
  DRAFT_MARKETS,
  type DraftEntryId,
  type DraftMarket,
  LEGAL_TEMPLATE_ENTRY_IDS,
  type MarketStaticContentDraftBuild,
  type MarketStaticContentDraftBundle,
  type MarketStaticContentDraftPayload,
} from "./types"

const OPERATOR_FIELD = /^[A-Z][A-Z0-9_]*$/
const OPERATOR_TOKEN = /\{\{([A-Z][A-Z0-9_]*)\}\}/g

const parseCanonicalRoot = (contents: string, label: string) => {
  const raw = parseStaticContentJson(contents, label)
  if (canonicalStaticContentJson(raw) !== contents) {
    throw new Error(`${label} is not canonical JSON with a trailing newline`)
  }
  return staticContentRecord(raw, label)
}

const parseIdentity = (
  value: Record<string, unknown>,
  label: string
): Readonly<{
  entryId: DraftEntryId
  market: DraftMarket
}> => {
  if (!DRAFT_MARKETS.includes(value.market as DraftMarket)) {
    throw new Error(`${label}.market is invalid`)
  }
  const market = value.market as DraftMarket
  if (value.locale !== STATIC_CONTENT_LOCALE_BY_MARKET[market]) {
    throw new Error(`${label}.locale does not match market`)
  }
  if (!DRAFT_ENTRY_IDS.includes(value.entryId as DraftEntryId)) {
    throw new Error(`${label}.entryId is invalid`)
  }
  return { entryId: value.entryId as DraftEntryId, market }
}

const parseRequiredOperatorFields = (
  value: unknown,
  serializedContent: string,
  legal: boolean,
  label: string
): readonly string[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${label}.requiredOperatorFields must be an array`)
  }
  const fields = value.map((field, index) => {
    const parsed = staticContentText(
      field,
      `${label}.requiredOperatorFields[${index}]`
    )
    if (!OPERATOR_FIELD.test(parsed)) {
      throw new Error(`${label}.requiredOperatorFields contains invalid field`)
    }
    return parsed
  })
  const tokens = [...serializedContent.matchAll(OPERATOR_TOKEN)].map(
    (match) => match[1]
  )
  const invalidLegalFields =
    fields.length === 0 ||
    fields.some((field) => !tokens.includes(field)) ||
    tokens.some((token) => !fields.includes(token))
  if (
    new Set(fields).size !== fields.length ||
    (legal ? invalidLegalFields : fields.length !== 0 || tokens.length !== 0)
  ) {
    throw new Error(`${label} operator fields are not exact and exhaustive`)
  }
  return fields
}

const parseDraftContent = (input: unknown, label: string) => {
  const content = staticContentRecord(input, `${label}.content`)
  assertStaticContentExactKeys(
    content,
    ["lead", "sections", "title"],
    `${label}.content`
  )
  if (!Array.isArray(content.sections) || content.sections.length === 0) {
    throw new Error(`${label}.content.sections must be nonempty`)
  }
  const sections = content.sections.map((value, sectionIndex) => {
    const section = staticContentRecord(
      value,
      `${label}.content.sections[${sectionIndex}]`
    )
    assertStaticContentExactKeys(
      section,
      ["body", "heading"],
      `${label}.content.sections[${sectionIndex}]`
    )
    if (!Array.isArray(section.body) || section.body.length === 0) {
      throw new Error(
        `${label}.content.sections[${sectionIndex}].body is empty`
      )
    }
    return {
      body: section.body.map((line, lineIndex) =>
        staticContentText(
          line,
          `${label}.content.sections[${sectionIndex}].body[${lineIndex}]`
        )
      ),
      heading: staticContentText(
        section.heading,
        `${label}.content.sections[${sectionIndex}].heading`
      ),
    }
  })
  return {
    lead: staticContentText(content.lead, `${label}.content.lead`),
    sections,
    title: staticContentText(content.title, `${label}.content.title`),
  }
}

export const parseMarketStaticContentDraftPayload = (
  contents: string,
  label = "market static-content draft payload"
): MarketStaticContentDraftPayload => {
  const payload = parseCanonicalRoot(contents, label)
  assertStaticContentExactKeys(
    payload,
    [
      "content",
      "contentKind",
      "entryId",
      "kind",
      "locale",
      "market",
      "pageType",
      "provenance",
      "publicationGate",
      "requiredOperatorFields",
      "reviewChecklist",
      "schemaVersion",
    ],
    label
  )
  if (
    payload.schemaVersion !== 1 ||
    payload.kind !== "market-static-content-draft-payload" ||
    payload.provenance !== "ai-generated-unreviewed" ||
    payload.publicationGate !== "blocked-until-reviewed-official-source"
  ) {
    throw new Error(`${label} is not a fail-closed draft`)
  }
  const { entryId, market } = parseIdentity(payload, label)
  const legal = LEGAL_TEMPLATE_ENTRY_IDS.includes(
    entryId as (typeof LEGAL_TEMPLATE_ENTRY_IDS)[number]
  )
  if (
    payload.pageType !== (legal ? "operator-fill-template" : "non-legal-draft")
  ) {
    throw new Error(`${label}.pageType does not match entry`)
  }
  const content = parseDraftContent(payload.content, label)
  const requiredOperatorFields = parseRequiredOperatorFields(
    payload.requiredOperatorFields,
    JSON.stringify(content),
    legal,
    label
  )
  if (
    !Array.isArray(payload.reviewChecklist) ||
    payload.reviewChecklist.length < 4
  ) {
    throw new Error(`${label}.reviewChecklist is incomplete`)
  }
  const reviewChecklist = payload.reviewChecklist.map((item, index) =>
    staticContentText(item, `${label}.reviewChecklist[${index}]`)
  )
  return {
    content,
    contentKind: staticContentText(
      payload.contentKind,
      `${label}.contentKind`
    ) as MarketStaticContentDraftPayload["contentKind"],
    entryId,
    kind: "market-static-content-draft-payload",
    locale: STATIC_CONTENT_LOCALE_BY_MARKET[market],
    market,
    pageType: legal ? "operator-fill-template" : "non-legal-draft",
    provenance: "ai-generated-unreviewed",
    publicationGate: "blocked-until-reviewed-official-source",
    requiredOperatorFields,
    reviewChecklist,
    schemaVersion: 1,
  }
}

export const parseMarketStaticContentDraftBundle = (
  contents: string,
  label = "market static-content draft bundle"
): MarketStaticContentDraftBundle => {
  const bundle = parseCanonicalRoot(contents, label)
  assertStaticContentExactKeys(
    bundle,
    [
      "approvalStatus",
      "authorization",
      "entries",
      "kind",
      "locale",
      "market",
      "provenance",
      "ready",
      "schemaVersion",
    ],
    label
  )
  if (
    bundle.schemaVersion !== 1 ||
    bundle.kind !== "market-static-content-draft-bundle" ||
    bundle.authorization !== "none" ||
    bundle.provenance !== "ai-generated-unreviewed" ||
    bundle.ready !== false ||
    !DRAFT_MARKETS.includes(bundle.market as DraftMarket) ||
    bundle.locale !==
      STATIC_CONTENT_LOCALE_BY_MARKET[bundle.market as DraftMarket]
  ) {
    throw new Error(`${label} is not a fail-closed draft bundle`)
  }
  const market = bundle.market as DraftMarket
  const approvalStatus = staticContentRecord(
    bundle.approvalStatus,
    `${label}.approvalStatus`
  )
  assertStaticContentExactKeys(
    approvalStatus,
    ["editorial", "legal"],
    `${label}.approvalStatus`
  )
  if (
    approvalStatus.editorial !== "required" ||
    approvalStatus.legal !== "required"
  ) {
    throw new Error(`${label}.approvalStatus must remain required`)
  }
  if (
    !Array.isArray(bundle.entries) ||
    bundle.entries.length !== DRAFT_ENTRY_IDS.length
  ) {
    throw new Error(`${label}.entries is not exhaustive`)
  }
  const entries = bundle.entries.map((value, index) => {
    const itemLabel = `${label}.entries[${index}]`
    const entry = staticContentRecord(value, itemLabel)
    assertStaticContentExactKeys(
      entry,
      [
        "contentKind",
        "draftPayload",
        "entryId",
        "provenance",
        "publicationGate",
        "target",
      ],
      itemLabel
    )
    const entryId = staticContentText(entry.entryId, `${itemLabel}.entryId`)
    if (
      entryId !== DRAFT_ENTRY_IDS[index] ||
      entry.provenance !== "ai-generated-unreviewed" ||
      entry.publicationGate !== "blocked-until-reviewed-official-source"
    ) {
      throw new Error(`${itemLabel} identity or order is invalid`)
    }
    const draftPayload = staticContentRecord(
      entry.draftPayload,
      `${itemLabel}.draftPayload`
    )
    assertStaticContentExactKeys(
      draftPayload,
      ["kind", "mediaType", "ref", "sha256"],
      `${itemLabel}.draftPayload`
    )
    const expectedDraftRef = `market-static-content-drafts/${market}/payload/${entryId}.json`
    if (
      draftPayload.kind !== "market-static-content-draft-payload" ||
      draftPayload.mediaType !== "application/json" ||
      draftPayload.ref !== expectedDraftRef
    ) {
      throw new Error(`${itemLabel}.draftPayload identity is invalid`)
    }
    const target = staticContentRecord(entry.target, `${itemLabel}.target`)
    assertStaticContentExactKeys(
      target,
      ["artifactRef", "editorialApprovalRef", "legalApprovalRef", "payloadRef"],
      `${itemLabel}.target`
    )
    const expectedTarget = {
      artifactRef: `market-static-content/${market}/${entryId}.json`,
      editorialApprovalRef: `market-static-content/${market}/approvals/editorial/${entryId}.json`,
      legalApprovalRef: `market-static-content/${market}/approvals/legal/${entryId}.json`,
      payloadRef: `market-static-content/${market}/payload/${entryId}.json`,
    }
    if (
      Object.entries(expectedTarget).some(
        ([key, expected]) => target[key] !== expected
      )
    ) {
      throw new Error(`${itemLabel}.target is not bound to the final contract`)
    }
    return {
      contentKind: staticContentText(
        entry.contentKind,
        `${itemLabel}.contentKind`
      ) as MarketStaticContentDraftBundle["entries"][number]["contentKind"],
      draftPayload: {
        kind: "market-static-content-draft-payload" as const,
        mediaType: "application/json" as const,
        ref: expectedDraftRef,
        sha256: staticContentSha256(
          draftPayload.sha256,
          `${itemLabel}.draftPayload.sha256`
        ),
      },
      entryId: entryId as DraftEntryId,
      provenance: "ai-generated-unreviewed" as const,
      publicationGate: "blocked-until-reviewed-official-source" as const,
      target: expectedTarget,
    }
  })
  return {
    approvalStatus: { editorial: "required", legal: "required" },
    authorization: "none",
    entries,
    kind: "market-static-content-draft-bundle",
    locale: STATIC_CONTENT_LOCALE_BY_MARKET[market],
    market,
    provenance: "ai-generated-unreviewed",
    ready: false,
    schemaVersion: 1,
  }
}

export const verifyMarketStaticContentDraftBuild = (
  build: MarketStaticContentDraftBuild
): void => {
  const bundleFile = build.files.find(
    ({ path }) =>
      path === `market-static-content-drafts/${build.market}/bundle.json`
  )
  if (!bundleFile) {
    throw new Error(`${build.market} draft build is missing bundle.json`)
  }
  const bundle = parseMarketStaticContentDraftBundle(bundleFile.contents)
  for (const entry of bundle.entries) {
    const file = build.files.find(({ path }) => path === entry.draftPayload.ref)
    if (
      !file ||
      hashStaticContentBytes(file.contents) !== file.sha256 ||
      file.sha256 !== entry.draftPayload.sha256
    ) {
      throw new Error(`${entry.entryId} draft payload hash is invalid`)
    }
    const payload = parseMarketStaticContentDraftPayload(file.contents)
    if (
      payload.market !== bundle.market ||
      payload.entryId !== entry.entryId ||
      payload.contentKind !== entry.contentKind
    ) {
      throw new Error(`${entry.entryId} draft payload is not bundle-bound`)
    }
  }
}
