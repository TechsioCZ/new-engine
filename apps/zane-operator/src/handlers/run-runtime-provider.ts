import type { AppConfig } from "../config"
import { BadRequestError } from "../db"
import { jsonResponse, mapHandlerError } from "../http"
import { ZaneClient } from "../zane"
import { parseRuntimeProviderRunInput } from "../zane-inputs"

interface RunRuntimeProviderDeps {
  config: AppConfig
}

export const handleRunRuntimeProvider = async (
  request: Request,
  deps: RunRuntimeProviderDeps,
): Promise<Response> => {
  try {
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      throw new BadRequestError("request body must be valid JSON")
    }

    const client = new ZaneClient(deps.config)
    const payload = parseRuntimeProviderRunInput(rawBody)
    const result = await client.runRuntimeProvider(payload)
    return jsonResponse(200, result)
  } catch (error: unknown) {
    return mapHandlerError(error, "run-runtime-provider")
  }
}
