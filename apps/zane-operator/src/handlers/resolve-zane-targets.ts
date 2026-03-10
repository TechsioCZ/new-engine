import type { AppConfig } from "../config"
import { BadRequestError } from "../db"
import { jsonResponse, mapHandlerError } from "../http"
import { ZaneClient } from "../zane"

interface ResolveZaneTargetsDeps {
  config: AppConfig
}

export async function handleResolveZaneTargets(request: Request, deps: ResolveZaneTargetsDeps): Promise<Response> {
  try {
    const rawBody = await request.json().catch(() => {
      throw new BadRequestError("request body must be valid JSON")
    })

    const client = new ZaneClient(deps.config)
    const payload = ZaneClient.parseResolveTargetsInput(rawBody)
    const result = await client.resolveTargets({
      projectSlug: payload.projectSlug,
      environmentName: payload.environmentName,
      services: payload.services,
    })

    return jsonResponse(200, result)
  } catch (error: unknown) {
    return mapHandlerError(error, "resolve-zane-targets")
  }
}
