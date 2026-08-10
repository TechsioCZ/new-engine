import type { AppConfig } from "../config"
import { BadRequestError } from "../db"
import { jsonResponse, mapHandlerError } from "../http"
import { ZaneClient } from "../zane"
import { parseResolveTargetsInput } from "../zane-inputs"

interface ResolveZaneTargetsDeps {
  config: AppConfig
}

export const handleResolveZaneTargets = async (
  request: Request,
  deps: ResolveZaneTargetsDeps,
): Promise<Response> => {
  try {
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      throw new BadRequestError("request body must be valid JSON")
    }

    const client = new ZaneClient(deps.config)
    const payload = parseResolveTargetsInput(rawBody)
    const result = await client.resolveTargets({
      environmentName: payload.environmentName,
      projectSlug: payload.projectSlug,
      services: payload.services,
    })

    return jsonResponse(200, result)
  } catch (error: unknown) {
    return mapHandlerError(error, "resolve-zane-targets")
  }
}
