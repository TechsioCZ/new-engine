import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import {
  type ApplyEnvOverridesCommandInput,
  type ApplyEnvOverridesPayload,
  type ApplyEnvOverridesResponse,
  applyEnvOverridesResponseSchema,
  resolveApplyEnvOverridesInputs,
} from "../contracts/apply-env-overrides.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf8")
}

export function executeApplyEnvOverridesPayload(input: {
  payload: ApplyEnvOverridesPayload
  baseUrl: string
  apiToken: string
  dryRun: boolean
}): Promise<ApplyEnvOverridesResponse> {
  const { payload } = input

  if (payload.env_overrides.length === 0) {
    return Promise.resolve(
      applyEnvOverridesResponseSchema.parse({
        project_slug: payload.project_slug,
        environment_name: payload.environment_name,
        noop: true,
        applied_service_ids: [],
        applied_changes: [],
      })
    )
  }

  if (input.dryRun) {
    return Promise.resolve(
      applyEnvOverridesResponseSchema.parse({
        project_slug: payload.project_slug,
        environment_name: payload.environment_name,
        noop: false,
        applied_service_ids: payload.env_overrides.map(
          (override) => override.service_id
        ),
        applied_changes: [],
      })
    )
  }

  return new ZaneOperatorClient(
    input.baseUrl,
    input.apiToken
  ).applyEnvOverrides(payload)
}

export async function executeApplyEnvOverrides(
  input: ApplyEnvOverridesCommandInput
): Promise<ApplyEnvOverridesResponse> {
  const { targets, envOverrides } = await resolveApplyEnvOverridesInputs(
    input.targetsJsonPath,
    input.envOverridesJsonPath
  )

  const response = await executeApplyEnvOverridesPayload({
    payload: {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      targets,
      env_overrides: envOverrides,
    },
    baseUrl: input.baseUrl,
    apiToken: input.apiToken,
    dryRun: input.dryRun,
  })

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}
