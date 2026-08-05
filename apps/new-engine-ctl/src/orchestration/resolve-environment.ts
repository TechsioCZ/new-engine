import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import {
  resolveEnvironmentCommandInputSchema,
  resolveEnvironmentResponseSchema,
} from "../contracts/resolve-environment.js"
import type {
  ResolvedEnvironmentCommandInput,
  ResolveEnvironmentCommandInput,
  ResolveEnvironmentResponse,
} from "../contracts/resolve-environment.js"
import { listDeployableServices } from "../contracts/stack-manifest.js"
import type { StackManifest } from "../contracts/stack-manifest.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"
import { loadDeployContracts, normalizeCsvToArray } from "./deploy-inputs.js"
import { buildServiceReconciliationSpecs } from "./preview-runtime-reconciliation.js"

function buildPreviewEnvironmentName(
  input: ResolvedEnvironmentCommandInput,
): string {
  if (input.environmentName) {
    return input.environmentName
  }

  return `${input.previewEnvPrefix}${input.prNumber}`
}

function buildPreviewServiceSlugSets(
  input: ResolvedEnvironmentCommandInput,
  manifest: StackManifest,
): {
  expectedPreviewServiceSlugs: string[]
  excludedPreviewServiceSlugs: string[]
} {
  const deployableServices = listDeployableServices(manifest)
  const clonedServiceIds = normalizeCsvToArray(input.previewClonedServiceIdsCsv)
  const excludedServiceIds = normalizeCsvToArray(
    input.previewExcludedServiceIdsCsv,
  )
  const serviceById = new Map(
    deployableServices.map((service) => [service.id, service.serviceSlug]),
  )

  return {
    excludedPreviewServiceSlugs: excludedServiceIds.flatMap((serviceId) => {
      const serviceSlug = serviceById.get(serviceId)
      return serviceSlug ? [serviceSlug] : []
    }),
    expectedPreviewServiceSlugs: clonedServiceIds.flatMap((serviceId) => {
      const serviceSlug = serviceById.get(serviceId)
      return serviceSlug ? [serviceSlug] : []
    }),
  }
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf-8")
}

export async function executeResolveEnvironment(
  input: ResolveEnvironmentCommandInput,
): Promise<ResolveEnvironmentResponse> {
  const resolvedInput = resolveEnvironmentCommandInputSchema.parse(input)
  const contracts = await loadDeployContracts(
    resolvedInput.stackManifestPath,
    resolvedInput.stackInputsPath,
  )
  const { manifest } = contracts
  const environmentName = buildPreviewEnvironmentName(resolvedInput)
  const previewServiceSlugSets =
    resolvedInput.lane === "preview"
      ? buildPreviewServiceSlugSets(resolvedInput, manifest)
      : {
          excludedPreviewServiceSlugs: [],
          expectedPreviewServiceSlugs: [],
        }
  const serviceSpecs =
    resolvedInput.lane === "preview" || resolvedInput.reconcileServiceIdsCsv
      ? buildServiceReconciliationSpecs({
          lane: resolvedInput.lane,
          manifest,
          previewGitBranch: resolvedInput.previewGitBranch,
          serviceIds:
            resolvedInput.lane === "preview"
              ? normalizeCsvToArray(resolvedInput.previewClonedServiceIdsCsv)
              : normalizeCsvToArray(resolvedInput.reconcileServiceIdsCsv),
          stackInputs: contracts.stackInputs,
        })
      : []

  const response = resolvedInput.dryRun
    ? resolveEnvironmentResponseSchema.parse({
        baseline_complete: !resolvedInput.dryRunCreated,
        created: resolvedInput.dryRunCreated,
        environment_id: `dry-run:${environmentName}`,
        environment_name: environmentName,
        excluded_preview_service_slugs:
          previewServiceSlugSets.excludedPreviewServiceSlugs,
        expected_preview_service_slugs:
          previewServiceSlugSets.expectedPreviewServiceSlugs,
        lane: resolvedInput.lane,
        missing_preview_service_slugs: [],
        present_service_slugs:
          previewServiceSlugSets.expectedPreviewServiceSlugs,
        project_slug: resolvedInput.projectSlug,
        ready: true,
        warnings: [],
      })
    : await new ZaneOperatorClient(
        resolvedInput.baseUrl,
        resolvedInput.apiToken,
      ).resolveEnvironment({
        environment_name: environmentName,
        excluded_preview_service_slugs:
          previewServiceSlugSets.excludedPreviewServiceSlugs,
        expected_preview_service_slugs:
          previewServiceSlugSets.expectedPreviewServiceSlugs,
        lane: resolvedInput.lane,
        project_slug: resolvedInput.projectSlug,
        service_specs: serviceSpecs,
        source_environment_name:
          resolvedInput.sourceEnvironmentName || environmentName,
      })

  if (resolvedInput.lane === "preview" && !response.ready) {
    throw new Error(
      `Preview environment ${response.environment_name} is missing required cloned services: ${response.missing_preview_service_slugs.join(",")}`,
    )
  }

  if (resolvedInput.outputJson) {
    await writeJsonFile(resolvedInput.outputJson, response)
  }

  return response
}
