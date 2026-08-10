interface JWTPayload {
  exp?: number
}

const parseJWT = (token: string): JWTPayload | null => {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) {
      return null
    }
    const [, payloadSegment] = parts
    if (
      payloadSegment === null ||
      payloadSegment === undefined ||
      payloadSegment === ""
    ) {
      return null
    }
    const payload: unknown = JSON.parse(atob(payloadSegment))
    if (typeof payload !== "object" || payload === null) {
      return null
    }
    if (!("exp" in payload) || payload.exp === undefined) {
      return {}
    }
    return typeof payload.exp === "number" ? { exp: payload.exp } : null
  } catch {
    return null
  }
}

export const getTokenFromStorage = (): string | null => {
  if (typeof window === "undefined") {
    return null
  }
  return localStorage.getItem("medusa_auth_token")
}

export const isTokenExpired = (token: string): boolean => {
  const payload = parseJWT(token)
  if (
    payload?.exp === null ||
    payload?.exp === undefined ||
    payload.exp === 0
  ) {
    // No valid payload or expiration means the token is expired.
    return true
  }

  const expirationTime = payload.exp * 1000
  const currentTime = Date.now()

  return currentTime >= expirationTime
}

export const clearToken = (): void => {
  if (typeof window === "undefined") {
    return
  }
  localStorage.removeItem("medusa_auth_token")
}
