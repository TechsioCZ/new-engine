import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import {
  type ApplyEnvOverridesCommandInput,
  type ApplyEnvOverridesResponse,
  applyEnvOverridesResponseSchema,
  resolveApplyEnvOverridesInputs,
} from "../contracts/apply-env-overrides.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf8")
}

export async function executeApplyEnvOverrides(
  input: ApplyEnvOverridesCommandInput
): Promise<ApplyEnvOverridesResponse> {
  const { targets, envOverrides } = await resolveApplyEnvOverridesInputs(
    input.targetsJsonPath,
    input.envOverridesJsonPath
  )

  let response: ApplyEnvOverridesResponse

  if (envOverrides.length === 0) {
    response = applyEnvOverridesResponseSchema.parse({
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      noop: true,
      applied_service_ids: [],
      applied_changes: [],
    })
  } else if (input.dryRun) {
    response = applyEnvOverridesResponseSchema.parse({
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      noop: false,
      applied_service_ids: envOverrides.map((override) => override.service_id),
      applied_changes: [],
    })
  } else {
    response = await new ZaneOperatorClient(
      input.baseUrl,
      input.apiToken
    ).applyEnvOverrides({
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      targets,
      env_overrides: envOverrides,
    })
  }

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}
