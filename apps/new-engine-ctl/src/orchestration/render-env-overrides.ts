import { mkdir, writeFile } from "node:fs/promises"
import nodePath from "node:path"

import { renderEnvOverridesResponseSchema } from "../contracts/render-env-overrides.js"
import type {
  RenderEnvOverridesCommandInput,
  RenderEnvOverridesResponse,
} from "../contracts/render-env-overrides.js"
import {
  buildExpectedEnvOverrides,
  loadDeployContracts,
  normalizeCsvToArray,
} from "./deploy-inputs.js"

const writeJsonFile = async (path: string, value: unknown): Promise<void> => {
  await mkdir(nodePath.dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf-8")
}

export const executeRenderEnvOverrides = async (
  input: RenderEnvOverridesCommandInput,
): Promise<RenderEnvOverridesResponse> => {
  const contracts = await loadDeployContracts(
    input.stackManifestPath,
    input.stackInputsPath,
  )
  const deployServiceIds = normalizeCsvToArray(input.servicesCsv)
  const response = renderEnvOverridesResponseSchema.parse({
    lane: input.lane,
    services: buildExpectedEnvOverrides(deployServiceIds, contracts, {
      lane: input.lane,
      previewDbName: input.previewDbName,
      previewDbPassword: input.previewDbPassword,
      previewDbUser: input.previewDbUser,
      previewRandomOnceSecrets: input.previewRandomOnceSecrets,
      runtimeProviderOutputs: input.runtimeProviderOutputs,
    }),
  })

  if (input.outputJson !== undefined && input.outputJson !== "") {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}
