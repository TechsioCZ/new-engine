import { readFile } from "node:fs/promises"
import { isAbsolute, resolve } from "node:path"
import type { ExecArgs, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sha256CommerceArtifactBytes } from "."
import {
  parseFourMarketCommerceCollectionAuthority,
  readFourMarketReviewedArtifacts,
} from "./authority"
import {
  assertCommerceReleaseIdentity,
  buildCollectedCommerceReadiness,
  observeCommerceReleaseIdentity,
} from "./collector"
import type {
  CommerceArtifactRef,
  CommerceLiveState,
  CommerceReleaseIdentity,
  FourMarketCommerceCollectionAuthority,
  FourMarketReviewedArtifacts,
  MarketCommerceCollectionReceipt,
} from "./collector-types"
import { collectMedusaCommerceLiveState } from "./medusa-source"
import { writeCommerceCollectionEvidence } from "./writer"

export type CommerceCollectionCliOptions = Readonly<{
  authorityPath: string
  expectedAuthoritySha256: string
  proofOutputDirectory: string
  receiptOutputPath: string
}>

const SHA_256 = /^[a-f0-9]{64}$/

const valueAfter = (args: readonly string[], flag: string) => {
  const positions = args.flatMap((argument, index) =>
    argument === flag ? [index] : []
  )
  if (positions.length !== 1) {
    throw new Error(`${flag} must be provided exactly once`)
  }
  const value = args[(positions[0] as number) + 1]
  if (!(value && !value.startsWith("--"))) {
    throw new Error(`${flag} requires a value`)
  }
  return value
}

export const parseCommerceCollectionCliOptions = (
  args: readonly string[]
): CommerceCollectionCliOptions => {
  const allowed = new Set([
    "--authority",
    "--expected-authority-sha256",
    "--proof-output-directory",
    "--receipt-output",
  ])
  if (args.length !== allowed.size * 2) {
    throw new Error(
      "commerce collection requires exactly four flag/value pairs"
    )
  }
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]
    if (!(flag && allowed.has(flag))) {
      throw new Error(
        `unknown commerce collection option ${flag ?? "<missing>"}`
      )
    }
  }
  const absolute = (flag: string) => {
    const value = valueAfter(args, flag)
    if (!isAbsolute(value) || resolve(value) !== value) {
      throw new Error(`${flag} must be a canonical absolute path`)
    }
    return value
  }
  const expectedAuthoritySha256 = valueAfter(
    args,
    "--expected-authority-sha256"
  )
  if (!SHA_256.test(expectedAuthoritySha256)) {
    throw new Error("--expected-authority-sha256 must be a lowercase SHA-256")
  }
  return {
    authorityPath: absolute("--authority"),
    expectedAuthoritySha256,
    proofOutputDirectory: absolute("--proof-output-directory"),
    receiptOutputPath: absolute("--receipt-output"),
  }
}

export type CommerceCollectionDependencies = Readonly<{
  collectLiveState: () => Promise<CommerceLiveState>
  environment: NodeJS.ProcessEnv
  now: () => Date
  readReviewedArtifacts: (
    authority: FourMarketCommerceCollectionAuthority
  ) => Promise<FourMarketReviewedArtifacts>
  readTextFile: (path: string) => Promise<string>
  writeEvidence: (
    collection: ReturnType<typeof buildCollectedCommerceReadiness>,
    options: Readonly<{
      authority: CommerceArtifactRef
      capturedAt: string
      proofOutputDirectory: string
      receiptOutputPath: string
      releaseIdentity: CommerceReleaseIdentity
    }>
  ) => Promise<MarketCommerceCollectionReceipt>
}>

export const runFourMarketCommerceCollection = async (
  options: CommerceCollectionCliOptions,
  dependencies: CommerceCollectionDependencies
) => {
  const authorityBytes = await dependencies.readTextFile(options.authorityPath)
  const authoritySha256 = sha256CommerceArtifactBytes(authorityBytes)
  if (authoritySha256 !== options.expectedAuthoritySha256) {
    throw new Error(
      "authority bytes do not match the externally reviewed SHA-256"
    )
  }
  const authority = parseFourMarketCommerceCollectionAuthority(authorityBytes)
  const observedReleaseIdentity = observeCommerceReleaseIdentity(
    dependencies.environment
  )
  assertCommerceReleaseIdentity(
    authority.releaseIdentity,
    observedReleaseIdentity
  )
  const [artifacts, liveState] = await Promise.all([
    dependencies.readReviewedArtifacts(authority),
    dependencies.collectLiveState(),
  ])
  const capturedAt = dependencies.now().toISOString()
  const collection = buildCollectedCommerceReadiness(
    authority,
    artifacts,
    liveState,
    capturedAt
  )
  const receipt = await dependencies.writeEvidence(collection, {
    authority: {
      path: options.authorityPath,
      sha256: authoritySha256,
    },
    capturedAt,
    proofOutputDirectory: options.proofOutputDirectory,
    receiptOutputPath: options.receiptOutputPath,
    releaseIdentity: authority.releaseIdentity,
  })
  return { collection, receipt }
}

export default async function collectFourMarketCommerceReadiness({
  args,
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const options = parseCommerceCollectionCliOptions(args)
  logger.info("[four-market commerce] starting read-only collection")
  const result = await runFourMarketCommerceCollection(options, {
    collectLiveState: () => collectMedusaCommerceLiveState(container),
    environment: process.env,
    now: () => new Date(),
    readReviewedArtifacts: (authority) =>
      readFourMarketReviewedArtifacts(authority),
    readTextFile: (path) => readFile(path, "utf8"),
    writeEvidence: writeCommerceCollectionEvidence,
  })
  if (!result.collection.bundle.ready) {
    throw new Error(
      `FOUR_MARKET_COMMERCE_NOT_READY: ${result.collection.bundle.issues.join(",")}`
    )
  }
  logger.info(
    `[four-market commerce] READY receipt=${options.receiptOutputPath}`
  )
  return result
}
