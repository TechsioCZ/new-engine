import { randomUUID } from "node:crypto"
import { link, open, unlink } from "node:fs/promises"
import { extname, isAbsolute } from "node:path"
import type { RoCatalogSkProtectionAudit } from "./types"

export type RoCatalogSkBaselineArtifact = Readonly<{
  capturedAt: string
  provenance: "fresh-medusa-database-read"
  schemaVersion: 1
  skProtection: RoCatalogSkProtectionAudit
}>

const SHA_256 = /^[a-f0-9]{64}$/
const ISSUE_ENTITY_KINDS = new Set([
  "brand",
  "catalog",
  "category",
  "collection",
  "price",
  "product",
  "region",
])

const asRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const exactKeys = (
  record: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  label: string
) => {
  const actual = Object.keys(record)
  const allowed = new Set([...required, ...optional])
  if (
    required.some((key) => !Object.hasOwn(record, key)) ||
    actual.some((key) => !allowed.has(key))
  ) {
    throw new Error(`${label} fields are invalid`)
  }
}

const nonNegativeInteger = (value: unknown, label: string): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`${label} must be a non-negative safe integer`)
  }
  return value as number
}

const stateFingerprint = (value: unknown, label: string) => {
  const record = asRecord(value, label)
  exactKeys(record, ["count", "sha256"], [], label)
  if (typeof record.sha256 !== "string" || !SHA_256.test(record.sha256)) {
    throw new Error(`${label}.sha256 must be a lowercase SHA-256`)
  }
  return {
    count: nonNegativeInteger(record.count, `${label}.count`),
    sha256: record.sha256,
  }
}

export const parseRoCatalogSkBaselineArtifact = (
  value: unknown
): RoCatalogSkBaselineArtifact => {
  const root = asRecord(value, "SK baseline artifact")
  exactKeys(
    root,
    ["capturedAt", "provenance", "schemaVersion", "skProtection"],
    [],
    "SK baseline artifact"
  )
  if (
    root.schemaVersion !== 1 ||
    root.provenance !== "fresh-medusa-database-read" ||
    typeof root.capturedAt !== "string"
  ) {
    throw new Error("SK baseline artifact header is invalid")
  }
  const capturedAt = new Date(root.capturedAt)
  if (
    Number.isNaN(capturedAt.getTime()) ||
    capturedAt.toISOString() !== root.capturedAt
  ) {
    throw new Error("SK baseline artifact capturedAt must be ISO-8601 UTC")
  }
  const protection = asRecord(root.skProtection, "skProtection")
  exactKeys(
    protection,
    ["baseline", "issues", "publication", "sharedInventoryBaseline"],
    [],
    "skProtection"
  )
  if (!Array.isArray(protection.issues)) {
    throw new Error("skProtection.issues must be an array")
  }
  const issues: RoCatalogSkProtectionAudit["issues"] = protection.issues.map(
    (candidate, index) => {
      const label = `skProtection.issues[${index}]`
      const issue = asRecord(candidate, label)
      exactKeys(
        issue,
        ["code", "entityKind", "message", "severity"],
        ["entityId"],
        label
      )
      if (
        typeof issue.code !== "string" ||
        !issue.code ||
        typeof issue.message !== "string" ||
        !issue.message ||
        typeof issue.entityKind !== "string" ||
        !ISSUE_ENTITY_KINDS.has(issue.entityKind) ||
        (issue.severity !== "error" && issue.severity !== "warning") ||
        (issue.entityId !== undefined &&
          (typeof issue.entityId !== "string" || !issue.entityId))
      ) {
        throw new Error(`${label} is invalid`)
      }
      return {
        code: issue.code,
        ...(issue.entityId === undefined ? {} : { entityId: issue.entityId }),
        entityKind:
          issue.entityKind as RoCatalogSkProtectionAudit["issues"][number]["entityKind"],
        message: issue.message,
        severity: issue.severity,
      }
    }
  )
  const publication = asRecord(
    protection.publication,
    "skProtection.publication"
  )
  const publicationKeys = [
    "brands",
    "categories",
    "collections",
    "errors",
    "products",
  ] as const
  exactKeys(publication, publicationKeys, [], "skProtection.publication")
  const parsedPublication = Object.fromEntries(
    publicationKeys.map((key) => [
      key,
      nonNegativeInteger(publication[key], `skProtection.publication.${key}`),
    ])
  ) as RoCatalogSkProtectionAudit["publication"]
  if (
    parsedPublication.errors !==
    issues.filter(({ severity }) => severity === "error").length
  ) {
    throw new Error(
      "skProtection.publication.errors must match error-severity issues"
    )
  }
  return {
    capturedAt: root.capturedAt,
    provenance: "fresh-medusa-database-read",
    schemaVersion: 1,
    skProtection: {
      baseline: stateFingerprint(protection.baseline, "skProtection.baseline"),
      issues,
      publication: parsedPublication,
      sharedInventoryBaseline: stateFingerprint(
        protection.sharedInventoryBaseline,
        "skProtection.sharedInventoryBaseline"
      ),
    },
  }
}

const readFlagValue = (args: readonly string[], index: number) => {
  const argument = args[index]
  if (argument?.startsWith("--output=")) {
    return { consumed: 0, value: argument.slice("--output=".length) }
  }
  return { consumed: 1, value: args[index + 1] }
}

export const parseRoCatalogSkBaselineOutputPath = (
  args: readonly string[]
): string => {
  let outputPath: string | undefined
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument !== "--output" && !argument?.startsWith("--output=")) {
      throw new Error(`Unknown argument: ${argument}`)
    }
    if (outputPath) {
      throw new Error("--output may only be supplied once")
    }
    const parsed = readFlagValue(args, index)
    if (!parsed.value || parsed.value.startsWith("--")) {
      throw new Error("Missing required --output value")
    }
    outputPath = parsed.value
    index += parsed.consumed
  }
  if (!outputPath) {
    throw new Error("--output is required")
  }
  if (!isAbsolute(outputPath) || extname(outputPath) !== ".json") {
    throw new Error("--output must be an absolute .json path")
  }
  return outputPath
}

export const buildRoCatalogSkBaselineArtifact = (
  skProtection: RoCatalogSkProtectionAudit,
  capturedAt = new Date().toISOString()
): RoCatalogSkBaselineArtifact => {
  if (skProtection.publication.errors > 0) {
    throw new Error(
      `Cannot capture an SK baseline with ${skProtection.publication.errors} publication error(s)`
    )
  }
  return {
    capturedAt,
    provenance: "fresh-medusa-database-read",
    schemaVersion: 1,
    skProtection,
  }
}

export const writeRoCatalogSkBaselineArtifact = async (
  outputPath: string,
  artifact: RoCatalogSkBaselineArtifact
) => {
  const temporaryPath = `${outputPath}.${process.pid}.${randomUUID()}.tmp`
  let handle: Awaited<ReturnType<typeof open>> | undefined
  try {
    handle = await open(temporaryPath, "wx", 0o600)
    await handle.writeFile(`${JSON.stringify(artifact, null, 2)}\n`, "utf8")
    await handle.sync()
    await handle.close()
    handle = undefined
    // The temporary file lives beside the target, so a hard-link publication
    // is atomic and fails with EEXIST instead of replacing reviewed evidence.
    await link(temporaryPath, outputPath)
    await unlink(temporaryPath)
  } catch (error) {
    await handle?.close().catch(() => null)
    await unlink(temporaryPath).catch(() => null)
    throw error
  }
}
