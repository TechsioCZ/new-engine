import { createHash } from "node:crypto"
import type { Market } from "@/lib/url/types"
import type { SourceReadResult } from "@/lib/url-registry/contracts"

export const CAMPAIGN_PUBLICATION_SOURCE_ENV =
  "HERBATIKA_CAMPAIGN_PUBLICATION_SOURCE_JSON"

const MAX_CAMPAIGNS = 500
const MAX_CONTENT_LENGTH = 200_000
const SHA256_PATTERN = /^[0-9a-f]{64}$/
const IDENTIFIER_PATTERN = /^[\x21-\x7e]{1,255}$/
export const CAMPAIGN_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/

export const CAMPAIGN_LOCALE_BY_MARKET = {
  sk: "sk-SK",
  cz: "cs-CZ",
  hu: "hu-HU",
  ro: "ro-RO",
} as const satisfies Record<Market, string>

const MARKETS = new Set<Market>(["sk", "cz", "hu", "ro"])

type UnknownRecord = Record<string, unknown>

export type ReviewedCampaignPublication = Readonly<{
  approval: Readonly<{
    approvedAt: string
    approvedBy: string
    reference: string
    status: "approved"
  }>
  content: string
  contentSha256: string
  description?: string
  market: Market
  publicSlug: string
  publishedAt?: string
  sourceId: string
  sourceVersion: string
  title: string
  translation: Readonly<{
    localeCode: string
    reference: "campaign"
    translationId: string
  }>
}>

export type ReviewedCampaignPublicationManifest = Readonly<{
  entries: readonly ReviewedCampaignPublication[]
  schemaVersion: 1
}>

export class CampaignPublicationSourceError extends Error {
  constructor(message: string) {
    super(`Invalid campaign publication source: ${message}`)
    this.name = "CampaignPublicationSourceError"
  }
}

const fail = (message: string): never => {
  throw new CampaignPublicationSourceError(message)
}

const record = (value: unknown, path: string): UnknownRecord => {
  if (!(value && typeof value === "object") || Array.isArray(value)) {
    fail(`${path} must be an object`)
  }
  return value as UnknownRecord
}

const exactKeys = (
  value: UnknownRecord,
  path: string,
  allowed: ReadonlySet<string>,
  required: ReadonlySet<string> = allowed
) => {
  const unexpected = Object.keys(value).find((key) => !allowed.has(key))
  if (unexpected) {
    fail(`${path}.${unexpected} is not allowed`)
  }
  const missing = [...required].find((key) => !Object.hasOwn(value, key))
  if (missing) {
    fail(`${path}.${missing} is required`)
  }
}

const text = (value: unknown, path: string, maximumLength: number): string => {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maximumLength ||
    value !== value.trim()
  ) {
    fail(`${path} must be non-empty trimmed text`)
  }
  return value as string
}

const optionalText = (
  value: unknown,
  path: string,
  maximumLength: number
): string | undefined =>
  value === undefined ? undefined : text(value, path, maximumLength)

const timestamp = (value: unknown, path: string): string => {
  const parsed = text(value, path, 32)
  if (
    !ISO_TIMESTAMP_PATTERN.test(parsed) ||
    new Date(parsed).toISOString() !== parsed
  ) {
    fail(`${path} must be a canonical UTC timestamp`)
  }
  return parsed
}

const canonicalHashInput = (
  entry: Omit<ReviewedCampaignPublication, "contentSha256">
) =>
  JSON.stringify({
    approval: entry.approval,
    content: entry.content,
    description: entry.description ?? null,
    market: entry.market,
    publicSlug: entry.publicSlug,
    publishedAt: entry.publishedAt ?? null,
    sourceId: entry.sourceId,
    sourceVersion: entry.sourceVersion,
    title: entry.title,
    translation: entry.translation,
  })

export const hashCampaignPublicationContent = (
  entry: Omit<ReviewedCampaignPublication, "contentSha256">
): string =>
  createHash("sha256").update(canonicalHashInput(entry)).digest("hex")

