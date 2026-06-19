import {
  type LocalEnvRuntimeProviderOutputTargetsCommandInput,
  type LocalEnvRuntimeProviderOutputTargetsResponse,
  localEnvRuntimeProviderOutputTargetsResponseSchema,
} from "../contracts/local-env.js"
import { listLocalRuntimeProviderOutputAliases } from "../contracts/stack-inputs.js"
import { loadStackInputs, normalizeCsvToArray } from "./deploy-inputs.js"

export async function executeLocalEnvRuntimeProviderOutputTargets(
  input: LocalEnvRuntimeProviderOutputTargetsCommandInput
): Promise<LocalEnvRuntimeProviderOutputTargetsResponse> {
  const stackInputs = await loadStackInputs(input.stackInputsPath)
  const serviceIds = normalizeCsvToArray(input.serviceIdsCsv)
  const targets = listLocalRuntimeProviderOutputAliases(
    stackInputs,
    input.providerId,
    input.outputId,
    serviceIds
  ).map((alias) => ({
    service_id: alias.service_id,
    env_var: alias.env_var,
    local_env_var: alias.local_env_var,
  }))

  return localEnvRuntimeProviderOutputTargetsResponseSchema.parse({
    provider_id: input.providerId,
    output_id: input.outputId,
    service_ids_csv: serviceIds.join(","),
    targets,
  })
}
