import { isAbsolute, resolve } from "node:path"
import type { ExecArgs, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ConfiguredRoMeiliReadClient } from "../ro-meili-convergence"
import {
  ConfiguredFourMarketMeiliAuthorityReader,
  collectFourMarketMeiliConvergenceCandidate,
  type FourMarketMeiliProfileIds,
  loadExactFourMarketMeiliProfiles,
  writePrivateFourMarketMeiliCandidate,
} from "./collector"

const FLAGS = [
  "--cz-profile-id",
  "--expected-environment-id",
  "--expected-release-id",
  "--hu-profile-id",
  "--output",
  "--ro-profile-id",
  "--sk-profile-id",
] as const

export type FourMarketMeiliConvergenceCliOptions = Readonly<{
  environmentId: string
  outputPath: string
  profileIds: FourMarketMeiliProfileIds
  releaseId: string
}>

const fail = (message: string): never => {
  throw new Error(`Four-market Meilisearch collector CLI: ${message}`)
}

const required = (values: Map<string, string>, flag: string): string => {
  const value = values.get(flag)
  return value || fail(`${flag} is required`)
}

export const parseFourMarketMeiliConvergenceCli = (
  args: readonly string[]
): FourMarketMeiliConvergenceCliOptions => {
  const allowed = new Set<string>(FLAGS)
  const values = new Map<string, string>()
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]
    const value = args[index + 1]
    if (!(flag && allowed.has(flag) && value && !value.startsWith("--"))) {
      return fail("arguments must be exact --name value pairs")
    }
    if (values.has(flag)) {
      return fail(`duplicate flag ${flag}`)
    }
    values.set(flag, value)
  }
  if (values.size !== FLAGS.length) {
    return fail(`flags must be exactly ${[...FLAGS].sort().join(",")}`)
  }
  const outputPath = required(values, "--output")
  if (!(isAbsolute(outputPath) && resolve(outputPath) === outputPath)) {
    return fail("--output must be a canonical absolute path")
  }
  return {
    environmentId: required(values, "--expected-environment-id"),
    outputPath,
    profileIds: {
      cz: required(values, "--cz-profile-id"),
      hu: required(values, "--hu-profile-id"),
      ro: required(values, "--ro-profile-id"),
      sk: required(values, "--sk-profile-id"),
    },
    releaseId: required(values, "--expected-release-id"),
  }
}

const readBoundReleaseIdentity = (
  options: FourMarketMeiliConvergenceCliOptions,
  environment: NodeJS.ProcessEnv
): { environmentId: string; releaseId: string } => {
  const environmentId =
    environment.MARKET_MEILI_ENVIRONMENT_ID ??
    environment.MARKET_CATALOG_ENVIRONMENT_ID ??
    environment.RO_DEMO_ENVIRONMENT_ID
  const releaseId =
    environment.MARKET_MEILI_RELEASE_ID ??
    environment.MARKET_CATALOG_RELEASE_ID ??
    environment.RELEASE_ID
  if (
    !(environmentId && releaseId) ||
    environmentId !== options.environmentId ||
    releaseId !== options.releaseId
  ) {
    return fail("active environment does not match expected release identity")
  }
  return { environmentId, releaseId }
}

export const runFourMarketMeiliConvergenceCli = async (
  options: FourMarketMeiliConvergenceCliOptions,
  context: Pick<ExecArgs, "container">,
  environment: NodeJS.ProcessEnv = process.env
): Promise<void> => {
  const identity = readBoundReleaseIdentity(options, environment)
  const profiles = await loadExactFourMarketMeiliProfiles(
    context.container,
    options.profileIds
  )
  const candidate = await collectFourMarketMeiliConvergenceCandidate({
    authorityReader: new ConfiguredFourMarketMeiliAuthorityReader(
      context.container
    ),
    client: new ConfiguredRoMeiliReadClient(),
    ...identity,
    profiles,
  })
  await writePrivateFourMarketMeiliCandidate(options.outputPath, candidate)
}

export default async function fourMarketMeiliConvergenceScript({
  args,
  container,
}: ExecArgs) {
  const options = parseFourMarketMeiliConvergenceCli(args)
  await runFourMarketMeiliConvergenceCli(options, { container })
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  logger.info(
    `Four-market Meilisearch candidate written to ${options.outputPath}`
  )
}