const parseEntry = (
  value: unknown,
  index: number
): ReviewedCampaignPublication => {
  const path = `entries[${index}]`
  const item = record(value, path)
  exactKeys(
    item,
    path,
    new Set([
      "approval",
      "content",
      "contentSha256",
      "description",
      "market",
      "publicSlug",
      "publishedAt",
      "sourceId",
      "sourceVersion",
      "title",
      "translation",
    ]),
    new Set([
      "approval",
      "content",
      "contentSha256",
      "market",
      "publicSlug",
      "sourceId",
      "sourceVersion",
      "title",
      "translation",
    ])
  )

  if (typeof item.market !== "string" || !MARKETS.has(item.market as Market)) {
    fail(`${path}.market is invalid`)
  }
  const market = item.market as Market
  const publicSlug = text(item.publicSlug, `${path}.publicSlug`, 80)
  if (!CAMPAIGN_SLUG_PATTERN.test(publicSlug)) {
    fail(`${path}.publicSlug is invalid`)
  }
  const sourceId = text(item.sourceId, `${path}.sourceId`, 255)
  const sourceVersion = text(item.sourceVersion, `${path}.sourceVersion`, 255)
  if (
    !(
      IDENTIFIER_PATTERN.test(sourceId) &&
      IDENTIFIER_PATTERN.test(sourceVersion)
    )
  ) {
    fail(`${path} source identity is invalid`)
  }

  const translationRecord = record(item.translation, `${path}.translation`)
  exactKeys(
    translationRecord,
    `${path}.translation`,
    new Set(["localeCode", "reference", "translationId"])
  )
  if (
    translationRecord.localeCode !== CAMPAIGN_LOCALE_BY_MARKET[market] ||
    translationRecord.reference !== "campaign"
  ) {
    fail(`${path}.translation does not prove the market campaign locale`)
  }
  const translationId = text(
    translationRecord.translationId,
    `${path}.translation.translationId`,
    255
  )
  if (!IDENTIFIER_PATTERN.test(translationId)) {
    fail(`${path}.translation.translationId is invalid`)
  }

  const approvalRecord = record(item.approval, `${path}.approval`)
  exactKeys(
    approvalRecord,
    `${path}.approval`,
    new Set(["approvedAt", "approvedBy", "reference", "status"])
  )
  if (approvalRecord.status !== "approved") {
    fail(`${path}.approval.status must be approved`)
  }

  const parsedWithoutHash = {
    approval: {
      approvedAt: timestamp(
        approvalRecord.approvedAt,
        `${path}.approval.approvedAt`
      ),
      approvedBy: text(
        approvalRecord.approvedBy,
        `${path}.approval.approvedBy`,
        255
      ),
      reference: text(
        approvalRecord.reference,
        `${path}.approval.reference`,
        2048
      ),
      status: "approved" as const,
    },
    content: text(item.content, `${path}.content`, MAX_CONTENT_LENGTH),
    ...(optionalText(item.description, `${path}.description`, 500)
      ? { description: item.description as string }
      : {}),
    market,
    publicSlug,
    ...(item.publishedAt === undefined
      ? {}
      : { publishedAt: timestamp(item.publishedAt, `${path}.publishedAt`) }),
    sourceId,
    sourceVersion,
    title: text(item.title, `${path}.title`, 300),
    translation: {
      localeCode: CAMPAIGN_LOCALE_BY_MARKET[market],
      reference: "campaign" as const,
      translationId,
    },
  }
  if (
    typeof item.contentSha256 !== "string" ||
    !SHA256_PATTERN.test(item.contentSha256) ||
    hashCampaignPublicationContent(parsedWithoutHash) !== item.contentSha256
  ) {
    fail(`${path}.contentSha256 does not bind the reviewed content`)
  }
  return {
    ...parsedWithoutHash,
    contentSha256: item.contentSha256 as string,
  }
}

export const parseCampaignPublicationManifest = (
  rawJson: string
): ReviewedCampaignPublicationManifest => {
  if (rawJson.length < 1 || rawJson.length > 10_000_000) {
    fail("manifest size is invalid")
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    fail("manifest must be JSON")
  }
  const root = record(parsed, "root")
  exactKeys(root, "root", new Set(["entries", "schemaVersion"]))
  if (root.schemaVersion !== 1 || !Array.isArray(root.entries)) {
    fail("root fields are invalid")
  }
  const rawEntries = root.entries as unknown[]
  if (rawEntries.length < 1 || rawEntries.length > MAX_CAMPAIGNS) {
    fail(`entries must contain between 1 and ${MAX_CAMPAIGNS} campaigns`)
  }
  const entries = rawEntries.map(parseEntry)
  const identities = entries.map((entry) => `${entry.market}:${entry.sourceId}`)
  const slugs = entries.map((entry) => `${entry.market}:${entry.publicSlug}`)
  const translationIds = entries.map(
    (entry) =>
      `${entry.translation.localeCode}:${entry.translation.translationId}`
  )
  if (
    new Set(identities).size !== entries.length ||
    new Set(slugs).size !== entries.length ||
    new Set(translationIds).size !== entries.length
  ) {
    fail("entries contain duplicate identities, slugs, or translation proofs")
  }
  return { entries, schemaVersion: 1 }
}

export const readReviewedCampaignPublicationManifest = (
  environment: Readonly<Record<string, string | undefined>> = process.env
): SourceReadResult<ReviewedCampaignPublicationManifest> => {
  const rawJson = environment[CAMPAIGN_PUBLICATION_SOURCE_ENV]
  if (!rawJson) {
    return { kind: "missing" }
  }
  try {
    return { kind: "found", value: parseCampaignPublicationManifest(rawJson) }
  } catch {
    return {
      causeCode: "INVALID_CAMPAIGN_PUBLICATION_MANIFEST",
      kind: "invalid-response",
    }
  }
}
