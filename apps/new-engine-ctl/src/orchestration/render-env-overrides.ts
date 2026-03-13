import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import {
  type RenderEnvOverridesCommandInput,
  type RenderEnvOverridesResponse,
  renderEnvOverridesResponseSchema,
} from "../contracts/render-env-overrides.js"
import {
  buildExpectedEnvOverrides,
  getMeiliApiCredentialEnvVars,
  loadDeployContracts,
  normalizeCsvToArray,
} from "./deploy-inputs.js"

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf8")
}

export async function executeRenderEnvOverrides(
  input: RenderEnvOverridesCommandInput
): Promise<RenderEnvOverridesResponse> {
  const contracts = await loadDeployContracts(
    input.stackManifestPath,
    input.stackInputsPath
  )
  const deployServiceIds = normalizeCsvToArray(input.servicesCsv)
  const meiliApiCredentialEnvVars = getMeiliApiCredentialEnvVars(
    contracts.stackInputs
  )
  const response = renderEnvOverridesResponseSchema.parse({
    lane: input.lane,
    services: buildExpectedEnvOverrides(deployServiceIds, contracts, {
      lane: input.lane,
      previewDbName: input.previewDbName,
      previewDbUser: input.previewDbUser,
      previewDbPassword: input.previewDbPassword,
      previewRandomOnceSecrets: input.previewRandomOnceSecrets,
      meiliFrontendKey: input.meiliFrontendKey,
      meiliFrontendEnvVar:
        input.meiliFrontendEnvVar || meiliApiCredentialEnvVars.frontend,
      meiliBackendKey: input.meiliBackendKey,
      meiliApiCredentialEnvVars,
    }),
  })

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}
