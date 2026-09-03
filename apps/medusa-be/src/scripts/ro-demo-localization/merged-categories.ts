import { createHash } from "node:crypto"
import type { DemoOfficialCategory } from "./types"

const LINE_BREAK = /\r?\n/

const object = (value: unknown, label: string): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const nonblank = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a nonblank string`)
  }
  return value.trim()
}

export const parseMergedDemoCategoryJsonl = (
  contents: string,
  evidence: Readonly<{ retrievedAt: string; url: string }>
): Readonly<{
  categories: readonly DemoOfficialCategory[]
  excludedMedusaIds: readonly string[]
}> => {
  const categories: DemoOfficialCategory[] = []
  const excludedMedusaIds: string[] = []
  const ids = new Set<string>()
  for (const [index, rawLine] of contents.split(LINE_BREAK).entries()) {
    if (!rawLine.trim()) {
      continue
    }
    const label = `Merged category JSONL line ${index + 1}`
    let parsed: unknown
    try {
      parsed = JSON.parse(rawLine)
    } catch {
      throw new Error(`${label} is not valid JSON`)
    }
    const row = object(parsed, label)
    if (
      row.schemaVersion !== 1 ||
      row.approval !== "demo-generated-unreviewed" ||
      row.market !== "ro" ||
      row.locale !== "ro-RO"
    ) {
      throw new Error(`${label} identity is invalid`)
    }
    const id = nonblank(row.medusa_id, `${label}.medusa_id`)
    if (ids.has(id)) {
      throw new Error(`${label} duplicates Medusa category ${id}`)
    }
    ids.add(id)
    const provenance = object(row.provenance, `${label}.provenance`)
    if (
      provenance.kind !== "demo-generated-unreviewed" ||
      provenance.copySource !== "agent-generated-unreviewed" ||
      provenance.sourceMedusaId !== id
    ) {
      throw new Error(`${label}.provenance is invalid`)
    }
    const publication = object(row.publication, `${label}.publication`)
    if (
      publication.status !== "publish-candidate" &&
      publication.status !== "excluded-ro-preserve-sk"
    ) {
      throw new Error(`${label}.publication.status is invalid`)
    }
    if (publication.status === "excluded-ro-preserve-sk") {
      excludedMedusaIds.push(id)
    }
    const translation = object(row.translation, `${label}.translation`)
    const fields = [
      "bottom_description_html",
      "description",
      "meta_description",
      "meta_title",
      "name",
      "top_description_html",
    ] as const
    for (const field of fields) {
      if (!Object.hasOwn(translation, field)) {
        throw new Error(`${label}.translation is missing ${field}`)
      }
      if (
        translation[field] !== null &&
        typeof translation[field] !== "string"
      ) {
        throw new Error(`${label}.translation.${field} is invalid`)
      }
    }
    categories.push({
      copySource: "agent-generated-unreviewed",
      key: { kind: "medusa_id", value: id },
      publicSlug: nonblank(row.publicSlug, `${label}.publicSlug`),
      source: {
        contentSha256: createHash("sha256").update(rawLine).digest("hex"),
        retrievedAt: evidence.retrievedAt,
        url: evidence.url,
      },
      translation: translation as DemoOfficialCategory["translation"],
    })
  }
  if (categories.length !== 209 || excludedMedusaIds.length !== 2) {
    throw new Error(
      `Merged category partition must be 209/207/2; observed ${categories.length}/${categories.length - excludedMedusaIds.length}/${excludedMedusaIds.length}`
    )
  }
  return {
    categories: categories.sort((left, right) =>
      left.key.value.localeCompare(right.key.value, "en")
    ),
    excludedMedusaIds: excludedMedusaIds.sort((left, right) =>
      left.localeCompare(right, "en")
    ),
  }
}
