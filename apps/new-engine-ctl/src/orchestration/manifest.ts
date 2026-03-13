import type {
  ManifestComposeServicesCommandInput,
  ManifestComposeServicesResponse,
} from "../contracts/manifest.js"
import { manifestComposeServicesResponseSchema } from "../contracts/manifest.js"
import { listComposeServicesForPhase } from "../contracts/stack-manifest.js"
import { loadManifest } from "./deploy-inputs.js"

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
