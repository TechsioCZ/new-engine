import { randomUUID } from "node:crypto"
import { link, open, readFile, unlink } from "node:fs/promises"
import {
  hashCatalogTranslationBytes,
  hashCatalogTranslationValue,
} from "./canonical"
import type {
  CatalogTranslationApplyReceipt,
  CatalogTranslationPlan,
  CatalogTranslationPlanArtifact,
  CatalogTranslationProtectedState,
  CatalogTranslationRollbackArtifact,
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

export const writeCatalogTranslationInputArtifact = writePrivateNoClobber

export const writeCatalogTranslationCanonicalSourceArtifact =
  writePrivateNoClobber

const planArtifact = (
  plan: CatalogTranslationPlan,
  planHash: string
): CatalogTranslationPlanArtifact => ({ plan, planHash, schemaVersion: 1 })

export const writeCatalogTranslationPlanArtifact = async (
  outputPath: string,
  plan: CatalogTranslationPlan,
  planHash: string
) => writePrivateNoClobber(outputPath, planArtifact(plan, planHash))

export const assertCatalogTranslationPlanArtifact = async (
  outputPath: string,
  plan: CatalogTranslationPlan,
  planHash: string
) => {
  let value: unknown
  try {
    value = JSON.parse(await readFile(outputPath, "utf8"))
  } catch (error) {
    throw new Error(
      `reviewed translation plan cannot be read: ${(error as Error).message}`
    )
  }
  if (
    hashCatalogTranslationValue(value) !==
    hashCatalogTranslationValue(planArtifact(plan, planHash))
  ) {
    throw new Error(
      "reviewed translation plan does not exactly match the fresh plan"
    )
  }
}

export const buildCatalogTranslationApplyReceipt = ({
  appliedAt,
  plan,
  planHash,
  protectedState,
  rollbackArtifactSha256,
  targetStateSha256,
}: Readonly<{
  appliedAt: string
  plan: CatalogTranslationPlan
  planHash: string
  protectedState: CatalogTranslationProtectedState
  rollbackArtifactSha256: string
  targetStateSha256: string
}>): CatalogTranslationApplyReceipt => {
  const payload = {
    appliedAt,
    environment: plan.environment,
    planHash,
    protectedState,
    rollbackArtifactSha256,
    schemaVersion: 1 as const,
    scopeSha256: plan.scopeSha256,
    summary: plan.summary,
    targetStateSha256,
  }
  return { ...payload, payloadSha256: hashCatalogTranslationValue(payload) }
}

export const buildCatalogTranslationRollbackArtifact = (
  plan: CatalogTranslationPlan,
  planHash: string,
  createdAt = new Date().toISOString()
): CatalogTranslationRollbackArtifact => ({
  createdAt,
  environment: plan.environment,
  items: plan.items.map((item) => ({
    ...(item.existingId ? { existingId: item.existingId } : {}),
    localeCode: item.localeCode,
    previousTranslations: item.previousTranslations,
    reference: item.reference,
    referenceId: item.referenceId,
    resultingTranslations: item.resultingTranslations,
  })),
  planHash,
  protectedState: plan.protectedState,
  schemaVersion: 1,
  scopeSha256: plan.scopeSha256,
})

export const writeCatalogTranslationRollbackArtifact = async (
  outputPath: string,
  artifact: CatalogTranslationRollbackArtifact
) => writePrivateNoClobber(outputPath, artifact)

export const writeCatalogTranslationApplyReceipt = async (
  outputPath: string,
  receipt: CatalogTranslationApplyReceipt
) => writePrivateNoClobber(outputPath, receipt)
