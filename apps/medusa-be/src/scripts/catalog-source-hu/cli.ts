import { lstat, mkdir, open, readFile } from "node:fs/promises"
import { isAbsolute, join, resolve } from "node:path"
import { stableCatalogTranslationJson } from "../catalog-translation-pipeline/canonical"
import { buildHungarianCatalogSourceBundle } from "./generator"

type Options = Readonly<{
  canonicalSourceManifest: string
  databaseInstanceFingerprint: string
  environmentId: string
  hungarianTranslations: string
  outputDirectory: string
}>

const ARGUMENTS: Readonly<Record<string, keyof Options>> = {
  "--canonical-source-manifest": "canonicalSourceManifest",
  "--database-instance-fingerprint": "databaseInstanceFingerprint",
  "--environment-id": "environmentId",
  "--hungarian-translations": "hungarianTranslations",
  "--output-directory": "outputDirectory",
}

export const parseHungarianCatalogSourceOptions = (
  args: readonly string[]
): Options => {
  const values = new Map<keyof Options, string>()
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index] ?? ""
    const value = args[index + 1]
    const key = ARGUMENTS[name]
    if (!(key && value && !value.startsWith("--")) || values.has(key)) {
      throw new Error(
        "catalog-source-hu arguments must be unique flag/value pairs"
      )
    }
    values.set(key, value)
  }
  for (const key of Object.values(ARGUMENTS)) {
    if (!values.get(key)) {
      throw new Error(`Missing argument: ${key}`)
    }
  }
  for (const key of [
    "canonicalSourceManifest",
    "hungarianTranslations",
    "outputDirectory",
  ] as const) {
    if (!isAbsolute(values.get(key) as string)) {
      throw new Error(`${key} must be an absolute path`)
    }
  }
  return Object.fromEntries(values) as Options
}

const readPrivateRegularFile = async (path: string, label: string) => {
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
      `${label} must be an owner-private regular single-link file`
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
    throw new Error(`${label} changed while it was read`)
  }
  return { absolutePath, bytes }
}

const canonicalJsonBytes = (value: unknown) =>
  Buffer.from(`${stableCatalogTranslationJson(value)}\n`)

const canonicalJsonlBytes = (values: readonly unknown[]) =>
  Buffer.from(
    `${values.map((value) => stableCatalogTranslationJson(value)).join("\n")}\n`
  )

const writeExclusive = async (path: string, bytes: Uint8Array) => {
  const handle = await open(path, "wx", 0o600)
  try {
    await handle.writeFile(bytes)
    await handle.sync()
  } finally {
    await handle.close()
  }
}

export const runHungarianCatalogSourceCli = async (
  args: readonly string[] = process.argv.slice(2)
) => {
  const options = parseHungarianCatalogSourceOptions(args)
  const [canonicalSourceManifest, hungarianTranslations] = await Promise.all([
    readPrivateRegularFile(
      options.canonicalSourceManifest,
      "canonical source manifest"
    ),
    readPrivateRegularFile(
      options.hungarianTranslations,
      "Hungarian translations"
    ),
  ])
  const outputDirectory = resolve(options.outputDirectory)
  const attestationOutputPath = join(
    outputDirectory,
    "hu-catalog-source-attestation.json"
  )
  const bundle = buildHungarianCatalogSourceBundle(
    {
      attestationOutputPath,
      canonicalSourceManifest: canonicalSourceManifest.bytes,
      hungarianTranslations: hungarianTranslations.bytes,
      sourcePaths: {
        canonicalSourceManifest: canonicalSourceManifest.absolutePath,
        hungarianTranslations: hungarianTranslations.absolutePath,
      },
    },
    {
      databaseInstanceFingerprint: options.databaseInstanceFingerprint,
      environmentId: options.environmentId,
      kind: "test",
    }
  )
  await mkdir(outputDirectory, { mode: 0o700, recursive: false })
  await writeExclusive(
    attestationOutputPath,
    canonicalJsonBytes(bundle.attestation)
  )
  await writeExclusive(
    join(outputDirectory, "hu-catalog-translation-input.json"),
    canonicalJsonBytes(bundle.manifest)
  )
  await writeExclusive(
    join(outputDirectory, "hu-catalog-source-ledger.jsonl"),
    canonicalJsonlBytes(bundle.ledger)
  )
  await writeExclusive(
    join(outputDirectory, "hu-catalog-source-preimages.json"),
    canonicalJsonBytes(bundle.preimages)
  )
  await writeExclusive(
    join(outputDirectory, "authority.json"),
    canonicalJsonBytes(bundle.authority)
  )
  return bundle.authority
}
