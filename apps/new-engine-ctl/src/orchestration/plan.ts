import { mkdir, readFile, writeFile } from "node:fs/promises"
import nodePath from "node:path"

import { parse as parseYaml } from "yaml"

import { planResponseSchema } from "../contracts/plan.js"
import type { PlanCommandInput, PlanResponse } from "../contracts/plan.js"
import {
  getDeployableService,
  listDeployableServices,
  stackManifestSchema,
} from "../contracts/stack-manifest.js"
import type {
  DeployableService,
  StackManifest,
} from "../contracts/stack-manifest.js"

interface PreviewServiceSets {
  clonedServices: DeployableService[]
  excludedServices: DeployableService[]
}

const normalizeCsvToArray = (csv: string): string[] => {
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

const loadManifest = async (path: string): Promise<StackManifest> => {
  const raw = await readFile(path, "utf-8")
  let parsed: unknown

  try {
    parsed = parseYaml(raw)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to parse YAML at ${path}: ${message}`, {
      cause: error,
    })
  }

  return stackManifestSchema.parse(parsed)
}

const assertServiceAllowedInLane = (
  service: DeployableService,
  lane: PlanCommandInput["lane"],
  label: string,
): void => {
  if (!service.deployLanes.includes(lane)) {
    throw new Error(`${label} ${service.id} is not eligible for lane ${lane}.`)
  }

  if (lane === "preview" && !service.cloneToPreview) {
    throw new Error(
      `${label} ${service.id} is not eligible for lane preview because clone_to_preview is false.`,
    )
  }
}

const buildPlanService = (
  service: DeployableService,
): PlanResponse["deploy_services"][number] => ({
  clone_to_preview: service.cloneToPreview,
  deploy_lanes: service.deployLanes,
  deploy_stage: service.deployStage,
  downtime_risk: service.downtimeRisk,
  id: service.id,
  service_dependencies: service.serviceDependencies,
  service_slug: service.serviceSlug,
})

const buildPreviewServiceSets = (
  manifest: StackManifest,
  explicitlyRequestedServiceIds: Set<string>,
): PreviewServiceSets => {
  const services = listDeployableServices(manifest).filter(
    (service) =>
      service.enabledByDefault || explicitlyRequestedServiceIds.has(service.id),
  )

  return {
    clonedServices: services.filter((service) => service.cloneToPreview),
    excludedServices: services.filter((service) => !service.cloneToPreview),
  }
}

const buildRequestedAndDeploySets = (
  manifest: StackManifest,
  lane: PlanCommandInput["lane"],
  sourceServiceIds: string[],
): {
  requestedServiceIds: Set<string>
  deployServiceIds: Set<string>
} => {
  const requestedServiceIds = new Set<string>()
  const deployServiceIds = new Set<string>()

  for (const serviceId of sourceServiceIds) {
    const service = getDeployableService(manifest, serviceId)
    assertServiceAllowedInLane(service, lane, "Service")
    requestedServiceIds.add(serviceId)
    deployServiceIds.add(serviceId)
  }

  return {
    deployServiceIds,
    requestedServiceIds,
  }
}

const writeJsonFile = async (path: string, value: unknown): Promise<void> => {
  await mkdir(nodePath.dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf-8")
}

export const executePlan = async (
  input: PlanCommandInput,
): Promise<PlanResponse> => {
  const manifest = await loadManifest(input.stackManifestPath)
  const sourceServiceIds = normalizeCsvToArray(input.servicesCsv)
  const laneServices = listDeployableServices(manifest).filter(
    (service) =>
      service.deployLanes.includes(input.lane) &&
      (input.lane !== "preview" || service.cloneToPreview),
  )
  const { requestedServiceIds, deployServiceIds } = buildRequestedAndDeploySets(
    manifest,
    input.lane,
    sourceServiceIds,
  )
  const requestedServices = laneServices.filter((service) =>
    requestedServiceIds.has(service.id),
  )
  const deployServices = laneServices.filter((service) =>
    deployServiceIds.has(service.id),
  )
  const previewServiceSets =
    input.lane === "preview"
      ? buildPreviewServiceSets(manifest, requestedServiceIds)
      : { clonedServices: [], excludedServices: [] }

  const response = planResponseSchema.parse({
    deploy_services: deployServices.map(buildPlanService),
    deploy_services_csv: deployServices.map((service) => service.id).join(","),
    lane: input.lane,
    pr_number: input.prNumber ?? null,
    preview_cloned_service_ids_csv: previewServiceSets.clonedServices
      .map((service) => service.id)
      .join(","),
    preview_cloned_services:
      previewServiceSets.clonedServices.map(buildPlanService),
    preview_environment_name:
      input.lane === "preview" &&
      input.prNumber !== undefined &&
      input.prNumber !== 0
        ? `${input.previewEnvPrefix}${input.prNumber}`
        : "",
    preview_excluded_service_ids_csv: previewServiceSets.excludedServices
      .map((service) => service.id)
      .join(","),
    preview_excluded_services:
      previewServiceSets.excludedServices.map(buildPlanService),
    requested_services: requestedServices.map(buildPlanService),
    requested_services_csv: requestedServices
      .map((service) => service.id)
      .join(","),
    source_services_csv: sourceServiceIds.join(","),
  })

  if (input.outputJson !== undefined && input.outputJson !== "") {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}
