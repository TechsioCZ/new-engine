import { mkdir, readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import {
  APPROVED_STATIC_CUTOVER_PLAN_HASH,
  APPROVED_STATIC_TAXONOMY_HASH,
} from "./static-taxonomy-approval"
import {
  approvedStaticTaxonomyPolicy,
  parseStaticTaxonomyConvergence,
  serializeStaticTaxonomyConvergence,
} from "./static-taxonomy-convergence"

const SHA256 = /^sha256:[a-f0-9]{64}$/
const OUTPUT_RELATIVE_PATH = "urlr/static-taxonomy-convergence.json"

type Provenance = Readonly<{
  capturedAt: string
  environmentId: string
  releaseId: string
}>

const asRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

export const convergenceFromPopulationArtifact = (
  value: unknown,
  provenance: Provenance
) => {
  const artifact = asRecord(value, "population artifact")
  const plan = asRecord(artifact.plan, "population artifact.plan")
  const transition = asRecord(
    artifact.staticTransitionPlan,
    "population artifact.staticTransitionPlan"
  )
  if (
    artifact.cutoverStatus !== "GO_FOR_POPULATION_DRY_RUN" ||
    !Array.isArray(artifact.blockers) ||
    artifact.blockers.length !== 0 ||
    !Array.isArray(transition.actions) ||
    transition.actions.length !== 0 ||
    !Array.isArray(transition.blockers) ||
    transition.blockers.length !== 0 ||
    transition.ready !== true
  ) {
    throw new Error("population artifact is not converged")
  }
  if (
    plan.taxonomyApprovalHash !== APPROVED_STATIC_TAXONOMY_HASH ||
    plan.planHash !== APPROVED_STATIC_CUTOVER_PLAN_HASH ||
    transition.taxonomyApprovalHash !== APPROVED_STATIC_TAXONOMY_HASH ||
    typeof artifact.populationManifestHash !== "string" ||
    !SHA256.test(artifact.populationManifestHash)
  ) {
    throw new Error("population artifact hashes are not approved")
  }
  return parseStaticTaxonomyConvergence({
    actionsRequired: 0,
    blockers: 0,
    capturedAt: provenance.capturedAt,
    environmentId: provenance.environmentId,
    kind: "ro-static-taxonomy-convergence",
    planHash: APPROVED_STATIC_CUTOVER_PLAN_HASH,
    policy: approvedStaticTaxonomyPolicy(),
    populationManifestSha256: artifact.populationManifestHash,
    releaseId: provenance.releaseId,
    schemaVersion: 1,
    state: "converged",
    taxonomyApprovalHash: APPROVED_STATIC_TAXONOMY_HASH,
  })
}

const parseOptions = (argv: readonly string[]) => {
  const values = new Map<string, string>()
  for (let index = 0; index < argv.length; index += 2) {
    const option = argv[index]
    const value = argv[index + 1]
    if (!(option?.startsWith("--") && value) || value.startsWith("--")) {
      throw new Error(`Invalid option near ${option ?? "<missing>"}`)
    }
    values.set(option, value)
  }
  const required = [
    "--input",
    "--artifact-root",
    "--captured-at",
    "--environment-id",
    "--release-id",
  ]
  if (
    values.size !== required.length ||
    required.some((key) => !values.has(key))
  ) {
    throw new Error(`Required options: ${required.join(" ")}`)
  }
  return {
    artifactRoot: resolve(values.get("--artifact-root") as string),
    capturedAt: values.get("--captured-at") as string,
    environmentId: values.get("--environment-id") as string,
    input: resolve(values.get("--input") as string),
    releaseId: values.get("--release-id") as string,
  }
}

export const runStaticTaxonomyConvergenceCli = async (
  argv: readonly string[]
) => {
  const options = parseOptions(argv)
  const input = JSON.parse(await readFile(options.input, "utf8"))
  const artifact = convergenceFromPopulationArtifact(input, options)
  const outputPath = await writeStaticTaxonomyConvergence(
    options.artifactRoot,
    artifact
  )
  process.stdout.write(`${outputPath}\n`)
}

export const writeStaticTaxonomyConvergence = async (
  artifactRoot: string,
  artifact: unknown
) => {
  const outputPath = resolve(artifactRoot, OUTPUT_RELATIVE_PATH)
  await mkdir(resolve(artifactRoot, "urlr"), { recursive: true })
  await writeFile(outputPath, serializeStaticTaxonomyConvergence(artifact), {
    encoding: "utf8",
    flag: "wx",
  })
  return outputPath
}

const entrypoint = process.argv[1]
if (
  entrypoint &&
  pathToFileURL(resolve(entrypoint)).href ===
    pathToFileURL(fileURLToPath(import.meta.url)).href
) {
  runStaticTaxonomyConvergenceCli(process.argv.slice(2)).catch(
    (error: unknown) => {
      process.stderr.write(
        `${error instanceof Error ? error.message : "Unknown failure"}\n`
      )
      process.exitCode = 1
    }
  )
}
