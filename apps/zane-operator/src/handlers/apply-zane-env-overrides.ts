import type { AppConfig } from "../config"
import { BadRequestError } from "../db"
import { jsonResponse, mapHandlerError } from "../http"
import { ZaneClient } from "../zane"
import { parseApplyEnvOverridesInput } from "../zane-inputs"

interface ApplyZaneEnvOverridesDeps {
  config: AppConfig
}

export const handleApplyZaneEnvOverrides = async (
  request: Request,
  deps: ApplyZaneEnvOverridesDeps,
): Promise<Response> => {
  try {
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      throw new BadRequestError("request body must be valid JSON")
    }

    const client = new ZaneClient(deps.config)
    const payload = parseApplyEnvOverridesInput(rawBody)
    const result = await client.applyEnvOverrides({
      envOverrides: payload.envOverrides,
      environmentName: payload.environmentName,
      projectSlug: payload.projectSlug,
      targets: payload.targets,
    })

    return jsonResponse(200, result)
  } catch (error: unknown) {
    return mapHandlerError(error, "apply-zane-env-overrides")
  }
}
