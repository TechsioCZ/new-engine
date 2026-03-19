import type { AppConfig } from "../config"
import { BadRequestError } from "../db"
import { jsonResponse, mapHandlerError } from "../http"
import { parseRuntimeProviderRunInput } from "../zane-inputs"
import { ZaneClient } from "../zane"

type RunRuntimeProviderDeps = {
  config: AppConfig
}

export async function handleRunRuntimeProvider(
  request: Request,
  deps: RunRuntimeProviderDeps
): Promise<Response> {
  try {
    const rawBody = await request.json().catch(() => {
      throw new BadRequestError("request body must be valid JSON")
    })

    const client = new ZaneClient(deps.config)
    const payload = parseRuntimeProviderRunInput(rawBody)
    const result = await client.runRuntimeProvider(payload)
    return jsonResponse(200, result)
  } catch (error: unknown) {
    return mapHandlerError(error, "run-runtime-provider")
  }
}
