import { jsonResponse } from "../http"

export function handleHealth(): Response {
  return jsonResponse(200, { ok: true })
}
