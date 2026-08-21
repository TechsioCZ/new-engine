import { createHash } from "node:crypto"
import { isAbsolute } from "node:path"
import {
  hashCatalogTranslationValue,
  stableCatalogTranslationJson,
} from "../catalog-translation-pipeline/canonical"
import type {
  CatalogTranslationInput,
  CatalogTranslationInputEntry,
  CatalogTranslationReference,
} from "../catalog-translation-pipeline/types"
import {
  HUNGARIAN_CATALOG_SOURCE_CONTRACT,
  type HungarianCatalogSemanticAttestation,
  type HungarianCatalogSourceAuthority,
  type HungarianCatalogSourceBundle,
  type HungarianCatalogSourceContract,
  type HungarianCatalogSourceEnvironment,
  type HungarianCatalogSourceFiles,
  type HungarianCatalogSourceLedgerRow,
  type HungarianCatalogSourcePreimage,
  type HungarianCatalogTranslationRow,
} from "./types"

const LINE_BREAK = /\r?\n/
const SHA_256 = /^[a-f0-9]{64}$/
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_:-]{0,255}$/
const ENVIRONMENT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const FORBIDDEN_TEST_ENVIRONMENT =
  /(?:^|[-_.])(live|prod|production)(?:$|[-_.])/i
const REFERENCES: readonly CatalogTranslationReference[] = [
  "brand",
  "product",
  "product_category",
  "product_content",
]
const FIELDS_BY_REFERENCE: Readonly<
  Record<CatalogTranslationReference, readonly string[]>
> = {
  brand: ["title"],
  product: ["description", "subtitle", "title"],
  product_category: [
    "bottom_description_html",
    "description",
    "meta_description",
    "meta_title",
    "name",
    "top_description_html",
  ],
  product_content: ["composition", "other", "usage", "warning"],
}

type JsonRecord = Record<string, unknown>

const bytesSha256 = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex")

const record = (value: unknown, label: string): JsonRecord => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`${label} must be an object`)
  }
  return value as JsonRecord
}

const exactKeys = (
  value: JsonRecord,
  keys: readonly string[],
  label: string
) => {
  const actual = Object.keys(value)
  if (
    actual.length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  ) {
    throw new Error(`${label} fields are invalid`)
  }
}

const text = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a nonblank string`)
  }
  return value
}

const identifier = (value: unknown, label: string): string => {
  const result = text(value, label)
  if (!IDENTIFIER.test(result)) {
    throw new Error(`${label} is invalid`)
  }
  return result
}

const json = (bytes: Uint8Array, label: string): unknown => {
  try {
    return JSON.parse(Buffer.from(bytes).toString("utf8"))
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${(error as Error).message}`)
  }
}

const jsonl = (bytes: Uint8Array, label: string): readonly JsonRecord[] => {
  const source = Buffer.from(bytes).toString("utf8")
  if (!source.endsWith("\n")) {
    throw new Error(`${label} must end with LF`)
  }
  return source.split(LINE_BREAK).flatMap((line, index) => {
    if (!line) {
      return []
    }
    try {
      return [record(JSON.parse(line), `${label} line ${index + 1}`)]
    } catch (error) {
      throw new Error(
        `${label} line ${index + 1} is invalid: ${(error as Error).message}`
      )
    }
  })
}

const parseReference = (
  value: unknown,
  label: string
): CatalogTranslationReference => {
  if (!REFERENCES.includes(value as CatalogTranslationReference)) {
    throw new Error(`${label} is invalid`)
  }
  return value as CatalogTranslationReference
}

const translations = (
  value: unknown,
  reference: CatalogTranslationReference,
  label: string
): Readonly<Record<string, string | null>> => {
  const result = record(value, label)
  exactKeys(result, FIELDS_BY_REFERENCE[reference], label)
  for (const [field, candidate] of Object.entries(result)) {
    if (!(candidate === null || typeof candidate === "string")) {
      throw new Error(`${label}.${field} must be a string or null`)
    }
  }
  return result as Record<string, string | null>
}

const identity = (
  value: Readonly<{
    reference: CatalogTranslationReference
    referenceId: string
  }>
) => `${value.reference}\u0000${value.referenceId}`

const sortByIdentity = <
  Value extends Readonly<{
    reference: CatalogTranslationReference
    referenceId: string
  }>,
>(
  values: readonly Value[]
): readonly Value[] =>
  [...values].sort((left, right) =>
    identity(left).localeCompare(identity(right), "en")
  )

const uniqueByIdentity = <
  Value extends Readonly<{
    reference: CatalogTranslationReference
    referenceId: string
  }>,
>(
  values: readonly Value[],
  label: string
): ReadonlyMap<string, Value> => {
  const result = new Map<string, Value>()
  for (const value of values) {
    const key = identity(value)
    if (result.has(key)) {
      throw new Error(
        `${label} contains duplicate ${key.replace("\u0000", ":")}`
      )
    }
    result.set(key, value)
  }
  return result
}

