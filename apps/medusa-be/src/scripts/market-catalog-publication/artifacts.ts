import { randomUUID } from "node:crypto"
import { link, lstat, open, readFile, unlink } from "node:fs/promises"
import {
  hashCatalogTranslationBytes,
  hashCatalogTranslationValue,
} from "../catalog-translation-pipeline/canonical"
import type {
  MarketCatalogPublicationApplyReceipt,
  MarketCatalogPublicationPlan,
  MarketCatalogPublicationPlanArtifact,
  MarketCatalogPublicationRollbackArtifact,
} from "./types"

const writePrivateNoClobber = async (outputPath: string, value: unknown) => {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8")
  const temporaryPath = `${outputPath}.${process.pid}.${randomUUID()}.tmp`
  let handle: Awaited<ReturnType<typeof open>> | undefined
  try {
    handle = await open(temporaryPath, "wx", 0o600)
    await handle.writeFile(bytes)
    await handle.sync()
    await handle.close()
    handle = undefined
    await link(temporaryPath, outputPath)
    await unlink(temporaryPath)
  } catch (error) {
    await handle?.close().catch(() => null)
    await unlink(temporaryPath).catch(() => null)
    throw error
  }
  return hashCatalogTranslationBytes(bytes)
}

const planArtifact = (
  plan: MarketCatalogPublicationPlan,
  planHash: string
): MarketCatalogPublicationPlanArtifact => ({
  plan,
  planHash,
  schemaVersion: 1,
})

export const writeMarketCatalogPublicationPlanArtifact = async (
  outputPath: string,
  plan: MarketCatalogPublicationPlan,
  planHash: string
) => writePrivateNoClobber(outputPath, planArtifact(plan, planHash))

export const assertMarketCatalogPublicationPlanArtifact = async (
  outputPath: string,
  plan: MarketCatalogPublicationPlan,
  planHash: string
) => {
  let value: unknown
  try {
    const before = await lstat(outputPath)
    if (
      !before.isFile() ||
      before.isSymbolicLink() ||
      before.nlink !== 1 ||
      // biome-ignore lint/suspicious/noBitwiseOperators: POSIX permission masks are bit fields.
      (before.mode & 0o077) !== 0 ||
      (typeof process.getuid === "function" && before.uid !== process.getuid())
    ) {
      throw new Error(
        "artifact must be an owner-private regular single-link file"
      )
    }
    const contents = await readFile(outputPath, "utf8")
    const after = await lstat(outputPath)
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs
    ) {
      throw new Error("artifact changed while it was read")
    }
    value = JSON.parse(contents)
  } catch (error) {
    throw new Error(
      `reviewed market publication plan cannot be read: ${(error as Error).message}`
    )
  }
  if (
    hashCatalogTranslationValue(value) !==
    hashCatalogTranslationValue(planArtifact(plan, planHash))
  ) {
    throw new Error(
      "reviewed market publication plan does not exactly match the fresh plan"
    )
  }
}

export const buildMarketCatalogPublicationRollbackArtifact = (
  plan: MarketCatalogPublicationPlan,
  planHash: string,
  createdAt = new Date().toISOString()
): MarketCatalogPublicationRollbackArtifact => ({
  createdAt,
  environment: plan.environment,
  items: plan.items,
  market: plan.market,
  planHash,
  schemaVersion: 1,
  scopeSha256: plan.scopeSha256,
})

export const writeMarketCatalogPublicationRollbackArtifact = async (
  outputPath: string,
  artifact: MarketCatalogPublicationRollbackArtifact
) => writePrivateNoClobber(outputPath, artifact)

export const buildMarketCatalogPublicationApplyReceipt = ({
  appliedAt,
  plan,
  planHash,
  rollbackArtifactSha256,
  targetStateSha256,
}: Readonly<{
  appliedAt: string
  plan: MarketCatalogPublicationPlan
  planHash: string
  rollbackArtifactSha256: string
  targetStateSha256: string
}>): MarketCatalogPublicationApplyReceipt => {
  const payload = {
    appliedAt,
    environment: plan.environment,
    planHash,
    rollbackArtifactSha256,
    schemaVersion: 1 as const,
    scopeSha256: plan.scopeSha256,
    summary: plan.summary,
    targetStateSha256,
  }
  return { ...payload, payloadSha256: hashCatalogTranslationValue(payload) }
}

export const writeMarketCatalogPublicationApplyReceipt = async (
  outputPath: string,
  receipt: MarketCatalogPublicationApplyReceipt
) => writePrivateNoClobber(outputPath, receipt)
