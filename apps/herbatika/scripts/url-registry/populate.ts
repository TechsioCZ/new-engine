import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { parsePopulationManifest } from "../../src/lib/url-registry/population/manifest"
import { PopulationManifestError } from "../../src/lib/url-registry/population/manifest-contracts"
import {
  applyUrlRegistryPopulation,
  PopulationApplyError,
} from "../../src/lib/url-registry/population/population-apply"
import { planUrlRegistryPopulation } from "../../src/lib/url-registry/population/population-plan"
import { hashPopulationStaticTaxonomy } from "../../src/lib/url-registry/population/static-taxonomy"
import { createUrlRegistryRuntime } from "../../src/lib/url-registry/runtime/factory.server"

type Arguments = Readonly<{
  apply: boolean
  batchSize: number
  confirmManifestHash?: string
  manifestPath: string
  outputPath?: string
}>

const usage = () =>
  [
    "Usage:",
    "  pnpm populate:url-registry -- --manifest <authoritative.json> [--batch-size 25] [--output report.json]",
    "  pnpm populate:url-registry -- --manifest <authoritative.json> --apply --confirm-manifest-hash sha256:<hash>",
    "  node scripts/url-registry/populate.mjs --manifest - [--apply --confirm-manifest-hash sha256:<hash>]",
    "  pnpm populate:url-registry -- --print-taxonomy-hash",
    "",
    "Dry-run is the default. Apply requires URL_REGISTRY_ENABLED=1, URL_REGISTRY_DATABASE_URL,",
    "a complete authoritative inventory, G1 approval references, and the exact dry-run manifest hash.",
    "Use --manifest - to read the manifest from stdin inside the production container.",
  ].join("\n")

const requiredOptionValue = (
  argv: readonly string[],
  index: number,
  argument: string
): string => {
  const value = argv[index + 1]
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${argument}`)
  }
  return value
}

export const parseArguments = (argv: readonly string[]): Arguments => {
  let apply = false
  let batchSize = 25
  let confirmManifestHash: string | undefined
  let manifestPath: string | undefined
  let outputPath: string | undefined

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    switch (argument) {
      case "--":
        break
      case "--apply":
        apply = true
        break
      case "--manifest":
        {
          const value = requiredOptionValue(argv, index, argument)
          manifestPath = value === "-" ? value : resolve(value)
        }
        index += 1
        break
      case "--output":
        outputPath = resolve(requiredOptionValue(argv, index, argument))
        index += 1
        break
      case "--batch-size":
        batchSize = Number(requiredOptionValue(argv, index, argument))
        index += 1
        break
      case "--confirm-manifest-hash":
        confirmManifestHash = requiredOptionValue(argv, index, argument)
        index += 1
        break
      case "--help":
        process.stdout.write(`${usage()}\n`)
        process.exit(0)
        break
      default:
        throw new Error(
          `Unknown or incomplete argument: ${argument ?? "<missing>"}`
        )
    }
  }

  if (!manifestPath) {
    throw new Error("--manifest is required")
  }
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 100) {
    throw new Error("--batch-size must be an integer between 1 and 100")
  }
  return { apply, batchSize, confirmManifestHash, manifestPath, outputPath }
}

type PopulationManifestFileReader = (
  source: string,
  encoding: "utf8"
) => Promise<string>

export const readPopulationManifestFromStdin = async (
  input: NodeJS.ReadableStream = process.stdin
) => {
  input.setEncoding("utf8")
  let source = ""
  for await (const chunk of input) {
    source += chunk
  }
  return source
}

export const readPopulationManifestText = (
  manifestPath: string,
  reader: PopulationManifestFileReader = readFile,
  readStdin: () => Promise<string> = readPopulationManifestFromStdin
) => (manifestPath === "-" ? readStdin() : reader(manifestPath, "utf8"))

const emit = async (report: unknown, outputPath?: string) => {
  const serialized = `${JSON.stringify(report, null, 2)}\n`
  if (outputPath) {
    await writeFile(outputPath, serialized, { encoding: "utf8", flag: "wx" })
  }
  process.stdout.write(serialized)
}

export const runUrlRegistryPopulationCli = async () => {
  if (
    process.argv
      .slice(2)
      .filter((value) => value !== "--")
      .includes("--print-taxonomy-hash")
  ) {
    process.stdout.write(`${hashPopulationStaticTaxonomy()}\n`)
    return
  }
  const options = parseArguments(process.argv.slice(2))
  const rawManifest = JSON.parse(
    await readPopulationManifestText(options.manifestPath)
  )
  const manifest = parsePopulationManifest(rawManifest)
  const runtime = await createUrlRegistryRuntime()
  if (!runtime.enabled) {
    throw new Error("URL_REGISTRY_ENABLED must be 1 for population inspection")
  }
  try {
    if (!options.apply) {
      const plan = await planUrlRegistryPopulation(manifest, runtime.registry)
      await emit(
        {
          applied: false,
          blockers: plan.blockers,
          counts: {
            create: plan.creates.length,
            noop: plan.noops.length,
            retire: plan.retirementPlan.length,
            ...plan.totals,
          },
          manifestHash: plan.manifestHash,
          mode: "dry-run",
          retirementPlan: plan.retirementPlan,
          sourceSnapshotHash: manifest.sourceSnapshotHash,
          taxonomyHash: manifest.taxonomyApproval.hash,
        },
        options.outputPath
      )
      if (plan.blockers.length > 0) {
        process.exitCode = 2
      }
      return
    }

    const plan = await planUrlRegistryPopulation(manifest, runtime.registry)
    if (options.confirmManifestHash !== plan.manifestHash) {
      throw new Error(
        "--confirm-manifest-hash must equal the exact hash emitted by dry-run"
      )
    }
    const report = await applyUrlRegistryPopulation(
      manifest,
      runtime.registry,
      {
        batchSize: options.batchSize,
      }
    )
    await emit(
      {
        ...report,
        applied: true,
        mode: "apply",
        sourceSnapshotHash: manifest.sourceSnapshotHash,
        taxonomyHash: manifest.taxonomyApproval.hash,
      },
      options.outputPath
    )
  } finally {
    await runtime.close()
  }
}

const entrypoint = process.argv[1]
const isEntrypoint =
  entrypoint !== undefined &&
  pathToFileURL(resolve(entrypoint)).href ===
    pathToFileURL(fileURLToPath(import.meta.url)).href

if (isEntrypoint) {
  runUrlRegistryPopulationCli().catch((error: unknown) => {
    let details: Record<string, unknown> = {}
    if (error instanceof PopulationApplyError) {
      details = { blockers: error.blockers }
    } else if (error instanceof PopulationManifestError) {
      details = { manifestError: error.message }
    }
    process.stderr.write(
      `${JSON.stringify(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unknown population failure",
          ...details,
        },
        null,
        2
      )}\n`
    )
    process.exitCode = 1
  })
}
