import { readFile } from "node:fs/promises"
import type { ExecArgs, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  assembleRoMeiliConvergenceProof,
  bindRoMeiliAuthorityToPriceAuthority,
  ConfiguredRoMeiliReadClient,
  collectRoMeiliConvergenceSnapshot,
  loadExactRoMeiliProfiles,
  parseRoMeiliAuthority,
  readRoMeiliConvergenceSnapshot,
  writePrivateRoMeiliEvidence,
} from "./index"

type SnapshotOptions = Readonly<{
  authorityPath: string
  command: "snapshot"
  outputPath: string
  phase: "post" | "pre"
  priceAuthorityPath: string
  priceAuthoritySha256: string
  roProfileId: string
  skProfileId: string
}>

type AssembleOptions = Readonly<{
  command: "assemble"
  outputPath: string
  postSnapshotPath: string
  preSnapshotPath: string
}>

type CliOptions = AssembleOptions | SnapshotOptions

const usage =
  "snapshot --phase pre|post --authority <canonical.json> " +
  "--price-authority <reviewed.json> --price-authority-sha256 <sha256> " +
  "--ro-profile-id <exact-id> --sk-profile-id <exact-id> --output <new.json> " +
  "or assemble --pre <pre.json> --post <post.json> --output <new.json>"

const fail = (message: string): never => {
  throw new Error(`RO Meilisearch convergence CLI: ${message}; usage: ${usage}`)
}

const parseFlags = (args: readonly string[]): Map<string, string> => {
  const flags = new Map<string, string>()
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]
    const value = args[index + 1]
    if (!(flag?.startsWith("--") && value && !value.startsWith("--"))) {
      return fail("flags must be provided as --name value pairs")
    }
    if (flags.has(flag)) {
      return fail(`duplicate flag ${flag}`)
    }
    flags.set(flag, value)
  }
  return flags
}

const exactFlags = (
  flags: Map<string, string>,
  expected: readonly string[]
) => {
  const actual = [...flags.keys()].sort()
  const sortedExpected = [...expected].sort()
  if (
    actual.length !== sortedExpected.length ||
    actual.some((flag, index) => flag !== sortedExpected[index])
  ) {
    fail(`flags must be exactly ${sortedExpected.join(",")}`)
  }
}

const required = (flags: Map<string, string>, flag: string): string => {
  const value = flags.get(flag)
  return value || fail(`${flag} is required`)
}

export const parseRoMeiliConvergenceCli = (
  args: readonly string[]
): CliOptions => {
  const [command, ...rest] = args
  if (args.includes("--apply-ro-profile-sync")) {
    return fail(
      "sync mutation is intentionally unsupported by this evidence-only tool"
    )
  }
  const flags = parseFlags(rest)
  if (command === "snapshot") {
    exactFlags(flags, [
      "--authority",
      "--output",
      "--phase",
      "--price-authority",
      "--price-authority-sha256",
      "--ro-profile-id",
      "--sk-profile-id",
    ])
    const phase = required(flags, "--phase")
    if (phase !== "pre" && phase !== "post") {
      return fail("--phase must be pre or post")
    }
    return {
      authorityPath: required(flags, "--authority"),
      command,
      outputPath: required(flags, "--output"),
      phase,
      priceAuthorityPath: required(flags, "--price-authority"),
      priceAuthoritySha256: required(flags, "--price-authority-sha256"),
      roProfileId: required(flags, "--ro-profile-id"),
      skProfileId: required(flags, "--sk-profile-id"),
    }
  }
  if (command === "assemble") {
    exactFlags(flags, ["--output", "--post", "--pre"])
    return {
      command,
      outputPath: required(flags, "--output"),
      postSnapshotPath: required(flags, "--post"),
      preSnapshotPath: required(flags, "--pre"),
    }
  }
  return fail("command must be snapshot or assemble")
}

export const runRoMeiliConvergenceCli = async (
  options: CliOptions,
  context: Pick<ExecArgs, "container">
): Promise<void> => {
  if (options.command === "assemble") {
    const [before, after] = await Promise.all([
      readRoMeiliConvergenceSnapshot(options.preSnapshotPath),
      readRoMeiliConvergenceSnapshot(options.postSnapshotPath),
    ])
    await writePrivateRoMeiliEvidence(
      options.outputPath,
      assembleRoMeiliConvergenceProof(before, after)
    )
    return
  }
  const [authorityContents, priceAuthorityContents] = await Promise.all([
    readFile(options.authorityPath, "utf8"),
    readFile(options.priceAuthorityPath, "utf8"),
  ])
  const authority = bindRoMeiliAuthorityToPriceAuthority(
    parseRoMeiliAuthority(authorityContents),
    priceAuthorityContents,
    options.priceAuthoritySha256
  )
  const profiles = await loadExactRoMeiliProfiles(context.container, {
    roProfileId: options.roProfileId,
    skProfileId: options.skProfileId,
  })
  const expectedEnvironmentId = process.env.RO_DEMO_ENVIRONMENT_ID
  if (!expectedEnvironmentId) {
    throw new Error(
      "RO Meilisearch convergence CLI: RO_DEMO_ENVIRONMENT_ID is required"
    )
  }
  const snapshot = await collectRoMeiliConvergenceSnapshot({
    authority,
    client: new ConfiguredRoMeiliReadClient(),
    expectedEnvironmentId,
    phase: options.phase,
    roProfile: profiles.ro,
    skProfile: profiles.sk,
  })
  await writePrivateRoMeiliEvidence(options.outputPath, snapshot)
}

export default async function roMeiliConvergenceScript({
  args,
  container,
}: ExecArgs) {
  const options = parseRoMeiliConvergenceCli(args)
  await runRoMeiliConvergenceCli(options, { container })
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  logger.info(
    `RO Meilisearch ${options.command} evidence written to ${options.outputPath}`
  )
}
