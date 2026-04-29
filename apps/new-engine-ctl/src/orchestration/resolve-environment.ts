import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import {
  type ResolvedEnvironmentCommandInput,
  type ResolveEnvironmentCommandInput,
  type ResolveEnvironmentResponse,
  resolveEnvironmentCommandInputSchema,
  resolveEnvironmentResponseSchema,
} from "../contracts/resolve-environment.js"
import {
  listDeployableServices,
  type StackManifest,
} from "../contracts/stack-manifest.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"
import { loadDeployContracts, normalizeCsvToArray } from "./deploy-inputs.js"
import { buildServiceReconciliationSpecs } from "./preview-runtime-reconciliation.js"

function buildPreviewEnvironmentName(
  input: ResolvedEnvironmentCommandInput
): string {
  if (input.environmentName) {
    return input.environmentName
  }

  return `${input.previewEnvPrefix}${input.prNumber}`
}

function buildPreviewServiceSlugSets(
  input: ResolvedEnvironmentCommandInput,
  manifest: StackManifest
): {
  expectedPreviewServiceSlugs: string[]
  excludedPreviewServiceSlugs: string[]
} {
  const deployableServices = listDeployableServices(manifest)
  const clonedServiceIds = normalizeCsvToArray(input.previewClonedServiceIdsCsv)
  const excludedServiceIds = normalizeCsvToArray(
    input.previewExcludedServiceIdsCsv
  )
  const serviceById = new Map(
    deployableServices.map((service) => [service.id, service.serviceSlug])
  )

  return {
    expectedPreviewServiceSlugs: clonedServiceIds.flatMap((serviceId) => {
      const serviceSlug = serviceById.get(serviceId)
      return serviceSlug ? [serviceSlug] : []
    }),
    excludedPreviewServiceSlugs: excludedServiceIds.flatMap((serviceId) => {
      const serviceSlug = serviceById.get(serviceId)
      return serviceSlug ? [serviceSlug] : []
    }),
  }
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf8")
}

export async function executeResolveEnvironment(
  input: ResolveEnvironmentCommandInput
): Promise<ResolveEnvironmentResponse> {
  const resolvedInput = resolveEnvironmentCommandInputSchema.parse(input)
  const contracts = await loadDeployContracts(
    resolvedInput.stackManifestPath,
    resolvedInput.stackInputsPath
  )
  const manifest = contracts.manifest
  const environmentName = buildPreviewEnvironmentName(resolvedInput)
  const previewServiceSlugSets =
    resolvedInput.lane === "preview"
      ? buildPreviewServiceSlugSets(resolvedInput, manifest)
      : {
          expectedPreviewServiceSlugs: [],
          excludedPreviewServiceSlugs: [],
        }
  const serviceSpecs =
    resolvedInput.lane === "preview" || resolvedInput.reconcileServiceIdsCsv
      ? buildServiceReconciliationSpecs({
          stackInputs: contracts.stackInputs,
          manifest,
          lane: resolvedInput.lane,
          serviceIds:
            resolvedInput.lane === "preview"
              ? normalizeCsvToArray(resolvedInput.previewClonedServiceIdsCsv)
              : normalizeCsvToArray(resolvedInput.reconcileServiceIdsCsv),
          previewGitBranch: resolvedInput.previewGitBranch,
        })
      : []

  const response = resolvedInput.dryRun
    ? resolveEnvironmentResponseSchema.parse({
        lane: resolvedInput.lane,
        project_slug: resolvedInput.projectSlug,
        environment_name: environmentName,
        environment_id: `dry-run:${environmentName}`,
        created: resolvedInput.dryRunCreated,
        baseline_complete: !resolvedInput.dryRunCreated,
        ready: true,
        expected_preview_service_slugs:
          previewServiceSlugSets.expectedPreviewServiceSlugs,
        excluded_preview_service_slugs:
          previewServiceSlugSets.excludedPreviewServiceSlugs,
        present_service_slugs:
          previewServiceSlugSets.expectedPreviewServiceSlugs,
        missing_preview_service_slugs: [],
        warnings: [],
      })
    : await new ZaneOperatorClient(
        resolvedInput.baseUrl,
        resolvedInput.apiToken
      ).resolveEnvironment({
        lane: resolvedInput.lane,
        project_slug: resolvedInput.projectSlug,
        environment_name: environmentName,
        source_environment_name:
          resolvedInput.sourceEnvironmentName || environmentName,
        expected_preview_service_slugs:
          previewServiceSlugSets.expectedPreviewServiceSlugs,
        excluded_preview_service_slugs:
          previewServiceSlugSets.excludedPreviewServiceSlugs,
        service_specs: serviceSpecs,
      })

  if (resolvedInput.lane === "preview" && !response.ready) {
    throw new Error(
      `Preview environment ${response.environment_name} is missing required cloned services: ${response.missing_preview_service_slugs.join(",")}`
    )
  }

  if (resolvedInput.outputJson) {
    await writeJsonFile(resolvedInput.outputJson, response)
  }

  return response
}
