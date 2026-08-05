interface JWTPayload {
  exp?: number
  [key: string]: unknown
}

function parseJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) {
      return null
    }
    const payloadSegment = parts[1]
    if (!payloadSegment) {
      return null
    }
    const payload = JSON.parse(atob(payloadSegment)) as JWTPayload
    return payload
  } catch {
    return null
  }
}

export function getTokenFromStorage(): string | null {
  if (typeof window === "undefined") {
    return null
  }
  return localStorage.getItem("medusa_auth_token")
}

export function isTokenExpired(token: string): boolean {
  const payload = parseJWT(token)
  if (!payload?.exp) {
    return true // No valid payload or expiration = treat as expired
  }

  const expirationTime = payload.exp * 1000
  const currentTime = Date.now()

  return currentTime >= expirationTime
}

export function clearToken(): void {
  if (typeof window === "undefined") {
    return
  }
  localStorage.removeItem("medusa_auth_token")
}
