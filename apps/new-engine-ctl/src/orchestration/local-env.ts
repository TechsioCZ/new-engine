import { localEnvRuntimeProviderOutputTargetsResponseSchema } from "../contracts/local-env.js"
import type {
  LocalEnvRuntimeProviderOutputTargetsCommandInput,
  LocalEnvRuntimeProviderOutputTargetsResponse,
} from "../contracts/local-env.js"
import { listLocalRuntimeProviderOutputAliases } from "../contracts/stack-inputs.js"
import { loadStackInputs, normalizeCsvToArray } from "./deploy-inputs.js"

export const executeLocalEnvRuntimeProviderOutputTargets = async (
  input: LocalEnvRuntimeProviderOutputTargetsCommandInput,
): Promise<LocalEnvRuntimeProviderOutputTargetsResponse> => {
  const stackInputs = await loadStackInputs(input.stackInputsPath)
  const serviceIds = normalizeCsvToArray(input.serviceIdsCsv)
  const targets = listLocalRuntimeProviderOutputAliases(
    stackInputs,
    input.providerId,
    input.outputId,
    serviceIds,
  ).map((alias) => ({
    env_var: alias.env_var,
    local_env_var: alias.local_env_var,
    service_id: alias.service_id,
  }))

  return localEnvRuntimeProviderOutputTargetsResponseSchema.parse({
    output_id: input.outputId,
    provider_id: input.providerId,
    service_ids_csv: serviceIds.join(","),
    targets,
  })
}
