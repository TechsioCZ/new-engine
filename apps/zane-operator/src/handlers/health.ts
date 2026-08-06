import { jsonResponse } from "../http"

export const handleHealth = (): Response => jsonResponse(200, { ok: true })
