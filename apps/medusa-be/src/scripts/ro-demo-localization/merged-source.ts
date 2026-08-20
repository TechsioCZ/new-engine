import { createHash } from "node:crypto"
import type { DemoOfficialProduct } from "./types"

const SHA_256 = /^[a-f0-9]{64}$/
const LINE_BREAK = /\r?\n/

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const text = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a nonblank string`)
  }
  return value.trim()
}

const nullableText = (value: unknown, label: string): null | string => {
  if (value === null) {
    return null
  }
  return text(value, label)
}

const canonicalTimestamp = (value: string, label: string): string => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} must be an ISO-8601 UTC timestamp`)
  }
  return parsed.toISOString()
}

/**
 * Strict adapter for the frozen merged evidence artifact. It never derives a
 * Medusa content ID and never promotes a non-bijective record. Missing page
 * hashes are represented honestly by a hash of the exact JSONL record; their
 * timestamp is the caller-supplied immutable merge-evidence capture timestamp,
 * not a synthesized page retrieval time. `evidenceKind` preserves that
 * distinction in the generator input/provenance hash.
 */
export const parseMergedDemoProductJsonl = (
  contents: string,
  mergedEvidenceCapturedAt: string,
  expectedPartition: Readonly<{
    excluded: number
    published: number
    total: number
  }> = { excluded: 97, published: 2002, total: 2099 }
): readonly DemoOfficialProduct[] => {
  const normalizedMergedEvidenceCapturedAt = canonicalTimestamp(
    mergedEvidenceCapturedAt,
    "mergedEvidenceCapturedAt"
  )
  const products: DemoOfficialProduct[] = []
  for (const [index, rawLine] of contents.split(LINE_BREAK).entries()) {
    if (!rawLine.trim()) {
      continue
    }
    const label = `Merged product JSONL line ${index + 1}`
    let parsed: unknown
    try {
      parsed = JSON.parse(rawLine)
    } catch {
      throw new Error(`${label} is not valid JSON`)
    }
    const value = record(parsed, label)
    if (value.schema_version !== 1) {
      throw new Error(`${label}.schema_version must be 1`)
    }
    if (value.approval !== "demo-generated-unreviewed") {
      throw new Error(`${label}.approval is invalid`)
    }
    const scope = record(value.demo_scope, `${label}.demo_scope`)
    const decision = scope.decision
    if (decision !== "publish-candidate" && decision !== "exclude-unreviewed") {
      throw new Error(`${label}.demo_scope.decision is invalid`)
    }
    const sourceUrl = text(value.source_url, `${label}.source_url`)
    const canonicalUrl = text(value.canonical_url, `${label}.canonical_url`)
    for (const [field, candidateUrl] of [
      ["source_url", sourceUrl],
      ["canonical_url", canonicalUrl],
    ] as const) {
      const url = new URL(candidateUrl)
      if (
        url.protocol !== "https:" ||
        !(
          url.hostname === "herbatica.ro" ||
          url.hostname.endsWith(".herbatica.ro")
        )
      ) {
        throw new Error(`${label}.${field} is not official herbatica.ro HTTPS`)
      }
    }
    const source = record(value.source, `${label}.source`)
    const officialHash = source.content_sha256
    if (
      officialHash !== null &&
      (typeof officialHash !== "string" || !SHA_256.test(officialHash))
    ) {
      throw new Error(`${label}.source.content_sha256 is invalid`)
    }
    const officialRetrievedAt = source.retrieved_at
    if (
      officialRetrievedAt !== null &&
      typeof officialRetrievedAt !== "string"
    ) {
      throw new Error(`${label}.source.retrieved_at is invalid`)
    }
    const matching = record(value.medusa_match, `${label}.medusa_match`)
    let medusaProductId: string | undefined
    if (decision === "publish-candidate") {
      if (value.matchingStatus !== "matched") {
        throw new Error(`${label}.matchingStatus must be matched`)
      }
      if (matching.status !== "matched" || matching.method !== "exact_ean") {
        throw new Error(`${label} publish-candidate is not an exact EAN match`)
      }
      const medusa = record(matching.medusa, `${label}.medusa_match.medusa`)
      medusaProductId = text(
        medusa.product_id,
        `${label}.medusa_match.medusa.product_id`
      )
      if (value.medusaProductId !== medusaProductId) {
        throw new Error(`${label}.medusaProductId binding disagrees`)
      }
      const officialIdentity = record(
        matching.official_identity,
        `${label}.medusa_match.official_identity`
      )
      if (
        nullableText(value.ean, `${label}.ean`) !==
        nullableText(officialIdentity.ean, `${label}.official_identity.ean`)
      ) {
        throw new Error(`${label} exact EAN identity disagrees with source`)
      }
    } else if (
      value.matchingStatus !== "excluded" ||
      !(
        value.medusaProductId === null ||
        (typeof value.medusaProductId === "string" &&
          value.medusaProductId.trim())
      ) ||
      typeof value.exclusionReason !== "string" ||
      !value.exclusionReason.trim()
    ) {
      throw new Error(`${label} excluded binding is invalid`)
    }
    const retrievedAt = officialRetrievedAt
      ? canonicalTimestamp(officialRetrievedAt, `${label}.source.retrieved_at`)
      : normalizedMergedEvidenceCapturedAt
    const contentSha256 =
      typeof officialHash === "string"
        ? officialHash
        : createHash("sha256").update(rawLine).digest("hex")
    products.push({
      canonicalSlug: text(value.canonical_slug, `${label}.canonical_slug`),
      description: text(value.description_html, `${label}.description_html`),
      ean: nullableText(value.ean, `${label}.ean`),
      matchingStatus:
        decision === "publish-candidate" ? "exact-bijective" : "excluded",
      ...(medusaProductId ? { medusaProductId } : {}),
      sku: nullableText(value.sku, `${label}.sku`),
      source: {
        contentSha256,
        evidenceKind:
          typeof officialHash === "string" ? "official-page" : "merged-record",
        retrievedAt,
        url: canonicalUrl,
      },
      title: text(value.h1, `${label}.h1`),
    })
  }
  const published = products.filter(
    ({ matchingStatus }) => matchingStatus === "exact-bijective"
  ).length
  const excluded = products.length - published
  if (
    products.length !== expectedPartition.total ||
    published !== expectedPartition.published ||
    excluded !== expectedPartition.excluded
  ) {
    throw new Error(
      `Merged product partition must be ${expectedPartition.total}/${expectedPartition.published}/${expectedPartition.excluded}; observed ${products.length}/${published}/${excluded}`
    )
  }
  return products
}
