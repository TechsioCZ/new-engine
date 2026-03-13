import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import {
  type ResolveEnvironmentCommandInput,
  type ResolveEnvironmentResponse,
  resolveEnvironmentResponseSchema,
} from "../contracts/resolve-environment.js"
import { listDeployableServices } from "../contracts/stack-manifest.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"
import { loadManifest, normalizeCsvToArray } from "./deploy-inputs.js"

function buildPreviewEnvironmentName(
  input: ResolveEnvironmentCommandInput
): string {
  if (input.environmentName) {
    return input.environmentName
  }

  return `${input.previewEnvPrefix}${input.prNumber}`
}

function buildPreviewServiceSlugSets(
  input: ResolveEnvironmentCommandInput,
  manifest: Awaited<ReturnType<typeof loadManifest>>
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
  const manifest = await loadManifest(input.stackManifestPath)
  const environmentName = buildPreviewEnvironmentName(input)
  const previewServiceSlugSets =
    input.lane === "preview"
      ? buildPreviewServiceSlugSets(input, manifest)
      : {
          expectedPreviewServiceSlugs: [],
          excludedPreviewServiceSlugs: [],
        }

  const response = input.dryRun
    ? resolveEnvironmentResponseSchema.parse({
        lane: input.lane,
        project_slug: input.projectSlug,
        environment_name: environmentName,
        environment_id: `dry-run:${environmentName}`,
        created: input.dryRunCreated,
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
        input.baseUrl,
        input.apiToken
      ).resolveEnvironment({
        lane: input.lane,
        project_slug: input.projectSlug,
        environment_name: environmentName,
        source_environment_name: input.sourceEnvironmentName || environmentName,
        expected_preview_service_slugs:
          previewServiceSlugSets.expectedPreviewServiceSlugs,
        excluded_preview_service_slugs:
          previewServiceSlugSets.excludedPreviewServiceSlugs,
      })

  if (input.lane === "preview" && !response.ready) {
    throw new Error(
      `Preview environment ${response.environment_name} is missing required cloned services: ${response.missing_preview_service_slugs.join(",")}`
    )
  }

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}
