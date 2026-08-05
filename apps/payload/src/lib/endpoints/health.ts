import type { Endpoint } from "payload"

import { buildJsonResponse } from "../utils/endpoint"

/** Simple health check endpoint for container probes. */
export const healthEndpoint: Endpoint = {
  handler: async (req) => buildJsonResponse(req, { status: "ok" }),
  method: "get",
  path: "/health",
}
