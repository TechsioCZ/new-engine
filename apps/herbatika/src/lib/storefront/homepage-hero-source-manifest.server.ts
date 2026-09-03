import type { HeroBannerItem } from "@/components/homepage/homepage.data.types"
import type { CmsHeroBannerItem } from "./cms-hero-carousels"
import type { CmsHeroButtonTarget } from "./cms-types"
import type { HerbatikaLocale } from "./market-context"

export const HOMEPAGE_HERO_SOURCE_MANIFEST_ENV =
  "HERBATIKA_HOMEPAGE_HERO_REVIEWED_MANIFEST_JSON"

const REVIEWED_LOCALES = new Set<HerbatikaLocale>(["cs-CZ", "hu-HU", "ro-RO"])
const SHA256_PATTERN = /^[0-9a-f]{64}$/
const BANNER_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const PUBLIC_SOURCE_ID_PATTERN = /^[A-Za-z0-9_:-]{1,255}$/
const APPROVAL_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/
const STATIC_ROUTE_KEYS = new Set([
  "root:about",
  "root:contact",
  "root:faq",
  "root:shipping",
  "root:returns",
  "root:terms",
  "root:privacy",
  "root:cookies",
])
const MEDUSA_SOURCE_TYPES = new Set([
  "product",
  "category",
  "brand",
  "collection",
])
const PAYLOAD_SOURCE_TYPES = new Set(["article", "page"])
const BANNER_KEYS = new Set([
  "badge",
  "buttonTarget",
  "ctaLabel",
  "id",
  "imageAlt",
  "imageSrc",
  "subtitle",
  "title",
])

type UnknownRecord = Record<string, unknown>

export type ReviewedHomepageHeroManifestEntry = Readonly<{
  banners: CmsHeroBannerItem[]
  editorialApproval: Readonly<{
    approvedAt: string
    approvedBy: string
    reference: string
    status: "approved"
  }>
  locale: "cs-CZ" | "hu-HU" | "ro-RO"
  source: Readonly<{
    rawSha256: string
    reference: string
  }>
}>

export type ReviewedHomepageHeroManifest = Readonly<{
  entries: ReviewedHomepageHeroManifestEntry[]
  schemaVersion: 1
}>

export class HomepageHeroSourceManifestError extends Error {
  constructor(message: string) {
    super(`Invalid reviewed homepage hero manifest: ${message}`)
    this.name = "HomepageHeroSourceManifestError"
  }
}

const fail = (message: string): never => {
  throw new HomepageHeroSourceManifestError(message)
}

const record = (value: unknown, path: string): UnknownRecord => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
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

const text = (value: unknown, path: string, maxLength = 500): string => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength ||
    value !== value.trim()
  ) {
    fail(`${path} must be a non-empty, trimmed string`)
  }
  return value as string
}

const optionalText = (
  value: unknown,
  path: string,
  maxLength?: number
): string | undefined =>
  value === undefined ? undefined : text(value, path, maxLength)

const sourceReference = (value: unknown, path: string): string =>
  text(value, path, 2048)

const imageSource = (value: unknown, path: string): string => {
  const source = text(value, path, 2048)
  if (source.startsWith("/") && !source.startsWith("//")) {
    return source
  }
  try {
    if (new URL(source).protocol === "https:") {
      return source
    }
  } catch {
    // The error below is intentionally stable for every malformed URL.
  }
  return fail(`${path} must be a root-relative or HTTPS asset URL`)
}

const buttonTarget = (value: unknown, path: string): CmsHeroButtonTarget => {
  const target = record(value, path)
  if (target.targetType === "static") {
    exactKeys(target, path, new Set(["staticRouteKey", "targetType"]))
    if (
      typeof target.staticRouteKey !== "string" ||
      !STATIC_ROUTE_KEYS.has(target.staticRouteKey)
    ) {
      fail(`${path}.staticRouteKey is not an approved static route`)
    }
    return target as CmsHeroButtonTarget
  }

  exactKeys(
    target,
    path,
    new Set(["sourceId", "sourceSystem", "sourceType", "targetType"])
  )
  if (target.targetType !== "entity") {
    fail(`${path}.targetType must be entity or static`)
  }
  if (
    typeof target.sourceId !== "string" ||
    !PUBLIC_SOURCE_ID_PATTERN.test(target.sourceId)
  ) {
    fail(`${path}.sourceId is invalid`)
  }
  const validMedusaTarget =
    target.sourceSystem === "medusa" &&
    typeof target.sourceType === "string" &&
    MEDUSA_SOURCE_TYPES.has(target.sourceType)
  const validPayloadTarget =
    target.sourceSystem === "payload" &&
    typeof target.sourceType === "string" &&
    PAYLOAD_SOURCE_TYPES.has(target.sourceType)
  if (!(validMedusaTarget || validPayloadTarget)) {
    fail(`${path} has an invalid source system/type pair`)
  }
  return target as CmsHeroButtonTarget
}

