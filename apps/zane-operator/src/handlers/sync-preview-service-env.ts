import type { AppConfig } from "../config"
import { BadRequestError } from "../db"
import { jsonResponse, mapHandlerError } from "../http"
import { parseSyncPreviewServiceEnvInput } from "../zane-inputs"
import { ZaneClient } from "../zane"

interface SyncPreviewServiceEnvDeps {
  config: AppConfig
}

export async function handleSyncPreviewServiceEnv(
  request: Request,
  deps: SyncPreviewServiceEnvDeps,
): Promise<Response> {
  try {
    const rawBody = await request.json().catch(() => {
      throw new BadRequestError("request body must be valid JSON")
    })

    const client = new ZaneClient(deps.config)
    const payload = parseSyncPreviewServiceEnvInput(rawBody)
    const result = await client.syncPreviewServiceEnv(payload)
    return jsonResponse(200, result)
  } catch (error: unknown) {
    return mapHandlerError(error, "sync-preview-service-env")
  }
}
