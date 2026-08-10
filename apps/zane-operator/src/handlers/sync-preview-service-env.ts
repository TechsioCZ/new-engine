import type { AppConfig } from "../config"
import { BadRequestError } from "../db"
import { jsonResponse, mapHandlerError } from "../http"
import { ZaneClient } from "../zane"
import { parseSyncPreviewServiceEnvInput } from "../zane-inputs"

interface SyncPreviewServiceEnvDeps {
  config: AppConfig
}

export const handleSyncPreviewServiceEnv = async (
  request: Request,
  deps: SyncPreviewServiceEnvDeps,
): Promise<Response> => {
  try {
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      throw new BadRequestError("request body must be valid JSON")
    }

    const client = new ZaneClient(deps.config)
    const payload = parseSyncPreviewServiceEnvInput(rawBody)
    const result = await client.syncPreviewServiceEnv(payload)
    return jsonResponse(200, result)
  } catch (error: unknown) {
    return mapHandlerError(error, "sync-preview-service-env")
  }
}
