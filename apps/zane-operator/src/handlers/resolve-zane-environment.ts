import type { AppConfig } from "../config"
import { BadRequestError } from "../db"
import { jsonResponse, mapHandlerError } from "../http"
import type { StackInputsConfig } from "../stack-inputs"
import { parseResolveEnvironmentInput } from "../zane-inputs"
import { ZaneClient } from "../zane"

interface ResolveZaneEnvironmentDeps {
  config: AppConfig
  stackInputs: StackInputsConfig
}

export async function handleResolveZaneEnvironment(
  request: Request,
  deps: ResolveZaneEnvironmentDeps,
): Promise<Response> {
  try {
    const rawBody = await request.json().catch(() => {
      throw new BadRequestError("request body must be valid JSON")
    })

    const client = new ZaneClient(deps.config, deps.stackInputs)
    const payload = parseResolveEnvironmentInput(rawBody)
    const result = await client.resolveEnvironment(payload)
    return jsonResponse(200, result)
  } catch (error: unknown) {
    return mapHandlerError(error, "resolve-zane-environment")
  }
}
