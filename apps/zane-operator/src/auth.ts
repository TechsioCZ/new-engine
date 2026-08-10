import { timingSafeEqual } from "node:crypto"

import { jsonError } from "./http"

const safeTokenCompare = (expected: string, actual: string): boolean => {
  const expectedBytes = Buffer.from(expected)
  const actualBytes = Buffer.from(actual)

  if (expectedBytes.length !== actualBytes.length) {
    return false
  }

  return timingSafeEqual(expectedBytes, actualBytes)
}

export const enforceBearerToken = (
  request: Request,
  expectedToken: string,
): Response | null => {
  const authorization = request.headers.get("authorization")

  if (authorization === null || authorization === "") {
    return jsonError(
      401,
      "missing_authorization",
      "Authorization header is required",
    )
  }

  const tokenMatch = /^Bearer\s+(?<token>.+)$/iu.exec(authorization)
  if (!tokenMatch) {
    return jsonError(
      401,
      "invalid_authorization",
      "Authorization header must use Bearer token",
    )
  }

  const { token: rawToken } = tokenMatch.groups ?? {}
  const token = rawToken?.trim()
  if (token === undefined || token === "") {
    return jsonError(
      401,
      "invalid_authorization",
      "Bearer token cannot be empty",
    )
  }

  if (!safeTokenCompare(expectedToken, token)) {
    return jsonError(403, "forbidden", "Invalid API token")
  }

  return null
}
