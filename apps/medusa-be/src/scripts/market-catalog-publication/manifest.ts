import { lstat, readFile } from "node:fs/promises"
import { isAbsolute, resolve } from "node:path"
import { z } from "@medusajs/framework/zod"
import { hashCatalogTranslationBytes } from "../catalog-translation-pipeline/canonical"
import type {
  MarketCatalogPublicationCliOptions,
  MarketCatalogPublicationManifest,
} from "./types"

const SHA256 = /^[a-f0-9]{64}$/
const PUBLIC_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ENVIRONMENT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

const entrySchema = z
  .object({
    id: z.string().trim().min(1).max(255),
    publicationStatus: z.literal("published"),
    publicSlug: z.string().trim().min(1).max(80).regex(PUBLIC_SLUG),
  })
  .strict()

const environmentSchema = z
  .object({
    databaseInstanceFingerprint: z.string().regex(SHA256),
    environmentId: z.string().regex(ENVIRONMENT_ID),
    kind: z.literal("test"),
  })
  .strict()

const manifestSchema = z
  .object({
    brands: z.array(entrySchema),
    categories: z.array(entrySchema),
    environment: environmentSchema,
    locale: z.enum(["cs-CZ", "hu-HU"]),
    market: z.enum(["cz", "hu"]),
    products: z.array(entrySchema),
    salesChannelId: z.string().trim().min(1).max(255),
    schemaVersion: z.literal(1),
    translationInputSha256: z.string().regex(SHA256),
  })
  .strict()
  .superRefine((value, context) => {
    const expectedLocale = value.market === "cz" ? "cs-CZ" : "hu-HU"
    if (value.locale !== expectedLocale) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${value.market} publication requires locale ${expectedLocale}`,
        path: ["locale"],
      })
    }
    for (const [field, entries] of [
      ["products", value.products],
      ["categories", value.categories],
      ["brands", value.brands],
    ] as const) {
      const ids = new Set<string>()
      const slugs = new Set<string>()
      entries.forEach((entry, index) => {
        if (ids.has(entry.id)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${field} contains duplicate id ${entry.id}`,
            path: [field, index, "id"],
          })
        }
        if (slugs.has(entry.publicSlug)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${field} contains duplicate publicSlug ${entry.publicSlug}`,
            path: [field, index, "publicSlug"],
          })
        }
        ids.add(entry.id)
        slugs.add(entry.publicSlug)
      })
    }
  })

export const parseMarketCatalogPublicationManifest = (
  value: unknown
): MarketCatalogPublicationManifest => {
  const parsed = manifestSchema.safeParse(value)
  if (!parsed.success) {
    throw new Error(
      `market catalog publication manifest is invalid: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`
    )
  }
  return parsed.data
}

const readStablePrivateFile = async (path: string) => {
  const absolutePath = resolve(path)
  const before = await lstat(absolutePath)
  if (
    !before.isFile() ||
    before.isSymbolicLink() ||
    before.nlink !== 1 ||
    // biome-ignore lint/suspicious/noBitwiseOperators: POSIX permission masks are bit fields.
    (before.mode & 0o077) !== 0 ||
    (typeof process.getuid === "function" && before.uid !== process.getuid())
  ) {
    throw new Error(
      "market catalog publication manifest must be an owner-private regular single-link file"
    )
  }
  const bytes = await readFile(absolutePath)
  const after = await lstat(absolutePath)
  if (
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size ||
    before.mtimeMs !== after.mtimeMs
  ) {
    throw new Error("market catalog publication manifest changed while read")
  }
  return { absolutePath, bytes }
}

export const loadMarketCatalogPublicationManifest = async (path: string) => {
  const { absolutePath, bytes } = await readStablePrivateFile(path)
  let value: unknown
  try {
    value = JSON.parse(bytes.toString("utf8"))
  } catch (error) {
    throw new Error(
      `market catalog publication manifest is not JSON: ${(error as Error).message}`
    )
  }
  return {
    absolutePath,
    manifest: parseMarketCatalogPublicationManifest(value),
    manifestSha256: hashCatalogTranslationBytes(bytes),
  }
}

const absoluteJsonPath = (value: string | undefined, label: string) => {
  if (!(value && isAbsolute(value) && value.endsWith(".json"))) {
    throw new Error(`${label} requires an absolute .json path`)
  }
  return value
}

const parseCliArguments = (args: readonly string[]) => {
  const values = new Map<string, string>()
  let apply = false
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === "--apply") {
      apply = true
      continue
    }
    if (!argument?.startsWith("--")) {
      throw new Error(`unsupported argument ${argument ?? ""}`)
    }
    const value = args[index + 1]
    if (!value || value.startsWith("--")) {
      throw new Error(`${argument} requires a value`)
    }
    if (values.has(argument)) {
      throw new Error(`${argument} may be provided only once`)
    }
    values.set(argument, value)
    index += 1
  }
  return { apply, values }
}

export const parseMarketCatalogPublicationCliOptions = (
  args: readonly string[]
): MarketCatalogPublicationCliOptions => {
  const { apply, values } = parseCliArguments(args)
  const known = new Set([
    "--confirm-plan-hash",
    "--manifest",
    "--plan-output",
    "--receipt-output",
    "--rollback-output",
    "--translation-input",
  ])
  const unknown = [...values.keys()].find((key) => !known.has(key))
  if (unknown) {
    throw new Error(`unsupported argument ${unknown}`)
  }
  const options: MarketCatalogPublicationCliOptions = {
    apply,
    manifestPath: absoluteJsonPath(values.get("--manifest"), "--manifest"),
    planOutputPath: absoluteJsonPath(
      values.get("--plan-output"),
      "--plan-output"
    ),
    translationInputPath: absoluteJsonPath(
      values.get("--translation-input"),
      "--translation-input"
    ),
    ...(values.get("--confirm-plan-hash")
      ? { confirmPlanHash: values.get("--confirm-plan-hash") }
      : {}),
    ...(values.get("--receipt-output")
      ? {
          receiptOutputPath: absoluteJsonPath(
            values.get("--receipt-output"),
            "--receipt-output"
          ),
        }
      : {}),
    ...(values.get("--rollback-output")
      ? {
          rollbackOutputPath: absoluteJsonPath(
            values.get("--rollback-output"),
            "--rollback-output"
          ),
        }
      : {}),
  }
  if (
    apply &&
    !(
      options.confirmPlanHash &&
      options.receiptOutputPath &&
      options.rollbackOutputPath
    )
  ) {
    throw new Error(
      "--apply requires --confirm-plan-hash, --rollback-output, and --receipt-output"
    )
  }
  if (!apply && (options.receiptOutputPath || options.rollbackOutputPath)) {
    throw new Error("receipt and rollback outputs are only valid with --apply")
  }
  return options
}