const validateEnvironment = (
  environment: HungarianCatalogSourceEnvironment
) => {
  if (
    environment.kind !== "test" ||
    !ENVIRONMENT_ID.test(environment.environmentId) ||
    FORBIDDEN_TEST_ENVIRONMENT.test(environment.environmentId) ||
    !SHA_256.test(environment.databaseInstanceFingerprint)
  ) {
    throw new Error(
      "environment must identify an exact non-production test database"
    )
  }
}

const validateInventory = (
  value: unknown,
  contract: HungarianCatalogSourceContract
) => {
  const inventory = record(value, "canonical source inventory")
  exactKeys(
    inventory,
    ["brands", "categories", "productContents", "products"],
    "canonical source inventory"
  )
  for (const [name, expected] of Object.entries(contract)) {
    if (inventory[name] !== expected) {
      throw new Error(
        `canonical source inventory.${name} must be exactly ${expected}`
      )
    }
  }
}

const parseCanonicalEntries = (
  value: unknown,
  contract: HungarianCatalogSourceContract,
  environment: HungarianCatalogSourceEnvironment
) => {
  const manifest = record(value, "canonical source manifest")
  if (
    manifest.schemaVersion !== 1 ||
    manifest.mode !== "normalize-source" ||
    manifest.sourceLocale !== "sk-SK" ||
    manifest.targetLocale !== "sk-SK"
  ) {
    throw new Error("canonical source manifest header is invalid")
  }
  validateInventory(manifest.inventory, contract)
  if (
    stableCatalogTranslationJson(manifest.environment) !==
    stableCatalogTranslationJson(environment)
  ) {
    throw new Error(
      "canonical source environment does not match the target environment"
    )
  }
  if (!Array.isArray(manifest.entries)) {
    throw new Error("canonical source manifest entries must be an array")
  }
  const entries = manifest.entries.map((candidate, index) => {
    const label = `canonical source entry ${index}`
    const source = record(candidate, label)
    const reference = parseReference(source.reference, `${label}.reference`)
    const provenance = record(source.provenance, `${label}.provenance`)
    if (
      source.localeCode !== "sk-SK" ||
      provenance.method !== "canonical-source"
    ) {
      throw new Error(`${label} is not canonical sk-SK source content`)
    }
    return {
      reference,
      referenceId: identifier(source.referenceId, `${label}.referenceId`),
      translations: translations(
        source.translations,
        reference,
        `${label}.translations`
      ),
    }
  })
  uniqueByIdentity(entries, "canonical source entries")
  assertReferenceCounts(entries, contract, "canonical source")
  return entries
}

const parseHungarianRows = (
  bytes: Uint8Array
): readonly HungarianCatalogTranslationRow[] =>
  jsonl(bytes, "Hungarian translations").map((candidate, index) => {
    const label = `Hungarian translations line ${index + 1}`
    exactKeys(
      candidate,
      [
        "localeCode",
        "method",
        "reference",
        "referenceId",
        "sourceReference",
        "translations",
      ],
      label
    )
    const reference = parseReference(candidate.reference, `${label}.reference`)
    if (candidate.localeCode !== "hu-HU") {
      throw new Error(`${label}.localeCode must be hu-HU`)
    }
    if (
      candidate.method !== "ai-generated" &&
      candidate.method !== "existing-reviewed-artifact"
    ) {
      throw new Error(`${label}.method is invalid`)
    }
    return {
      localeCode: "hu-HU",
      method: candidate.method,
      reference,
      referenceId: identifier(candidate.referenceId, `${label}.referenceId`),
      sourceReference: text(
        candidate.sourceReference,
        `${label}.sourceReference`
      ),
      translations: translations(
        candidate.translations,
        reference,
        `${label}.translations`
      ),
    }
  })

const assertReferenceCounts = (
  values: readonly Readonly<{
    reference: CatalogTranslationReference
  }>[],
  contract: HungarianCatalogSourceContract,
  label: string
) => {
  const expected: Readonly<Record<CatalogTranslationReference, number>> = {
    brand: contract.brands,
    product: contract.products,
    product_category: contract.categories,
    product_content: contract.productContents,
  }
  for (const reference of REFERENCES) {
    const actual = values.filter(
      (value) => value.reference === reference
    ).length
    if (actual !== expected[reference]) {
      throw new Error(
        `${label} ${reference} count must be ${expected[reference]}; observed ${actual}`
      )
    }
  }
}

const assertTranslationCompleteness = (
  source: Readonly<Record<string, string | null>>,
  target: Readonly<Record<string, string | null>>,
  label: string
) => {
  for (const [field, sourceValue] of Object.entries(source)) {
    const targetValue = target[field]
    if (sourceValue?.trim()) {
      if (!targetValue?.trim()) {
        throw new Error(
          `${label}.${field} must translate nonblank sk-SK source`
        )
      }
    } else if (targetValue !== null) {
      throw new Error(
        `${label}.${field} must be null when sk-SK source is blank`
      )
    }
  }
}

