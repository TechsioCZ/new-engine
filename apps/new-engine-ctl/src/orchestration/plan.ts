import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import { parse as parseYaml } from "yaml"
import {
  type PlanCommandInput,
  type PlanResponse,
  planResponseSchema,
} from "../contracts/plan.js"
import {
  type DeployableService,
  getDeployableService,
  listDeployableServices,
  type StackManifest,
  stackManifestSchema,
} from "../contracts/stack-manifest.js"

type PreviewServiceSets = {
  clonedServices: DeployableService[]
  excludedServices: DeployableService[]
}

function normalizeCsvToArray(csv: string): string[] {
  const values = csv
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  const seen = new Set<string>()
  const normalized: string[] = []

  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value)
      normalized.push(value)
    }
  }

  return normalized
}

async function loadManifest(path: string): Promise<StackManifest> {
  const raw = await readFile(path, "utf8")
  let parsed: unknown

  try {
    parsed = parseYaml(raw)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to parse YAML at ${path}: ${message}`)
  }

  return stackManifestSchema.parse(parsed)
}

function assertServiceAllowedInLane(
  service: DeployableService,
  lane: PlanCommandInput["lane"],
  label: string
): void {
  if (!service.deployLanes.includes(lane)) {
    throw new Error(`${label} ${service.id} is not eligible for lane ${lane}.`)
  }
}

function buildPlanService(
  service: DeployableService
): PlanResponse["deploy_services"][number] {
  return {
    id: service.id,
    service_slug: service.serviceSlug,
    clone_to_preview: service.cloneToPreview,
    deploy_lanes: service.deployLanes,
    deploy_stage: service.deployStage,
    downtime_risk: service.downtimeRisk,
    consumes: service.consumes,
    service_dependencies: service.serviceDependencies,
  }
}

function buildPreviewServiceSets(manifest: StackManifest): PreviewServiceSets {
  const services = listDeployableServices(manifest)

  return {
    clonedServices: services.filter((service) => service.cloneToPreview),
    excludedServices: services.filter((service) => !service.cloneToPreview),
  }
}

function buildRequestedAndDeploySets(
  manifest: StackManifest,
  lane: PlanCommandInput["lane"],
  sourceServiceIds: string[]
): {
  requestedServiceIds: Set<string>
  deployServiceIds: Set<string>
} {
  const requestedServiceIds = new Set<string>()
  const deployServiceIds = new Set<string>()

  for (const serviceId of sourceServiceIds) {
    const service = getDeployableService(manifest, serviceId)
    assertServiceAllowedInLane(service, lane, "Service")
    requestedServiceIds.add(serviceId)
    deployServiceIds.add(serviceId)
  }

  return {
    requestedServiceIds,
    deployServiceIds,
  }
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf8")
}

export async function executePlan(
  input: PlanCommandInput
): Promise<PlanResponse> {
  const manifest = await loadManifest(input.stackManifestPath)
  const sourceServiceIds = normalizeCsvToArray(input.servicesCsv)
  const laneServices = listDeployableServices(manifest).filter((service) =>
    service.deployLanes.includes(input.lane)
  )
  const { requestedServiceIds, deployServiceIds } = buildRequestedAndDeploySets(
    manifest,
    input.lane,
    sourceServiceIds
  )
  const requestedServices = laneServices.filter((service) =>
    requestedServiceIds.has(service.id)
  )
  const deployServices = laneServices.filter((service) =>
    deployServiceIds.has(service.id)
  )
  const previewServiceSets =
    input.lane === "preview"
      ? buildPreviewServiceSets(manifest)
      : { clonedServices: [], excludedServices: [] }

  const response = planResponseSchema.parse({
    lane: input.lane,
    source_services_csv: sourceServiceIds.join(","),
    requested_services_csv: requestedServices
      .map((service) => service.id)
      .join(","),
    deploy_services_csv: deployServices.map((service) => service.id).join(","),
    preview_environment_name:
      input.lane === "preview" && input.prNumber
        ? `${input.previewEnvPrefix}${input.prNumber}`
        : "",
    preview_cloned_service_ids_csv: previewServiceSets.clonedServices
      .map((service) => service.id)
      .join(","),
    preview_excluded_service_ids_csv: previewServiceSets.excludedServices
      .map((service) => service.id)
      .join(","),
    pr_number: input.prNumber ?? null,
    requested_services: requestedServices.map(buildPlanService),
    deploy_services: deployServices.map(buildPlanService),
    preview_cloned_services:
      previewServiceSets.clonedServices.map(buildPlanService),
    preview_excluded_services:
      previewServiceSets.excludedServices.map(buildPlanService),
  })

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}
