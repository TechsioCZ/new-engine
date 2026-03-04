import { timingSafeEqual } from "node:crypto"

import { jsonError } from "./http"

function safeTokenCompare(expected: string, actual: string): boolean {
  const expectedBytes = Buffer.from(expected)
  const actualBytes = Buffer.from(actual)

  if (expectedBytes.length !== actualBytes.length) {
    return false
  }

  return timingSafeEqual(expectedBytes, actualBytes)
}

export function enforceBearerToken(request: Request, expectedToken: string): Response | null {
  const authorization = request.headers.get("authorization")

  if (!authorization) {
    return jsonError(401, "missing_authorization", "Authorization header is required")
  }

  const tokenMatch = /^Bearer\s+(.+)$/i.exec(authorization)
  if (!tokenMatch) {
    return jsonError(401, "invalid_authorization", "Authorization header must use Bearer token")
  }

  const token = tokenMatch[1]?.trim()
  if (!token) {
    return jsonError(401, "invalid_authorization", "Bearer token cannot be empty")
  }

  if (!safeTokenCompare(expectedToken, token)) {
    return jsonError(403, "forbidden", "Invalid API token")
  }

  return null
}