export const buildHungarianCatalogSourceBundle = (
  files: HungarianCatalogSourceFiles,
  environment: HungarianCatalogSourceEnvironment,
  contract: HungarianCatalogSourceContract = HUNGARIAN_CATALOG_SOURCE_CONTRACT
): HungarianCatalogSourceBundle => {
  validateEnvironment(environment)
  for (const [name, path] of Object.entries(files.sourcePaths)) {
    if (!isAbsolute(path)) {
      throw new Error(`${name} source path must be absolute`)
    }
  }
  if (!isAbsolute(files.attestationOutputPath)) {
    throw new Error("semantic attestation output path must be absolute")
  }

  const sourceEntries = parseCanonicalEntries(
    json(files.canonicalSourceManifest, "canonical source manifest"),
    contract,
    environment
  )
  const rows = parseHungarianRows(files.hungarianTranslations)
  assertReferenceCounts(rows, contract, "Hungarian translation")
  const sourceByIdentity = uniqueByIdentity(
    sourceEntries,
    "canonical source entries"
  )
  const rowByIdentity = uniqueByIdentity(rows, "Hungarian translations")
  if (sourceByIdentity.size !== rowByIdentity.size) {
    throw new Error(
      "Hungarian translation IDs do not match the canonical source"
    )
  }
  for (const [key, source] of sourceByIdentity) {
    const row = rowByIdentity.get(key)
    if (!row) {
      throw new Error(
        "Hungarian translation IDs do not match the canonical source"
      )
    }
    assertTranslationCompleteness(
      source.translations,
      row.translations,
      `Hungarian translation ${key.replace("\u0000", ":")}`
    )
  }

  const normalizedRows = sortByIdentity(rows)
  const preimages: readonly HungarianCatalogSourcePreimage[] = sortByIdentity(
    sourceEntries.map((source) => ({
      reference: source.reference,
      referenceId: source.referenceId,
      sourceRecordSha256: hashCatalogTranslationValue(source.translations),
      values: source.translations,
    }))
  )
  const ledger: readonly HungarianCatalogSourceLedgerRow[] = normalizedRows.map(
    (row) => {
      const source = sourceByIdentity.get(identity(row))
      if (!source) {
        throw new Error(
          "Hungarian translation IDs do not match the canonical source"
        )
      }
      return {
        localeCode: "hu-HU",
        method: row.method,
        reference: row.reference,
        referenceId: row.referenceId,
        sourceRecordSha256: hashCatalogTranslationValue(source.translations),
        sourceReference: row.sourceReference,
        translationRecordSha256: hashCatalogTranslationValue(row.translations),
      }
    }
  )
  const attestation: HungarianCatalogSemanticAttestation = {
    records: normalizedRows.map((row) => ({
      reference: row.reference,
      referenceId: row.referenceId,
      sourceReference: row.sourceReference,
      translations: row.translations,
    })),
    schemaVersion: 1,
  }
  const attestationSha256 = bytesSha256(
    Buffer.from(`${stableCatalogTranslationJson(attestation)}\n`)
  )
  const entries: readonly CatalogTranslationInputEntry[] = normalizedRows.map(
    (row) => ({
      localeCode: "hu-HU",
      provenance: {
        artifactSha256: attestationSha256,
        method: row.method,
        sourceReference: row.sourceReference,
      },
      reference: row.reference,
      referenceId: row.referenceId,
      translations: row.translations,
    })
  )
  const manifest: CatalogTranslationInput = {
    entries,
    environment,
    inventory: contract,
    mode: "replace",
    schemaVersion: 1,
    sourceArtifacts: [
      { path: files.attestationOutputPath, sha256: attestationSha256 },
    ],
    sourceLocale: "sk-SK",
    targetLocale: "hu-HU",
  }
  const authority: HungarianCatalogSourceAuthority = {
    inventory: contract,
    ledgerSha256: bytesSha256(
      Buffer.from(
        `${ledger.map((row) => stableCatalogTranslationJson(row)).join("\n")}\n`
      )
    ),
    localeCode: "hu-HU",
    manifestSha256: bytesSha256(
      Buffer.from(`${stableCatalogTranslationJson(manifest)}\n`)
    ),
    preimagesSha256: hashCatalogTranslationValue(preimages),
    records: {
      aiGenerated: rows.filter(({ method }) => method === "ai-generated")
        .length,
      existingReviewedArtifact: rows.filter(
        ({ method }) => method === "existing-reviewed-artifact"
      ).length,
      total: rows.length,
    },
    schemaVersion: 1,
    semanticAttestation: {
      path: files.attestationOutputPath,
      records: attestation.records.length,
      sha256: attestationSha256,
    },
    sourceArtifacts: {
      canonicalSourceManifestSha256: bytesSha256(files.canonicalSourceManifest),
      hungarianTranslationsSha256: bytesSha256(files.hungarianTranslations),
    },
    sourceLocale: "sk-SK",
  }
  return { attestation, authority, ledger, manifest, preimages }
}
