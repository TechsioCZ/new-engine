import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  PPL_CLIENT_MODULE,
  type PplClientModuleService,
} from "../../../../modules/ppl-client"
import { safeResolve } from "../../../../utils/safe-resolve"

type PplWidgetConfigResponse = {
  enabled: boolean
  api_key: string | null
}

export async function GET(
  request: MedusaRequest,
  response: MedusaResponse<PplWidgetConfigResponse>
) {
  response.setHeader("Cache-Control", "no-store")

  const pplService = safeResolve<PplClientModuleService>(
    request.scope,
    PPL_CLIENT_MODULE
  )
  if (!pplService) {
    return response.json({ enabled: false, api_key: null })
  }

  const config = await pplService.getActiveConfig()
  const apiKey = config.widget_api_key?.trim() ?? ""
  const enabled = config.is_enabled && apiKey.length > 0

  return response.json({
    enabled,
    api_key: enabled ? apiKey : null,
  })
}