const banner = (value: unknown, path: string): CmsHeroBannerItem => {
  const item = record(value, path)
  exactKeys(item, path, BANNER_KEYS, new Set(["id", "imageAlt", "imageSrc"]))
  const id = text(item.id, `${path}.id`, 100)
  if (!BANNER_ID_PATTERN.test(id)) {
    fail(`${path}.id must be a lowercase kebab-case identifier`)
  }
  const ctaLabel = optionalText(item.ctaLabel, `${path}.ctaLabel`, 100)
  const target =
    item.buttonTarget === undefined
      ? undefined
      : buttonTarget(item.buttonTarget, `${path}.buttonTarget`)
  if (Boolean(ctaLabel) !== Boolean(target)) {
    fail(`${path}.ctaLabel and ${path}.buttonTarget must be provided together`)
  }
  return {
    ...(optionalText(item.badge, `${path}.badge`, 100)
      ? { badge: item.badge as string }
      : {}),
    ...(target ? { buttonTarget: target } : {}),
    ...(ctaLabel ? { ctaLabel } : {}),
    id,
    imageAlt: text(item.imageAlt, `${path}.imageAlt`, 300),
    imageSrc: imageSource(item.imageSrc, `${path}.imageSrc`),
    ...(optionalText(item.subtitle, `${path}.subtitle`, 500)
      ? { subtitle: item.subtitle as string }
      : {}),
    ...(optionalText(item.title, `${path}.title`, 300)
      ? { title: item.title as string }
      : {}),
  }
}

const parseEntry = (
  value: unknown,
  index: number
): ReviewedHomepageHeroManifestEntry => {
  const path = `entries[${index}]`
  const item = record(value, path)
  exactKeys(
    item,
    path,
    new Set(["banners", "editorialApproval", "locale", "source"])
  )
  if (
    typeof item.locale !== "string" ||
    !REVIEWED_LOCALES.has(item.locale as HerbatikaLocale)
  ) {
    fail(`${path}.locale must be cs-CZ, hu-HU, or ro-RO`)
  }
  if (
    !Array.isArray(item.banners) ||
    item.banners.length < 1 ||
    item.banners.length > 12
  ) {
    fail(`${path}.banners must contain between 1 and 12 banners`)
  }
  const banners = (item.banners as unknown[]).map((bannerValue, bannerIndex) =>
    banner(bannerValue, `${path}.banners[${bannerIndex}]`)
  )
  if (new Set(banners.map(({ id }) => id)).size !== banners.length) {
    fail(`${path}.banners contains duplicate ids`)
  }

  const source = record(item.source, `${path}.source`)
  exactKeys(source, `${path}.source`, new Set(["rawSha256", "reference"]))
  if (
    typeof source.rawSha256 !== "string" ||
    !SHA256_PATTERN.test(source.rawSha256)
  ) {
    fail(`${path}.source.rawSha256 must be a lowercase SHA-256 digest`)
  }

  const approval = record(item.editorialApproval, `${path}.editorialApproval`)
  exactKeys(
    approval,
    `${path}.editorialApproval`,
    new Set(["approvedAt", "approvedBy", "reference", "status"])
  )
  if (approval.status !== "approved") {
    fail(`${path}.editorialApproval.status must be approved`)
  }
  if (
    typeof approval.approvedAt !== "string" ||
    !APPROVAL_TIMESTAMP_PATTERN.test(approval.approvedAt) ||
    Number.isNaN(Date.parse(approval.approvedAt))
  ) {
    fail(
      `${path}.editorialApproval.approvedAt must be an ISO-8601 UTC timestamp`
    )
  }

  return {
    banners,
    editorialApproval: {
      approvedAt: approval.approvedAt as string,
      approvedBy: text(
        approval.approvedBy,
        `${path}.editorialApproval.approvedBy`,
        200
      ),
      reference: sourceReference(
        approval.reference,
        `${path}.editorialApproval.reference`
      ),
      status: "approved",
    },
    locale: item.locale as "cs-CZ" | "hu-HU" | "ro-RO",
    source: {
      rawSha256: source.rawSha256 as string,
      reference: sourceReference(source.reference, `${path}.source.reference`),
    },
  }
}

export const parseReviewedHomepageHeroManifest = (
  rawJson: string
): ReviewedHomepageHeroManifest => {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    return fail("root must be valid JSON")
  }
  const manifest = record(parsed, "root")
  exactKeys(manifest, "root", new Set(["entries", "schemaVersion"]))
  if (manifest.schemaVersion !== 1) {
    fail("root.schemaVersion must equal 1")
  }
  if (
    !Array.isArray(manifest.entries) ||
    manifest.entries.length < 1 ||
    manifest.entries.length > 3
  ) {
    fail("root.entries must contain between one and three locale entries")
  }
  const entries = (manifest.entries as unknown[]).map(parseEntry)
  if (new Set(entries.map(({ locale }) => locale)).size !== entries.length) {
    fail("root.entries contains duplicate locales")
  }
  return { entries, schemaVersion: 1 }
}

export const readReviewedHomepageHeroBanners = (
  locale: HerbatikaLocale,
  environment: Readonly<Record<string, string | undefined>> = process.env
): HeroBannerItem[] | undefined => {
  const rawJson = environment[HOMEPAGE_HERO_SOURCE_MANIFEST_ENV]
  if (rawJson === undefined) {
    return
  }
  const manifest = parseReviewedHomepageHeroManifest(rawJson)
  return manifest.entries.find(
    (manifestEntry) => manifestEntry.locale === locale
  )?.banners
}
