import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { buildStaticTaxonomyCutoverPlan } from "./static-taxonomy-plan"
import {
  assertRoDemoPopulationScope,
  refreshStaticTaxonomyPopulationManifest,
} from "./static-taxonomy-population-manifest"
import { buildStaticTaxonomyPreflightSql } from "./static-taxonomy-preflight-sql"
import { buildStaticTaxonomyTransitionPlan } from "./static-taxonomy-transition-plan"

type GenerateOptions = Readonly<{
  manifestPath?: string
  outputPath?: string
  preflightPath?: string
  printPreflightSql: boolean
}>

const optionValue = (
  argv: readonly string[],
  index: number,
  option: string
) => {
  const value = argv[index + 1]
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${option}`)
  }
  return resolve(value)
}

export const parseStaticTaxonomyGenerateOptions = (
  argv: readonly string[]
): GenerateOptions => {
  let manifestPath: string | undefined
  let outputPath: string | undefined
  let preflightPath: string | undefined
  let printPreflightSql = false
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index]
    if (option === "--manifest") {
      manifestPath = optionValue(argv, index, option)
      index += 1
    } else if (option === "--output") {
      outputPath = optionValue(argv, index, option)
      index += 1
    } else if (option === "--preflight") {
      preflightPath = optionValue(argv, index, option)
      index += 1
    } else if (option === "--print-preflight-sql") {
      printPreflightSql = true
    } else {
      throw new Error(`Unknown option: ${option ?? "<missing>"}`)
    }
  }
  if (printPreflightSql && (manifestPath || outputPath || preflightPath)) {
    throw new Error(
      "--print-preflight-sql cannot be combined with other options"
    )
  }
  return { manifestPath, outputPath, preflightPath, printPreflightSql }
}

export const generateStaticTaxonomyArtifact = async (
  options: GenerateOptions
) => {
  const plan = buildStaticTaxonomyCutoverPlan()
  const blockers: { code: string; message: string }[] = []
  const transitionPlan = options.preflightPath
    ? buildStaticTaxonomyTransitionPlan(
        JSON.parse(await readFile(options.preflightPath, "utf8"))
      )
    : null
  if (!transitionPlan) {
    blockers.push({
      code: "STATIC_PREFLIGHT_EVIDENCE_MISSING",
      message: "Run the emitted read-only SQL and supply --preflight evidence",
    })
  } else if (transitionPlan.blockers.length > 0) {
    blockers.push({
      code: "STATIC_PREFLIGHT_BLOCKED",
      message: `${transitionPlan.blockers.length} static route conflict(s) require reconciliation`,
    })
  } else if (transitionPlan.actions.length > 0) {
    blockers.push({
      code: "STATIC_LIFECYCLE_UPDATE_REQUIRED",
      message: `${transitionPlan.actions.length} audited update-route command(s) must run before population dry-run`,
    })
  }
  const refreshed = options.manifestPath
    ? refreshStaticTaxonomyPopulationManifest(
        JSON.parse(await readFile(options.manifestPath, "utf8"))
      )
    : null
  if (refreshed) {
    assertRoDemoPopulationScope(refreshed.manifest)
  } else {
    blockers.push({
      code: "AUTHORITATIVE_POPULATION_MANIFEST_MISSING",
      message:
        "Supply the final four-market URLR PopulationManifest after post-commerce catalog bindings exist",
    })
  }
  return {
    blockers,
    cutoverStatus:
      blockers.length === 0 ? "GO_FOR_POPULATION_DRY_RUN" : "NO_GO",
    plan,
    populationManifest: refreshed?.manifest ?? null,
    populationManifestHash: refreshed?.manifestHash ?? null,
    staticTransitionPlan: transitionPlan,
  }
}

export const runStaticTaxonomyGenerateCli = async (
  argv: readonly string[] = process.argv.slice(2)
) => {
  const options = parseStaticTaxonomyGenerateOptions(argv)
  if (options.printPreflightSql) {
    process.stdout.write(buildStaticTaxonomyPreflightSql())
    return
  }
  const artifact = await generateStaticTaxonomyArtifact(options)
  const serialized = `${JSON.stringify(artifact, null, 2)}\n`
  if (options.outputPath) {
    await writeFile(options.outputPath, serialized, {
      encoding: "utf8",
      flag: "wx",
    })
  }
  process.stdout.write(serialized)
  if (artifact.cutoverStatus === "NO_GO") {
    process.exitCode = 2
  }
}

const entrypoint = process.argv[1]
const isEntrypoint =
  entrypoint !== undefined &&
  pathToFileURL(resolve(entrypoint)).href ===
    pathToFileURL(fileURLToPath(import.meta.url)).href

if (isEntrypoint) {
  runStaticTaxonomyGenerateCli().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Unknown generator failure"}\n`
    )
    process.exitCode = 1
  })
}
