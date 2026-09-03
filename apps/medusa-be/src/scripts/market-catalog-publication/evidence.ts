import { lstat, readFile } from "node:fs/promises"
import {
  assertCzechCatalogPublicationGrade,
  parseCzechCatalogSourceAttestation,
} from "../catalog-source-cz/generator"
import {
  hashCatalogTranslationBytes,
  hashCatalogTranslationValue,
} from "../catalog-translation-pipeline/canonical"
import type {
  CatalogTranslationInput,
  CatalogTranslationReference,
} from "../catalog-translation-pipeline/types"
import type { MarketCatalogPublicationManifest } from "./types"

const REQUIRED_FIELDS: Readonly<
  Record<CatalogTranslationReference, readonly string[]>
> = {
  brand: ["title"],
  product: ["description", "title"],
  product_category: ["name"],
  product_content: [],
}

const readStablePrivateArtifact = async (path: string) => {
  const before = await lstat(path)
  if (
    !before.isFile() ||
    before.isSymbolicLink() ||
    before.nlink !== 1 ||
    // biome-ignore lint/suspicious/noBitwiseOperators: POSIX permission masks are bit fields.
    (before.mode & 0o077) !== 0 ||
    (typeof process.getuid === "function" && before.uid !== process.getuid())
  ) {
    throw new Error(
      "CZ source attestation must be an owner-private regular single-link file"
    )
  }
  const bytes = await readFile(path)
  const after = await lstat(path)
  if (
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size ||
    before.mtimeMs !== after.mtimeMs
  ) {
    throw new Error("CZ source attestation changed while read")
  }
  return bytes
}

export const assertMarketCatalogPublicationTranslationEvidence = async (
  manifest: MarketCatalogPublicationManifest,
  input: CatalogTranslationInput
) => {
  if (manifest.market !== "cz") {
    return
  }
  if (input.sourceArtifacts.length !== 1) {
    throw new Error(
      "CZ publication requires exactly one field-level source attestation"
    )
  }
  const sourceArtifact = input.sourceArtifacts[0]
  if (!sourceArtifact) {
    throw new Error("CZ publication source attestation is missing")
  }
  const bytes = await readStablePrivateArtifact(sourceArtifact.path)
  if (hashCatalogTranslationBytes(bytes) !== sourceArtifact.sha256) {
    throw new Error("CZ source attestation hash does not match the input")
  }
  let raw: unknown
  try {
    raw = JSON.parse(bytes.toString("utf8"))
  } catch (error) {
    throw new Error(
      `CZ source attestation is not JSON: ${(error as Error).message}`
    )
  }
  const attestation = parseCzechCatalogSourceAttestation(raw)
  const records = new Map(
    attestation.records.map((record) => [
      `${record.reference}\u0000${record.referenceId}`,
      record,
    ])
  )
  if (records.size !== input.entries.length) {
    throw new Error(
      "CZ source attestation does not exactly cover the translation input"
    )
  }
  for (const entry of input.entries) {
    const label = `${entry.reference}:${entry.referenceId}`
    const record = records.get(`${entry.reference}\u0000${entry.referenceId}`)
    if (
      !record ||
      entry.localeCode !== "cs-CZ" ||
      entry.provenance.artifactSha256 !== sourceArtifact.sha256 ||
      entry.provenance.sourceReference !== record.sourceReference ||
      hashCatalogTranslationValue(entry.translations) !==
        hashCatalogTranslationValue(record.translations)
    ) {
      throw new Error(`${label} is not bound to its exact CZ source evidence`)
    }
    const nonNullFields = Object.entries(entry.translations)
      .filter(([, value]) => typeof value === "string" && value.trim() !== "")
      .map(([field]) => field)
    const requiredFields = [
      ...new Set([...REQUIRED_FIELDS[entry.reference], ...nonNullFields]),
    ].sort()
    assertCzechCatalogPublicationGrade(record.fields, requiredFields, label)
  }
}
