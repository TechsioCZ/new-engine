import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { MeilisearchAdminClient } from "../../../../modules/meilisearch/admin-client"
import { isMeilisearchEnabled } from "../../../../modules/meilisearch/env"

const getSearchStatus = async (
  _request: MedusaRequest,
  response: MedusaResponse,
) => {
  if (!isMeilisearchEnabled()) {
    response.json({ connected: false, enabled: false, status: "disabled" })
    return
  }

  try {
    const health = await new MeilisearchAdminClient().health()

    response.json({
      connected: health.status === "available",
      enabled: true,
      status: health.status ?? "unknown",
    })
  } catch (error) {
    response.json({
      connected: false,
      enabled: true,
      error: error instanceof Error ? error.message : String(error),
      status: "unavailable",
    })
  }
}

export { getSearchStatus as GET }
