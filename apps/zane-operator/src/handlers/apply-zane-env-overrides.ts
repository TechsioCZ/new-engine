import type { AppConfig } from "../config"
import { BadRequestError } from "../db"
import { jsonResponse, mapHandlerError } from "../http"
import type { StackInputsConfig } from "../stack-inputs"
import { ZaneClient } from "../zane"

interface ApplyZaneEnvOverridesDeps {
  config: AppConfig
  stackInputs: StackInputsConfig
}

export async function handleApplyZaneEnvOverrides(
  request: Request,
  deps: ApplyZaneEnvOverridesDeps,
): Promise<Response> {
  try {
    const rawBody = await request.json().catch(() => {
      throw new BadRequestError("request body must be valid JSON")
    })

    const client = new ZaneClient(deps.config, deps.stackInputs)
    const payload = ZaneClient.parseApplyEnvOverridesInput(rawBody)
    const result = await client.applyEnvOverrides({
      projectSlug: payload.projectSlug,
      environmentName: payload.environmentName,
      targets: payload.targets,
      envOverrides: payload.envOverrides,
    })

    return jsonResponse(200, result)
  } catch (error: unknown) {
    return mapHandlerError(error, "apply-zane-env-overrides")
  }
}
