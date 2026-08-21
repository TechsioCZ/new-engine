import { readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import {
  hashPopulationManifest,
  parsePopulationManifest,
} from "../../src/lib/url-registry/population/manifest"
import {
  type FourMarketConvergenceArtifactRefs,
  writeFourMarketConvergenceArtifacts,
} from "./convergence-artifacts"
import {
  collectFourMarketConvergenceArtifacts,
  type FourMarketConvergenceArtifacts,
} from "./convergence-collector"
import {
  createFourMarketConvergenceReader,
  type FourMarketConvergenceDbConfig,
  type FourMarketConvergenceReader,
} from "./convergence-db"
import {
  loadSegmentRegistryRefsByMarket,
  type SegmentRegistryRefsByMarket,
} from "./segment-registry-refs"

type CliOptions = Readonly<{
  artifactRoot: string
  environmentId: string
  expectedPopulationManifestSha256: string
  generatedAt: string
  populationManifestPath: string
  releaseId: string
  segmentRegistryDirectory: string
  statementTimeoutMs?: number
}>

type CliEnvironment = Readonly<{
  DATABASE_URL?: string
  URL_REGISTRY_DATABASE_URL?: string
}>

type CliDependencies = Readonly<{
  collect?: typeof collectFourMarketConvergenceArtifacts
  createReader?: (
    config: FourMarketConvergenceDbConfig
  ) => FourMarketConvergenceReader
  loadText?: (path: string) => Promise<string>
  loadSegmentRegistryRefs?: (
    directory: string
  ) => Promise<SegmentRegistryRefsByMarket>
  write?: (
    root: string,
    artifacts: FourMarketConvergenceArtifacts
  ) => Promise<FourMarketConvergenceArtifactRefs>
  writeStdout?: (value: string) => void
}>

const FLAGS: Readonly<Record<string, keyof CliOptions>> = {
  "--artifact-root": "artifactRoot",
  "--environment-id": "environmentId",
  "--expected-population-manifest-sha256": "expectedPopulationManifestSha256",
  "--generated-at": "generatedAt",
  "--population-manifest": "populationManifestPath",
  "--release-id": "releaseId",
  "--segment-registry-dir": "segmentRegistryDirectory",
  "--statement-timeout-ms": "statementTimeoutMs",
}

export const parseFourMarketConvergenceArguments = (
  argv: readonly string[]
): CliOptions => {
  const values = new Map<string, string>()
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index]
    const value = argv[index + 1]
    const key = flag ? FLAGS[flag] : undefined
    if (!(key && value) || value.startsWith("--") || values.has(key)) {
      throw new Error("four-market-readiness: invalid CLI arguments")
    }
    values.set(key, value)
  }
  const required = [
    "artifactRoot",
    "environmentId",
    "expectedPopulationManifestSha256",
    "generatedAt",
    "populationManifestPath",
    "releaseId",
    "segmentRegistryDirectory",
  ] as const
  if (argv.length % 2 || required.some((key) => !values.get(key))) {
    throw new Error("four-market-readiness: required CLI argument is missing")
  }
  const rawTimeout = values.get("statementTimeoutMs")
  const statementTimeoutMs = rawTimeout ? Number(rawTimeout) : undefined
  if (
    statementTimeoutMs !== undefined &&
    (!Number.isInteger(statementTimeoutMs) || statementTimeoutMs < 1)
  ) {
    throw new Error("four-market-readiness: statement timeout is invalid")
  }
  return {
    artifactRoot: values.get("artifactRoot") as string,
    environmentId: values.get("environmentId") as string,
    expectedPopulationManifestSha256: values.get(
      "expectedPopulationManifestSha256"
    ) as string,
    generatedAt: values.get("generatedAt") as string,
    populationManifestPath: values.get("populationManifestPath") as string,
    releaseId: values.get("releaseId") as string,
    segmentRegistryDirectory: values.get("segmentRegistryDirectory") as string,
    statementTimeoutMs,
  }
}

export const runFourMarketConvergenceCli = async (
  argv: readonly string[],
  environment: CliEnvironment = {
    DATABASE_URL: process.env.DATABASE_URL,
    URL_REGISTRY_DATABASE_URL: process.env.URL_REGISTRY_DATABASE_URL,
  },
  dependencies: CliDependencies = {}
): Promise<FourMarketConvergenceArtifactRefs> => {
  const options = parseFourMarketConvergenceArguments(argv)
  const medusaDatabaseUrl = environment.DATABASE_URL
  const urlRegistryDatabaseUrl = environment.URL_REGISTRY_DATABASE_URL
  if (!(medusaDatabaseUrl && urlRegistryDatabaseUrl)) {
    throw new Error(
      "four-market-readiness: DATABASE_URL and URL_REGISTRY_DATABASE_URL are required"
    )
  }
  const loadText =
    dependencies.loadText ?? ((path: string) => readFile(path, "utf8"))
  const manifestText = await loadText(resolve(options.populationManifestPath))
  const manifest = parsePopulationManifest(JSON.parse(manifestText))
  if (
    hashPopulationManifest(manifest) !==
    options.expectedPopulationManifestSha256
  ) {
    throw new Error(
      "four-market-readiness: reviewed PopulationManifest SHA-256 mismatch"
    )
  }
  const artifactRoot = resolve(options.artifactRoot)
  const segmentRegistryDirectory = resolve(options.segmentRegistryDirectory)
  if (segmentRegistryDirectory !== join(artifactRoot, "segment-registry-g1")) {
    throw new Error(
      "four-market-readiness: segment registry directory must resolve under artifact root"
    )
  }
  const segmentRegistryByMarket = await (
    dependencies.loadSegmentRegistryRefs ?? loadSegmentRegistryRefsByMarket
  )(artifactRoot)
  const reader = (
    dependencies.createReader ?? createFourMarketConvergenceReader
  )({
    medusaDatabaseUrl,
    statementTimeoutMs: options.statementTimeoutMs,
    urlRegistryDatabaseUrl,
  })
  let artifacts: FourMarketConvergenceArtifacts
  try {
    const rows = await reader.read()
    artifacts = (dependencies.collect ?? collectFourMarketConvergenceArtifacts)(
      {
        identity: {
          environmentId: options.environmentId,
          generatedAt: options.generatedAt,
          releaseId: options.releaseId,
        },
        manifest,
        rows,
        segmentRegistryByMarket,
      }
    )
  } finally {
    await reader.close()
  }
  const refs = await (
    dependencies.write ?? writeFourMarketConvergenceArtifacts
  )(artifactRoot, artifacts)
  const writeStdout =
    dependencies.writeStdout ?? ((value: string) => process.stdout.write(value))
  writeStdout(`${JSON.stringify(refs)}\n`)
  return refs
}

const entrypoint = process.argv[1]
if (
  entrypoint &&
  pathToFileURL(resolve(entrypoint)).href ===
    pathToFileURL(fileURLToPath(import.meta.url)).href
) {
  runFourMarketConvergenceCli(process.argv.slice(2)).catch((error: unknown) => {
    process.stderr.write(
      `${JSON.stringify({
        error: error instanceof Error ? error.message : "unknown error",
        status: "failed",
      })}\n`
    )
    process.exitCode = 1
  })
}
