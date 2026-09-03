import { lstat, realpath } from "node:fs/promises"
import { basename, dirname, isAbsolute, join, resolve } from "node:path"
import type { ExecArgs, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { writeMarketPricePlanArtifact } from "./artifact"
import {
  loadMarketPriceAuthority,
  verifyMarketPriceAuthorityRawSources,
} from "./authority"
import { collectMarketPriceDatabaseSnapshot } from "./collector"
import { buildMarketPricePlan, hashMarketPricePlan } from "./planner"
import type {
  MarketPriceAuthorityCliOptions,
  MarketPriceDatabaseSnapshot,
  MarketPricePlan,
  MarketPricePlanArtifact,
} from "./types"

const SHA_256 = /^[a-f0-9]{64}$/
const PATH_FLAGS = [
  "--authority",
  "--cz-source",
  "--hu-source",
  "--plan-output",
  "--ro-source",
  "--sk-source",
] as const
const VALUE_FLAGS = [...PATH_FLAGS, "--expected-authority-sha256"] as const

type ValueFlag = (typeof VALUE_FLAGS)[number]

type InputPath = Readonly<{
  label: string
  path: string
}>

const isValueFlag = (value: string): value is ValueFlag =>
  VALUE_FLAGS.includes(value as ValueFlag)

const canonicalAbsolutePath = (value: string, flag: string) => {
  if (!isAbsolute(value) || resolve(value) !== value) {
    throw new Error(`${flag} must be a canonical absolute path`)
  }
  return value
}

export const parseMarketPriceAuthorityCliOptions = (
  args: readonly string[]
): MarketPriceAuthorityCliOptions => {
  const values = new Map<ValueFlag, string>()
  const dryRunCount = args.filter((argument) => argument === "--dry-run").length
  if (dryRunCount > 1) {
    throw new Error("duplicate option --dry-run")
  }
  const valueArguments = args.filter((argument) => argument !== "--dry-run")

  for (let index = 0; index < valueArguments.length; index += 2) {
    const argument = valueArguments[index] as string
    if (!isValueFlag(argument)) {
      throw new Error(`unknown market price authority option ${argument}`)
    }
    if (values.has(argument)) {
      throw new Error(`duplicate option ${argument}`)
    }
    const value = valueArguments[index + 1]
    if (!(value && !value.startsWith("--"))) {
      throw new Error(`${argument} requires a value`)
    }
    values.set(argument, value)
  }

  const missing = VALUE_FLAGS.find((flag) => !values.has(flag))
  if (missing) {
    throw new Error(`missing required option ${missing}`)
  }
  const expectedAuthoritySha256 = values.get(
    "--expected-authority-sha256"
  ) as string
  if (!SHA_256.test(expectedAuthoritySha256)) {
    throw new Error("--expected-authority-sha256 must be a lowercase SHA-256")
  }

  const options: MarketPriceAuthorityCliOptions = {
    authorityPath: canonicalAbsolutePath(
      values.get("--authority") as string,
      "--authority"
    ),
    expectedAuthoritySha256,
    planOutputPath: canonicalAbsolutePath(
      values.get("--plan-output") as string,
      "--plan-output"
    ),
    rawSourcePaths: {
      cz: canonicalAbsolutePath(
        values.get("--cz-source") as string,
        "--cz-source"
      ),
      hu: canonicalAbsolutePath(
        values.get("--hu-source") as string,
        "--hu-source"
      ),
      ro: canonicalAbsolutePath(
        values.get("--ro-source") as string,
        "--ro-source"
      ),
      sk: canonicalAbsolutePath(
        values.get("--sk-source") as string,
        "--sk-source"
      ),
    },
  }
  const paths = [
    options.authorityPath,
    ...Object.values(options.rawSourcePaths),
    options.planOutputPath,
  ]
  if (new Set(paths).size !== paths.length) {
    throw new Error("authority, source, and plan output paths must be distinct")
  }
  return options
}

const assertNonSymlinkParent = async (path: string, label: string) => {
  const parentPath = dirname(path)
  const [parent, physicalParentPath] = await Promise.all([
    lstat(parentPath),
    realpath(parentPath),
  ])
  if (
    parent.isSymbolicLink() ||
    !parent.isDirectory() ||
    physicalParentPath !== parentPath
  ) {
    throw new Error(`${label} parent must be a non-symlink directory`)
  }
  return physicalParentPath
}

const assertInputFile = async (
  input: InputPath
): Promise<Readonly<{ dev: number; ino: number; physicalPath: string }>> => {
  const [entry, physicalPath] = await Promise.all([
    lstat(input.path),
    realpath(input.path),
    assertNonSymlinkParent(input.path, input.label),
  ])
  if (entry.isSymbolicLink() || !entry.isFile()) {
    throw new Error(`${input.label} must be a non-symlink regular file`)
  }
  return { dev: entry.dev, ino: entry.ino, physicalPath }
}

const assertOutputAbsent = async (outputPath: string) => {
  try {
    await lstat(outputPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return
    }
    throw error
  }
  throw new Error(`plan output already exists: ${outputPath}`)
}

export const assertMarketPriceAuthorityCliPathSafety = async (
  options: MarketPriceAuthorityCliOptions
): Promise<void> => {
  const inputs: readonly InputPath[] = [
    { label: "authority input", path: options.authorityPath },
    ...(["cz", "hu", "ro", "sk"] as const).map((marketCode) => ({
      label: `${marketCode} source input`,
      path: options.rawSourcePaths[marketCode],
    })),
  ]
  const textualPaths = [
    ...inputs.map(({ path }) => path),
    options.planOutputPath,
  ]
  if (new Set(textualPaths).size !== textualPaths.length) {
    throw new Error("authority, source, and plan output paths must be distinct")
  }

  const [inputIdentities, outputParentPhysicalPath] = await Promise.all([
    Promise.all(inputs.map(assertInputFile)),
    assertNonSymlinkParent(options.planOutputPath, "plan output"),
    assertOutputAbsent(options.planOutputPath),
  ])
  const inodeKeys = inputIdentities.map(({ dev, ino }) => `${dev}:${ino}`)
  const physicalInputPaths = inputIdentities.map(({ physicalPath }) =>
    resolve(physicalPath)
  )
  if (
    new Set(inodeKeys).size !== inodeKeys.length ||
    new Set(physicalInputPaths).size !== physicalInputPaths.length
  ) {
    throw new Error(
      "authority and source inputs must not be filesystem aliases"
    )
  }
  const physicalOutputPath = join(
    outputParentPhysicalPath,
    basename(options.planOutputPath)
  )
  if (physicalInputPaths.includes(physicalOutputPath)) {
    throw new Error("plan output must not alias an authority or source input")
  }
}

export type MarketPriceAuthorityCliDependencies = Readonly<{
  buildPlan: typeof buildMarketPricePlan
  collectSnapshot: () => Promise<MarketPriceDatabaseSnapshot>
  hashPlan: typeof hashMarketPricePlan
  loadAuthority: typeof loadMarketPriceAuthority
  verifyRawSources: typeof verifyMarketPriceAuthorityRawSources
  writePlanArtifact: (
    outputPath: string,
    plan: MarketPricePlan,
    planSha256: string
  ) => Promise<MarketPricePlanArtifact>
}>

export const runMarketPriceAuthorityCli = async (
  options: MarketPriceAuthorityCliOptions,
  dependencies: MarketPriceAuthorityCliDependencies
) => {
  await assertMarketPriceAuthorityCliPathSafety(options)
  const { authority, authoritySha256 } = await dependencies.loadAuthority(
    options.authorityPath,
    options.expectedAuthoritySha256
  )
  await dependencies.verifyRawSources(authority, options.rawSourcePaths)
  const snapshot = await dependencies.collectSnapshot()
  const plan = dependencies.buildPlan(authority, authoritySha256, snapshot)
  const planSha256 = dependencies.hashPlan(plan)
  const artifact = await dependencies.writePlanArtifact(
    options.planOutputPath,
    plan,
    planSha256
  )
  return { artifact, authoritySha256, plan, planSha256 } as const
}

export default async function generateMarketPriceAuthorityPlan({
  args,
  container,
}: ExecArgs) {
  const options = parseMarketPriceAuthorityCliOptions(args)
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const result = await runMarketPriceAuthorityCli(options, {
    buildPlan: buildMarketPricePlan,
    collectSnapshot: () => collectMarketPriceDatabaseSnapshot(container),
    hashPlan: hashMarketPricePlan,
    loadAuthority: loadMarketPriceAuthority,
    verifyRawSources: verifyMarketPriceAuthorityRawSources,
    writePlanArtifact: writeMarketPricePlanArtifact,
  })
  logger.info(
    JSON.stringify({
      authoritySha256: result.authoritySha256,
      planSha256: result.planSha256,
      summary: result.plan.summary,
    })
  )
  logger.info("Dry-run complete; no database data was changed")
  return result
}
