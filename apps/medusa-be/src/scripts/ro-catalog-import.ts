import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/medusa"
import {
  assertRoCatalogGenerationProof,
  bindRoCatalogGenerationProof,
} from "./ro-catalog-import/generation-proof"
import {
  loadRoCatalogManifest,
  parseRoCatalogCliOptions,
} from "./ro-catalog-import/manifest"
import {
  assertRoCatalogOmissionLedger,
  assertRoCatalogPlanArtifact,
  writeRoCatalogOmissionLedger,
  writeRoCatalogPlanArtifact,
} from "./ro-catalog-import/plan-artifact"
import { hashRoCatalogImportPlan } from "./ro-catalog-import/planner"
import {
  assertRoCatalogPostCommerceProvenance,
  assertRoCatalogRuntimeEnvironment,
} from "./ro-catalog-import/provenance"
import {
  applyRoCatalogImport,
  prepareRoCatalogImport,
} from "./ro-catalog-import/runtime"

export default async function roCatalogImport({ args, container }: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const options = parseRoCatalogCliOptions(args)
  const { absolutePath, manifest } = await loadRoCatalogManifest(
    options.manifestPath
  )
  await assertRoCatalogPostCommerceProvenance(
    options.postCommerceEnvelopePath,
    manifest
  )
  assertRoCatalogRuntimeEnvironment(manifest)
  const generationProof = await assertRoCatalogGenerationProof(
    options.generationPlanPath,
    manifest
  )
  logger.info(
    `RO catalog import preflight: ${manifest.products.length} products and ${manifest.categories.length} categories from ${absolutePath}`
  )
  const plan = bindRoCatalogGenerationProof(
    await prepareRoCatalogImport(container, manifest, {
      salesChannelId: options.salesChannelId,
    }),
    generationProof
  )
  const planHash = hashRoCatalogImportPlan(plan)
  logger.info(`RO catalog import plan: ${JSON.stringify(plan.summary)}`)
  logger.info(
    `RO catalog expected SK baseline: ${JSON.stringify(plan.expectedSkBaseline)}`
  )
  logger.info(
    `RO catalog expected shared inventory baseline: ${JSON.stringify(plan.expectedSharedInventoryBaseline)}`
  )
  logger.info(`RO catalog import plan hash: ${planHash}`)
  logger.info(
    `RO catalog import scope hash: ${plan.scopeSha256} ${JSON.stringify(plan.scope)}`
  )
  if (plan.omissionLedger && !options.omissionLedgerOutputPath) {
    throw new Error(
      "description-only demo requires --omission-ledger-output with an absolute path"
    )
  }
  if (!plan.omissionLedger && options.omissionLedgerOutputPath) {
    throw new Error(
      "--omission-ledger-output is only valid for a description-only demo manifest"
    )
  }

  if (!options.apply) {
    await writeRoCatalogPlanArtifact(options.planOutputPath, plan, planHash)
    if (plan.omissionLedger && options.omissionLedgerOutputPath) {
      await writeRoCatalogOmissionLedger(
        options.omissionLedgerOutputPath,
        plan.omissionLedger
      )
      logger.info(
        `RO demo omission ledger (${plan.omissionLedgerSha256}): ${options.omissionLedgerOutputPath}`
      )
    }
    logger.info(`RO catalog import review artifact: ${options.planOutputPath}`)
    logger.info("Dry-run complete; no catalog data was changed")
    return {
      ...plan.summary,
      expectedSkBaseline: plan.expectedSkBaseline,
      planHash,
    }
  }

  if (options.confirmPlanHash !== planHash) {
    throw new Error(
      "--apply requires --confirm-plan-hash with the exact hash emitted by the latest dry-run"
    )
  }
  await assertRoCatalogPlanArtifact(options.planOutputPath, plan, planHash)
  await assertRoCatalogPostCommerceProvenance(
    options.postCommerceEnvelopePath,
    manifest
  )
  assertRoCatalogRuntimeEnvironment(manifest)
  const refreshedGenerationProof = await assertRoCatalogGenerationProof(
    options.generationPlanPath,
    manifest
  )
  if (
    JSON.stringify(refreshedGenerationProof) !== JSON.stringify(generationProof)
  ) {
    throw new Error("generation plan changed after confirmed preflight")
  }
  if (plan.omissionLedger && options.omissionLedgerOutputPath) {
    await assertRoCatalogOmissionLedger(
      options.omissionLedgerOutputPath,
      plan.omissionLedger
    )
  }

  const result = await applyRoCatalogImport(container, plan, manifest, {
    chunkSize: options.chunkSize,
    salesChannelId: options.salesChannelId,
  })
  logger.info(
    `RO catalog import applied: ${result.completedProducts} localized products, ${result.completedExcludedProducts} excluded products, ${result.completedCategories} localized categories, ${result.completedExcludedCategories} excluded categories, ${result.completedBrands} published brands, and ${result.completedExcludedBrands} excluded brands completed`
  )
  return { ...plan.summary, ...result }
}
