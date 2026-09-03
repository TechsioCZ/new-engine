import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/medusa"
import {
  buildRoCatalogSkBaselineArtifact,
  parseRoCatalogSkBaselineOutputPath,
  writeRoCatalogSkBaselineArtifact,
} from "./ro-catalog-import/baseline-artifact"
import {
  buildSkPublicationAuditBaseline,
  collectRoCatalogReadinessInput,
} from "./ro-catalog-readiness"

export default async function captureRoCatalogSkBaseline({
  args,
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const outputPath = parseRoCatalogSkBaselineOutputPath(args)
  logger.info("[RO catalog SK baseline] Starting read-only capture")
  const input = await collectRoCatalogReadinessInput(container)
  const artifact = buildRoCatalogSkBaselineArtifact(
    buildSkPublicationAuditBaseline(input)
  )
  await writeRoCatalogSkBaselineArtifact(outputPath, artifact)
  logger.info(
    `[RO catalog SK baseline] SK ${artifact.skProtection.baseline.count}:${artifact.skProtection.baseline.sha256}; inventory ${artifact.skProtection.sharedInventoryBaseline.count}:${artifact.skProtection.sharedInventoryBaseline.sha256}`
  )
  logger.info(`[RO catalog SK baseline] Artifact: ${outputPath}`)
  return artifact
}
