import type { AuthProxyResponse } from "./types"

const parseAuthenticatedUser = (
  payload: Partial<AuthProxyResponse>
): AuthProxyResponse["user"] | null => {
  const user = payload.user
  return user && typeof user === "object" && typeof user.id === "string"
    ? user
    : null
}

const parseProxyError = async (response: Response) => {
  try {
    const payload = (await response.json()) as { message?: string }
    if (payload?.message) {
      return payload.message
    }
  } catch {
    // noop
  }

  return `Autentifikačná požiadavka zlyhala so stavom ${response.status}`
}

export const requestAuthProxy = async <TBody extends Record<string, unknown>>(
  path: "login" | "register",
  body: TBody
): Promise<AuthProxyResponse> => {
  const response = await fetch(`/api/storefront-auth/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(await parseProxyError(response))
  }

  const payload = (await response.json()) as Partial<AuthProxyResponse>
  const user = parseAuthenticatedUser(payload)
  if (payload.authenticated !== true || !user) {
    throw new Error("Autentifikačné rozhranie nevrátilo používateľa.")
  }

  return {
    authenticated: true,
    user,
  }
}

export const requestPasswordResetProxy = async (email: string) => {
  const response = await fetch("/api/storefront-auth/forgot-password", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    throw new Error(await parseProxyError(response))
  }
}

export const requestPasswordUpdateProxy = async ({
  password,
  token,
}: {
  password: string
  token: string
}) => {
  const response = await fetch("/api/storefront-auth/reset-password", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ password, token }),
  })

  if (!response.ok) {
    throw new Error(await parseProxyError(response))
  }
}

export const requestSessionProxy =
  async (): Promise<AuthProxyResponse | null> => {
    const response = await fetch("/api/storefront-auth/session", {
      method: "GET",
      cache: "no-store",
    })

    if (response.status === 401) {
      return null
    }

    if (!response.ok) {
      throw new Error(await parseProxyError(response))
    }

    const payload = (await response.json()) as Partial<AuthProxyResponse> & {
      authenticated?: boolean
    }
    if (payload.authenticated !== true) {
      return null
    }

    const user = parseAuthenticatedUser(payload)
    return user ? { authenticated: true, user } : null
  }

export const requestLogoutProxy = async () => {
  const response = await fetch("/api/storefront-auth/logout", {
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(await parseProxyError(response))
  }
}
