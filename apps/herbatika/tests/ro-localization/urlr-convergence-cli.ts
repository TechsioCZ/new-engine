import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { parseRoCatalogScopePlanArtifact } from "../../../medusa-be/src/scripts/ro-catalog-readiness-contract"
import {
  hashPopulationManifest,
  parsePopulationManifest,
} from "../../src/lib/url-registry/population/manifest"
import { parseStaticTaxonomyConvergence } from "./static-taxonomy-convergence"
import {
  hashUrlrConvergenceProof,
  parseUrlrConvergenceProof,
  serializeUrlrConvergenceProof,
} from "./urlr-convergence-contract"
import { createPgUrlrConvergenceReader } from "./urlr-convergence-db"
import { computeUrlrConvergenceEvidence } from "./urlr-convergence-evidence"
import { buildExpectedUrlrEntities } from "./urlr-convergence-identity"

export const MEDUSA_DATABASE_URL_ENV = "DATABASE_URL"
export const URL_REGISTRY_DATABASE_URL_ENV = "URL_REGISTRY_DATABASE_URL"

export type UrlrConvergenceCliOptions = Readonly<{
  generatedAt: string
  importPlanPath: string
  outputPath: string
  populationManifestPath: string
  releaseId: string
  staticTaxonomyConvergencePath: string
}>

const optionValue = (
  argv: readonly string[],
  index: number,
  name: string
): string => {
  const value = argv[index + 1]
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}`)
  }
  return value
}

export const parseUrlrConvergenceCliOptions = (
  argv: readonly string[]
): UrlrConvergenceCliOptions => {
  const values = new Map<string, string>()
  const pathOptions = new Set([
    "--import-plan",
    "--output",
    "--population-manifest",
    "--static-taxonomy-convergence",
  ])
  const allowed = new Set([...pathOptions, "--generated-at", "--release-id"])
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index]
    if (!(name && allowed.has(name)) || values.has(name)) {
      throw new Error(`Unknown or duplicate argument: ${name ?? "<missing>"}`)
    }
    const value = optionValue(argv, index, name)
    values.set(name, pathOptions.has(name) ? resolve(value) : value)
    index += 1
  }
  for (const name of allowed) {
    if (!values.has(name)) {
      throw new Error(`${name} is required`)
    }
  }
  return {
    generatedAt: values.get("--generated-at") as string,
    importPlanPath: values.get("--import-plan") as string,
    outputPath: values.get("--output") as string,
    populationManifestPath: values.get("--population-manifest") as string,
    releaseId: values.get("--release-id") as string,
    staticTaxonomyConvergencePath: values.get(
      "--static-taxonomy-convergence"
    ) as string,
  }
}

const requiredEnvironment = (env: NodeJS.ProcessEnv, name: string): string => {
  const value = env[name]
  if (!value) {
    throw new Error(`${name} must be set`)
  }
  return value
}

const jsonFile = async (path: string): Promise<unknown> =>
  JSON.parse(await readFile(path, "utf8"))

export const runUrlrConvergenceCli = async (
  argv: readonly string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env
): Promise<void> => {
  const options = parseUrlrConvergenceCliOptions(argv)
  const [importPlanValue, populationValue, staticBytes] = await Promise.all([
    jsonFile(options.importPlanPath),
    jsonFile(options.populationManifestPath),
    readFile(options.staticTaxonomyConvergencePath),
  ])
  const importPlan = parseRoCatalogScopePlanArtifact(importPlanValue)
  const populationManifest = parsePopulationManifest(populationValue)
  const staticConvergence = parseStaticTaxonomyConvergence(
    JSON.parse(staticBytes.toString("utf8"))
  )
  if (
    staticConvergence.releaseId !== options.releaseId ||
    staticConvergence.populationManifestSha256 !==
      hashPopulationManifest(populationManifest)
  ) {
    throw new Error(
      "urlr-convergence: retained artifacts do not bind the requested release"
    )
  }
  const staticTaxonomyConvergenceSha256 = createHash("sha256")
    .update(staticBytes)
    .digest("hex")
  const reader = createPgUrlrConvergenceReader({
    medusaDatabaseUrl: requiredEnvironment(env, MEDUSA_DATABASE_URL_ENV),
    urlRegistryDatabaseUrl: requiredEnvironment(
      env,
      URL_REGISTRY_DATABASE_URL_ENV
    ),
  })
  try {
    const [activeRoutes, cursors, events, receipts, streams] =
      await Promise.all([
        reader.readUrlrActiveRoutes(),
        reader.readUrlrCursors(),
        reader.readMedusaOutboxEvents(),
        reader.readUrlrReceipts(),
        reader.readMedusaOutboxStreams(),
      ])
    const binding = {
      catalogScopeSha256: importPlan.hash,
      releaseId: options.releaseId,
      staticTaxonomyConvergenceSha256,
    }
    const proof = parseUrlrConvergenceProof(
      computeUrlrConvergenceEvidence({
        binding,
        expected: buildExpectedUrlrEntities(
          importPlan.scope,
          populationManifest
        ),
        generatedAt: options.generatedAt,
        now: new Date(),
        rows: { activeRoutes, cursors, events, receipts, streams },
      }),
      binding
    )
    await writeFile(options.outputPath, serializeUrlrConvergenceProof(proof), {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    })
    process.stdout.write(
      `${JSON.stringify({
        eventCount: proof.boundary.expectedEventCount,
        proofSha256: await hashUrlrConvergenceProof(proof),
        streamCount: proof.streams.count,
      })}\n`
    )
  } finally {
    await reader.close()
  }
}

const entrypoint = process.argv[1]
if (
  entrypoint &&
  pathToFileURL(resolve(entrypoint)).href ===
    pathToFileURL(fileURLToPath(import.meta.url)).href
) {
  runUrlrConvergenceCli().catch((error: unknown) => {
    process.stderr.write(
      `${JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unknown URLR convergence failure",
      })}\n`
    )
    process.exitCode = 1
  })
}
