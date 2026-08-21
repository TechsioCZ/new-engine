import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/medusa"
import {
  assertCatalogTranslationPlanArtifact,
  buildCatalogTranslationApplyReceipt,
  buildCatalogTranslationRollbackArtifact,
  writeCatalogTranslationApplyReceipt,
  writeCatalogTranslationCanonicalSourceArtifact,
  writeCatalogTranslationInputArtifact,
  writeCatalogTranslationPlanArtifact,
  writeCatalogTranslationRollbackArtifact,
} from "./catalog-translation-pipeline/artifacts"
import {
  loadCatalogTranslationInput,
  parseCatalogTranslationCliOptions,
  parseCatalogTranslationSourceGeneratorCliOptions,
} from "./catalog-translation-pipeline/manifest"
import {
  buildCatalogTranslationPlan,
  hashCatalogTranslationPlan,
} from "./catalog-translation-pipeline/planner"
import {
  applyCatalogTranslationPlan,
  assertCatalogTranslationTestEnvironment,
  inspectCanonicalCatalogTranslationSource,
  inspectCatalogTranslationSnapshot,
  readCatalogTranslationTestEnvironment,
} from "./catalog-translation-pipeline/runtime"
import type { CatalogTranslationInput } from "./catalog-translation-pipeline/types"

const generateCanonicalSourceInput = async (
  args: readonly string[],
  container: ExecArgs["container"],
  logger: Logger
) => {
  const options = parseCatalogTranslationSourceGeneratorCliOptions(args)
  const environment = readCatalogTranslationTestEnvironment()
  const canonical = await inspectCanonicalCatalogTranslationSource(container)
  const sourceArtifact = {
    environment,
    inventory: canonical.inventory,
    records: canonical.sourceRecords,
    schemaVersion: 1 as const,
  }
  const artifactSha256 = await writeCatalogTranslationCanonicalSourceArtifact(
    options.sourceOutputPath,
    sourceArtifact
  )
  const entries = canonical.sourceRecords.map((record) => ({
    localeCode: "sk-SK" as const,
    provenance: {
      artifactSha256,
      method: "canonical-source" as const,
      sourceReference: "generated-live-canonical-source",
    },
    reference: record.reference,
    referenceId: record.referenceId,
    translations: Object.fromEntries(
      Object.entries(record.values).map(([field, value]) => {
        if (value === null || value === undefined) {
          return [field, ""]
        }
        if (typeof value !== "string") {
          throw new Error(
            `canonical ${record.reference}:${record.referenceId}.${field} is not text`
          )
        }
        return [field, value]
      })
    ),
  }))
  const input: CatalogTranslationInput = {
    entries,
    environment,
    inventory: canonical.inventory,
    mode: "normalize-source",
    schemaVersion: 1,
    sourceArtifacts: [
      { path: options.sourceOutputPath, sha256: artifactSha256 },
    ],
    sourceLocale: "sk-SK",
    targetLocale: "sk-SK",
  }
  await writeCatalogTranslationInputArtifact(options.inputOutputPath, input)
  await loadCatalogTranslationInput(options.inputOutputPath)
  logger.info(
    `Generated exact canonical sk-SK input: ${options.inputOutputPath} (${entries.length} entries)`
  )
  logger.info(
    `Canonical source artifact: ${options.sourceOutputPath} (${artifactSha256})`
  )
  logger.info("Source input generation complete; no catalog data was changed")
  return { artifactSha256, entries: entries.length }
}

export default async function catalogTranslationPipeline({
  args,
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  if (args.includes("--generate-source-input")) {
    return generateCanonicalSourceInput(args, container, logger)
  }
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
