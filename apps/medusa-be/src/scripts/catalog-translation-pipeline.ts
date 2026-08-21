import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/medusa"
import {
  assertCatalogTranslationPlanArtifact,
  buildCatalogTranslationApplyReceipt,
  buildCatalogTranslationRollbackArtifact,
  writeCatalogTranslationApplyReceipt,
  writeCatalogTranslationPlanArtifact,
  writeCatalogTranslationRollbackArtifact,
} from "./catalog-translation-pipeline/artifacts"
import {
  loadCatalogTranslationInput,
  parseCatalogTranslationCliOptions,
} from "./catalog-translation-pipeline/manifest"
import {
  buildCatalogTranslationPlan,
  hashCatalogTranslationPlan,
} from "./catalog-translation-pipeline/planner"
import {
  applyCatalogTranslationPlan,
  assertCatalogTranslationTestEnvironment,
  inspectCatalogTranslationSnapshot,
} from "./catalog-translation-pipeline/runtime"

export default async function catalogTranslationPipeline({
  args,
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const options = parseCatalogTranslationCliOptions(args)
  const { absolutePath, input, inputSha256 } =
    await loadCatalogTranslationInput(options.inputPath)
  assertCatalogTranslationTestEnvironment(input)
  const plan = buildCatalogTranslationPlan(
    input,
    inputSha256,
    await inspectCatalogTranslationSnapshot(container, input)
  )
  const planHash = hashCatalogTranslationPlan(plan)
  logger.info(
    `Catalog translation test pipeline input: ${absolutePath} (${input.entries.length} exact entries)`
  )
  logger.info(`Catalog translation plan: ${JSON.stringify(plan.summary)}`)
  logger.info(`Catalog translation scope hash: ${plan.scopeSha256}`)
  logger.info(`Catalog translation plan hash: ${planHash}`)

  if (!options.apply) {
    await writeCatalogTranslationPlanArtifact(
      options.planOutputPath,
      plan,
      planHash
    )
    logger.info(
      `Catalog translation review artifact: ${options.planOutputPath}`
    )
    logger.info("Dry-run complete; no catalog data was changed")
    return { ...plan.summary, planHash, scopeSha256: plan.scopeSha256 }
  }

  if (options.confirmPlanHash !== planHash) {
    throw new Error(
      "--apply requires --confirm-plan-hash with the exact latest dry-run hash"
    )
  }
  await assertCatalogTranslationPlanArtifact(
    options.planOutputPath,
    plan,
    planHash
  )
  assertCatalogTranslationTestEnvironment(input)
  const rollbackArtifact = buildCatalogTranslationRollbackArtifact(
    plan,
    planHash
  )
  const rollbackArtifactSha256 = await writeCatalogTranslationRollbackArtifact(
    options.rollbackOutputPath as string,
    rollbackArtifact
  )
  logger.info(
    `Catalog translation rollback artifact: ${options.rollbackOutputPath} (${rollbackArtifactSha256})`
  )
  const result = await applyCatalogTranslationPlan(
    container,
    input,
    plan,
    options.chunkSize
  )
  const receipt = buildCatalogTranslationApplyReceipt({
    appliedAt: new Date().toISOString(),
    plan,
    planHash,
    protectedState: result.protectedState,
    rollbackArtifactSha256,
    targetStateSha256: result.targetStateSha256,
  })
  await writeCatalogTranslationApplyReceipt(
    options.receiptOutputPath as string,
    receipt
  )
  logger.info(
    `Catalog translation apply receipt: ${options.receiptOutputPath} (${receipt.payloadSha256})`
  )
  return receipt
}
