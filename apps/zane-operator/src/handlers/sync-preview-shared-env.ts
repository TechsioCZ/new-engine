import type { AppConfig } from "../config"
import { BadRequestError } from "../db"
import { jsonResponse, mapHandlerError } from "../http"
import { parseSyncPreviewSharedEnvInput } from "../zane-inputs"
import { ZaneClient } from "../zane"

interface SyncPreviewSharedEnvDeps {
  config: AppConfig
}

export async function handleSyncPreviewSharedEnv(
  request: Request,
  deps: SyncPreviewSharedEnvDeps,
): Promise<Response> {
  try {
    const rawBody = await request.json().catch(() => {
      throw new BadRequestError("request body must be valid JSON")
    })

    const client = new ZaneClient(deps.config)
    const payload = parseSyncPreviewSharedEnvInput(rawBody)
    const result = await client.syncPreviewSharedEnv(payload)
    return jsonResponse(200, result)
  } catch (error: unknown) {
    return mapHandlerError(error, "sync-preview-shared-env")
  }
}
