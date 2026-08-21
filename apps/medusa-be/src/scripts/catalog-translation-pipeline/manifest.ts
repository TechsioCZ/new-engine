import { lstat, readFile } from "node:fs/promises"
import { extname, isAbsolute, resolve } from "node:path"
import { hashCatalogTranslationBytes } from "./canonical"
import {
  CATALOG_TRANSLATION_EXACT_INVENTORY,
  CATALOG_TRANSLATION_SOURCE_LOCALE,
  CATALOG_TRANSLATION_TARGET_LOCALES,
  type CatalogTranslationCliOptions,
  type CatalogTranslationInput,
  type CatalogTranslationInputEntry,
  type CatalogTranslationLocale,
  type CatalogTranslationReference,
} from "./types"

const SHA_256 = /^[a-f0-9]{64}$/
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_:-]{0,255}$/
const ENVIRONMENT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const FORBIDDEN_TEST_ENVIRONMENTS =
  /(?:^|[-_.])(live|prod|production)(?:$|[-_.])/i
const TARGET_LOCALES = new Set<string>(CATALOG_TRANSLATION_TARGET_LOCALES)
const ALL_PIPELINE_LOCALES = new Set<string>([
  CATALOG_TRANSLATION_SOURCE_LOCALE,
  ...CATALOG_TRANSLATION_TARGET_LOCALES,
])
const REFERENCES = new Set<string>([
  "brand",
  "product",
  "product_category",
  "product_content",
])
const FIELDS_BY_REFERENCE: Readonly<
  Record<CatalogTranslationReference, ReadonlySet<string>>
> = {
  brand: new Set(["title"]),
  product: new Set(["description", "subtitle", "title"]),
  product_category: new Set([
    "bottom_description_html",
    "description",
    "meta_description",
    "meta_title",
    "name",
    "top_description_html",
  ]),
  product_content: new Set(["composition", "other", "usage", "warning"]),
}

const asRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const exactKeys = (
  value: Record<string, unknown>,
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

const requiredString = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`)
  }
  return value
}

const parseEntry = (
  value: unknown,
  index: number,
  mode: CatalogTranslationInput["mode"]
): CatalogTranslationInputEntry => {
  const label = `input.entries[${index}]`
  const entry = asRecord(value, label)
  exactKeys(
    entry,
    ["localeCode", "provenance", "reference", "referenceId", "translations"],
    label
  )
  if (!ALL_PIPELINE_LOCALES.has(String(entry.localeCode))) {
    throw new Error(`${label}.localeCode is not a supported pipeline locale`)
  }
  if (!REFERENCES.has(String(entry.reference))) {
    throw new Error(`${label}.reference is invalid`)
  }
  const reference = entry.reference as CatalogTranslationReference
  const referenceId = requiredString(entry.referenceId, `${label}.referenceId`)
  if (!IDENTIFIER.test(referenceId)) {
    throw new Error(`${label}.referenceId is invalid`)
  }
  const translations = asRecord(entry.translations, `${label}.translations`)
  const allowedFields = FIELDS_BY_REFERENCE[reference]
  const fields = Object.keys(translations)
  if (
    fields.length !== allowedFields.size ||
    fields.some((field) => !allowedFields.has(field))
  ) {
    throw new Error(`${label}.translations must contain the exact field set`)
  }
  for (const [field, fieldValue] of Object.entries(translations)) {
    if (
      !(
        fieldValue === null ||
        (typeof fieldValue === "string" &&
          (mode === "normalize-source" || fieldValue.trim().length > 0))
      )
    ) {
      throw new Error(`${label}.translations.${field} is invalid`)
    }
  }
  const provenance = asRecord(entry.provenance, `${label}.provenance`)
  exactKeys(
    provenance,
    ["artifactSha256", "method", "sourceReference"],
    `${label}.provenance`
  )
  if (
    !SHA_256.test(String(provenance.artifactSha256)) ||
    (provenance.method !== "ai-generated" &&
      provenance.method !== "canonical-source" &&
      provenance.method !== "existing-reviewed-artifact")
  ) {
    throw new Error(`${label}.provenance is invalid`)
  }
  return {
    localeCode: entry.localeCode as CatalogTranslationLocale,
    provenance: {
      artifactSha256: provenance.artifactSha256 as string,
      method: provenance.method,
      sourceReference: requiredString(
        provenance.sourceReference,
        `${label}.provenance.sourceReference`
      ),
    },
    reference,
    referenceId,
    translations: translations as Record<string, string | null>,
  }
}

export const parseCatalogTranslationInput = (
  value: unknown
): CatalogTranslationInput => {
  const input = asRecord(value, "input")
  exactKeys(
    input,
    [
      "entries",
      "environment",
      "inventory",
      "mode",
      "schemaVersion",
      "sourceLocale",
      "sourceArtifacts",
      "targetLocale",
    ],
    "input"
  )
  if (
    input.schemaVersion !== 1 ||
    (input.mode !== "replace" && input.mode !== "normalize-source") ||
    input.sourceLocale !== CATALOG_TRANSLATION_SOURCE_LOCALE ||
    !ALL_PIPELINE_LOCALES.has(String(input.targetLocale)) ||
    !Array.isArray(input.entries) ||
    input.entries.length === 0
  ) {
    throw new Error("input header is invalid")
  }
  const environment = asRecord(input.environment, "input.environment")
  exactKeys(
    environment,
    ["databaseInstanceFingerprint", "environmentId", "kind"],
    "input.environment"
  )
  if (
    environment.kind !== "test" ||
    !SHA_256.test(String(environment.databaseInstanceFingerprint)) ||
    typeof environment.environmentId !== "string" ||
    !ENVIRONMENT_ID.test(environment.environmentId) ||
    FORBIDDEN_TEST_ENVIRONMENTS.test(environment.environmentId)
  ) {
    throw new Error(
      "input.environment must identify a non-production test environment"
    )
  }
  const entries = input.entries.map((entry, index) =>
    parseEntry(entry, index, input.mode as CatalogTranslationInput["mode"])
  )
  if (
    !Array.isArray(input.sourceArtifacts) ||
    input.sourceArtifacts.length < 1
  ) {
    throw new Error("input.sourceArtifacts must be a non-empty array")
  }
  const sourceArtifacts = input.sourceArtifacts.map((candidate, index) => {
    const label = `input.sourceArtifacts[${index}]`
    const artifact = asRecord(candidate, label)
    exactKeys(artifact, ["path", "sha256"], label)
    if (
      typeof artifact.path !== "string" ||
      !isAbsolute(artifact.path) ||
      !SHA_256.test(String(artifact.sha256))
    ) {
      throw new Error(`${label} is invalid`)
    }
    return { path: artifact.path, sha256: artifact.sha256 as string }
  })
  if (
    new Set(sourceArtifacts.map(({ path }) => path)).size !==
    sourceArtifacts.length
  ) {
    throw new Error("input.sourceArtifacts paths must be unique")
  }
  const sourceArtifactHashes = new Set(
    sourceArtifacts.map(({ sha256 }) => sha256)
  )
  const inventoryValue = asRecord(input.inventory, "input.inventory")
  exactKeys(
    inventoryValue,
    ["brands", "categories", "productContents", "products"],
    "input.inventory"
  )
  const inventory = Object.fromEntries(
    Object.entries(inventoryValue).map(([key, count]) => {
      if (!Number.isSafeInteger(count) || (count as number) < 1) {
        throw new Error(`input.inventory.${key} must be a positive integer`)
      }
      return [key, count]
    })
  ) as CatalogTranslationInput["inventory"]
  if (
    Object.entries(CATALOG_TRANSLATION_EXACT_INVENTORY).some(
      ([key, count]) => inventory[key as keyof typeof inventory] !== count
    )
  ) {
    throw new Error("input.inventory does not match the frozen exact inventory")
  }
  const identities = new Set<string>()
  for (const entry of entries) {
    if (!sourceArtifactHashes.has(entry.provenance.artifactSha256)) {
      throw new Error(
        "entry provenance does not reference a declared source artifact"
      )
    }
    if (entry.localeCode !== input.targetLocale) {
      throw new Error("every entry must use input.targetLocale")
    }
    if (
      input.mode === "normalize-source" &&
      (input.targetLocale !== CATALOG_TRANSLATION_SOURCE_LOCALE ||
        entry.provenance.method !== "canonical-source")
    ) {
      throw new Error(
        "normalize-source is restricted to canonical sk-SK provenance"
      )
    }
    if (
      input.mode === "replace" &&
      (!TARGET_LOCALES.has(String(input.targetLocale)) ||
        entry.provenance.method === "canonical-source")
    ) {
      throw new Error("replace is restricted to non-source target locales")
    }
    const identity = `${entry.localeCode}\u0000${entry.reference}\u0000${entry.referenceId}`
    if (identities.has(identity)) {
      throw new Error(
        `duplicate translation identity ${identity.replaceAll("\u0000", ":")}`
      )
    }
    identities.add(identity)
  }
  const expectedCountByReference: Readonly<
    Record<CatalogTranslationReference, number>
  > = {
    brand: inventory.brands,
    product: inventory.products,
    product_category: inventory.categories,
    product_content: inventory.productContents,
  }
  for (const localeCode of new Set(entries.map((entry) => entry.localeCode))) {
    for (const reference of REFERENCES as Set<CatalogTranslationReference>) {
      const count = entries.filter(
        (entry) =>
          entry.localeCode === localeCode && entry.reference === reference
      ).length
      if (count !== expectedCountByReference[reference]) {
        throw new Error(
          `${localeCode} ${reference} entries must match the exact inventory count`
        )
      }
    }
  }
  for (const reference of REFERENCES as Set<CatalogTranslationReference>) {
    const uniqueIds = new Set(
      entries.flatMap((entry) =>
        entry.reference === reference ? [entry.referenceId] : []
      )
    )
    if (uniqueIds.size !== expectedCountByReference[reference]) {
      throw new Error(
        `${reference} IDs must be the same exact inventory in every target locale`
      )
    }
  }
  return {
    entries,
    environment: {
      databaseInstanceFingerprint:
        environment.databaseInstanceFingerprint as string,
      environmentId: environment.environmentId,
      kind: "test",
    },
    inventory,
    mode: input.mode,
    schemaVersion: 1,
    sourceLocale: CATALOG_TRANSLATION_SOURCE_LOCALE,
    sourceArtifacts,
    targetLocale: input.targetLocale as CatalogTranslationLocale,
  }
}

export const loadCatalogTranslationInput = async (inputPath: string) => {
  const absolutePath = resolve(inputPath)
  const bytes = await readFile(absolutePath)
  let parsed: unknown
  try {
    parsed = JSON.parse(bytes.toString("utf8"))
  } catch (error) {
    throw new Error(`input is not valid JSON: ${(error as Error).message}`)
  }
  const input = parseCatalogTranslationInput(parsed)
  for (const artifact of input.sourceArtifacts) {
    const before = await lstat(artifact.path).catch(() => {
      throw new Error(`source artifact does not exist: ${artifact.path}`)
    })
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1) {
      throw new Error(
        `source artifact is not a private regular file: ${artifact.path}`
      )
    }
    const artifactBytes = await readFile(artifact.path)
    const after = await lstat(artifact.path)
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      hashCatalogTranslationBytes(artifactBytes) !== artifact.sha256
    ) {
      throw new Error(`source artifact bytes do not match: ${artifact.path}`)
    }
  }
  return {
    absolutePath,
    input,
    inputSha256: hashCatalogTranslationBytes(bytes),
  }
}

const parsePositiveInteger = (value: string, label: string) => {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 500) {
    throw new Error(`${label} must be an integer from 1 to 500`)
  }
  return parsed
}

const absoluteJsonPath = (value: string | undefined, label: string) => {
  if (!(value && isAbsolute(value)) || extname(value) !== ".json") {
    throw new Error(`${label} must be an absolute .json path`)
  }
  return value
}

type MutableCliOptions = {
  chunkSize: number
  confirmPlanHash?: string
  inputPath?: string
  planOutputPath?: string
  receiptOutputPath?: string
  rollbackOutputPath?: string
}

const assignCliValue = (
  options: MutableCliOptions,
  name: string,
  value: string
) => {
  switch (name) {
    case "--chunk-size":
      options.chunkSize = parsePositiveInteger(value, name)
      break
    case "--confirm-plan-hash":
      options.confirmPlanHash = value
      break
    case "--input":
      options.inputPath = value
      break
    case "--plan-output":
      options.planOutputPath = value
      break
    case "--receipt-output":
      options.receiptOutputPath = value
      break
    case "--rollback-output":
      options.rollbackOutputPath = value
      break
    default:
      throw new Error(`Unknown argument: ${name}`)
  }
}

export const parseCatalogTranslationCliOptions = (
  args: readonly string[]
): CatalogTranslationCliOptions => {
  let apply = false
  const parsedOptions: MutableCliOptions = { chunkSize: 100 }
  const takeValue = (argument: string, index: number) => {
    const inline = argument.indexOf("=")
    if (inline >= 0) {
      return { consumed: 0, value: argument.slice(inline + 1) }
    }
    return { consumed: 1, value: args[index + 1] }
  }
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index] ?? ""
    if (argument === "--apply") {
      apply = true
      continue
    }
    const name = argument.split("=", 1)[0] ?? ""
    const { consumed, value } = takeValue(argument, index)
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${name}`)
    }
    index += consumed
    assignCliValue(parsedOptions, name, value)
  }
  const {
    chunkSize,
    confirmPlanHash,
    inputPath,
    planOutputPath,
    receiptOutputPath,
    rollbackOutputPath,
  } = parsedOptions
  if (confirmPlanHash !== undefined && !SHA_256.test(confirmPlanHash)) {
    throw new Error("--confirm-plan-hash must be a lowercase SHA-256")
  }
  if (apply && !(confirmPlanHash && receiptOutputPath && rollbackOutputPath)) {
    throw new Error(
      "--apply requires --confirm-plan-hash, --rollback-output and --receipt-output"
    )
  }
  if (!apply && (confirmPlanHash || receiptOutputPath || rollbackOutputPath)) {
    throw new Error(
      "confirmation and receipt options are valid only with --apply"
    )
  }
  return {
    apply,
    chunkSize,
    ...(confirmPlanHash ? { confirmPlanHash } : {}),
    inputPath: absoluteJsonPath(inputPath, "--input"),
    planOutputPath: absoluteJsonPath(planOutputPath, "--plan-output"),
    ...(receiptOutputPath
      ? {
          receiptOutputPath: absoluteJsonPath(
            receiptOutputPath,
            "--receipt-output"
          ),
        }
      : {}),
    ...(rollbackOutputPath
      ? {
          rollbackOutputPath: absoluteJsonPath(
            rollbackOutputPath,
            "--rollback-output"
          ),
        }
      : {}),
  }
}
