import { mkdir, writeFile } from "node:fs/promises"
import nodePath from "node:path"

import {
  applyEnvOverridesResponseSchema,
  resolveApplyEnvOverridesInputs,
} from "../contracts/apply-env-overrides.js"
import type {
  ApplyEnvOverridesCommandInput,
  ApplyEnvOverridesPayload,
  ApplyEnvOverridesResponse,
} from "../contracts/apply-env-overrides.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"

const writeJsonFile = async (path: string, value: unknown): Promise<void> => {
  await mkdir(nodePath.dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf-8")
}

export const executeApplyEnvOverridesPayload = async (input: {
  payload: ApplyEnvOverridesPayload
  baseUrl: string
  apiToken: string
  dryRun: boolean
}): Promise<ApplyEnvOverridesResponse> => {
  const { payload } = input

  if (payload.env_overrides.length === 0) {
    return applyEnvOverridesResponseSchema.parse({
      applied_changes: [],
      applied_service_ids: [],
      environment_name: payload.environment_name,
      noop: true,
      project_slug: payload.project_slug,
    })
  }

  if (input.dryRun) {
    return applyEnvOverridesResponseSchema.parse({
      applied_changes: [],
      applied_service_ids: payload.env_overrides.map(
        (override) => override.service_id,
      ),
      environment_name: payload.environment_name,
      noop: false,
      project_slug: payload.project_slug,
    })
  }

  return await new ZaneOperatorClient(
    input.baseUrl,
    input.apiToken,
  ).applyEnvOverrides(payload)
}

export const executeApplyEnvOverrides = async (
  input: ApplyEnvOverridesCommandInput,
): Promise<ApplyEnvOverridesResponse> => {
  const { targets, envOverrides } = await resolveApplyEnvOverridesInputs(
    input.targetsJsonPath,
    input.envOverridesJsonPath,
  )

  const response = await executeApplyEnvOverridesPayload({
    apiToken: input.apiToken,
    baseUrl: input.baseUrl,
    dryRun: input.dryRun,
    payload: {
      env_overrides: envOverrides,
      environment_name: input.environmentName,
      project_slug: input.projectSlug,
      targets,
    },
  })

  if (input.outputJson !== undefined && input.outputJson !== "") {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}
