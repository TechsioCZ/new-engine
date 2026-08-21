import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/medusa"
import { hashCatalogTranslationValue } from "./catalog-translation-pipeline/canonical"
import { loadCatalogTranslationInput } from "./catalog-translation-pipeline/manifest"
import { assertCatalogTranslationTestEnvironment } from "./catalog-translation-pipeline/runtime"
import { assertMarketCatalogPublicationTranslationEvidence } from "./market-catalog-publication/evidence"
import {
  assertMarketCatalogPublicationPlanArtifact,
  buildMarketCatalogPublicationApplyReceipt,
  buildMarketCatalogPublicationRollbackArtifact,
  writeMarketCatalogPublicationApplyReceipt,
  writeMarketCatalogPublicationPlanArtifact,
  writeMarketCatalogPublicationRollbackArtifact,
} from "./market-catalog-publication/artifacts"
import {
  loadMarketCatalogPublicationManifest,
  parseMarketCatalogPublicationCliOptions,
} from "./market-catalog-publication/manifest"
import {
  assertMarketCatalogPublicationClosed,
  buildMarketCatalogPublicationPlan,
  hashMarketCatalogPublicationPlan,
} from "./market-catalog-publication/planner"
import {
  applyMarketCatalogPublication,
  inspectMarketCatalogPublication,
} from "./market-catalog-publication/runtime"

export default async function marketCatalogPublication({
  args,
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const options = parseMarketCatalogPublicationCliOptions(args)
  const [{ absolutePath, manifest, manifestSha256 }, translation] =
    await Promise.all([
      loadMarketCatalogPublicationManifest(options.manifestPath),
      loadCatalogTranslationInput(options.translationInputPath),
    ])
  if (translation.inputSha256 !== manifest.translationInputSha256) {
    throw new Error(
      "publication manifest translationInputSha256 does not match the exact input artifact"
    )
  }
  assertCatalogTranslationTestEnvironment(translation.input)
  await assertMarketCatalogPublicationTranslationEvidence(
    manifest,
    translation.input
  )
  const prepare = async () =>
    buildMarketCatalogPublicationPlan(
      manifest,
      manifestSha256,
      await inspectMarketCatalogPublication(
        container,
        manifest,
        translation.input,
        translation.inputSha256
      )
    )
  const plan = await prepare()
  const planHash = hashMarketCatalogPublicationPlan(plan)
  logger.info(
    `${manifest.market.toUpperCase()} catalog publication manifest: ${absolutePath}`
  )
  logger.info(
    `Market catalog publication plan: ${JSON.stringify(plan.summary)}`
  )
  logger.info(`Market catalog publication scope hash: ${plan.scopeSha256}`)
  logger.info(`Market catalog publication plan hash: ${planHash}`)

  if (!options.apply) {
    await writeMarketCatalogPublicationPlanArtifact(
      options.planOutputPath,
      plan,
      planHash
    )
    logger.info(
      `Market catalog publication review artifact: ${options.planOutputPath}`
    )
    logger.info("Dry-run complete; no catalog data was changed")
    return { ...plan.summary, planHash, scopeSha256: plan.scopeSha256 }
  }

  if (options.confirmPlanHash !== planHash) {
    throw new Error(
      "--apply requires --confirm-plan-hash with the exact latest dry-run hash"
    )
  }
  await assertMarketCatalogPublicationPlanArtifact(
    options.planOutputPath,
    plan,
    planHash
  )
  const freshPlan = await prepare()
  if (
    hashMarketCatalogPublicationPlan(freshPlan) !== planHash ||
    hashCatalogTranslationValue(freshPlan) !== hashCatalogTranslationValue(plan)
  ) {
    throw new Error(
      "market catalog publication changed after the confirmed preflight"
    )
  }
  const rollbackArtifact = buildMarketCatalogPublicationRollbackArtifact(
    plan,
    planHash
  )
  const rollbackArtifactSha256 =
    await writeMarketCatalogPublicationRollbackArtifact(
      options.rollbackOutputPath as string,
      rollbackArtifact
    )
  const result = await applyMarketCatalogPublication(container, plan)
  const finalPlan = await prepare()
  if (
    finalPlan.scopeSha256 !== plan.scopeSha256 ||
    hashCatalogTranslationValue(finalPlan.scope) !==
      hashCatalogTranslationValue(plan.scope)
  ) {
    throw new Error("market catalog publication scope changed during apply")
  }
  assertMarketCatalogPublicationClosed(finalPlan)
  const receipt = buildMarketCatalogPublicationApplyReceipt({
    appliedAt: new Date().toISOString(),
    plan,
    planHash,
    rollbackArtifactSha256,
    targetStateSha256: hashMarketCatalogPublicationPlan(finalPlan),
  })
  await writeMarketCatalogPublicationApplyReceipt(
    options.receiptOutputPath as string,
    receipt
  )
  logger.info(
    `Market catalog publication applied: ${result.completedProducts} products, ${result.completedCategories} categories, ${result.completedBrands} brands`
  )
  return { ...result, receipt }
}
