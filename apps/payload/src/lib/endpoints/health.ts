import type { Endpoint } from "payload"

import { buildJsonResponse } from "../utils/endpoint"

/** Simple health check endpoint for container probes. */
export const healthEndpoint: Endpoint = {
  handler: (req) => buildJsonResponse(req, { status: "ok" }),
  method: "get",
  path: "/health",
}
