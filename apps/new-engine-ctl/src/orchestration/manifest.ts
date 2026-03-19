import type {
  ManifestComposeServicesCommandInput,
  ManifestComposeServicesResponse,
  ManifestServiceSlugsCommandInput,
  ManifestServiceSlugsResponse,
} from "../contracts/manifest.js"
import {
  manifestComposeServicesResponseSchema,
  manifestServiceSlugsResponseSchema,
} from "../contracts/manifest.js"
import {
  getDeployableService,
  listComposeServicesForPhase,
} from "../contracts/stack-manifest.js"
import { loadManifest, normalizeCsvToArray } from "./deploy-inputs.js"

export async function executeManifestComposeServices(
  input: ManifestComposeServicesCommandInput
 ): Promise<ManifestComposeServicesResponse> {
  const manifest = await loadManifest(input.stackManifestPath)
  const composeServices = listComposeServicesForPhase(
    manifest,
    input.phase,
    input.defaultOnly
  )

  return manifestComposeServicesResponseSchema.parse({
    phase: input.phase,
    default_only: input.defaultOnly,
    compose_services: composeServices,
    compose_services_shell: composeServices.join(" "),
  })
}

export async function executeManifestServiceSlugs(
  input: ManifestServiceSlugsCommandInput
 ): Promise<ManifestServiceSlugsResponse> {
  const manifest = await loadManifest(input.stackManifestPath)
  const serviceIds = normalizeCsvToArray(input.serviceIdsCsv)
  const services = serviceIds.map((serviceId) => {
    const deployable = getDeployableService(manifest, serviceId)
    return {
      service_id: serviceId,
      service_slug: deployable.serviceSlug,
    }
  })

  return manifestServiceSlugsResponseSchema.parse({
    service_ids_csv: serviceIds.join(","),
    service_slugs_csv: services.map((service) => service.service_slug).join(","),
    services,
  })
}
