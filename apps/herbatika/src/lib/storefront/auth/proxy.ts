import type { AuthProxyResponse } from "./types"

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
  body: TBody,
): Promise<AuthProxyResponse> => {
  const response = await fetch(`/api/storefront-auth/${path}`, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(await parseProxyError(response))
  }

  const payload = (await response.json()) as Partial<AuthProxyResponse>
  if (typeof payload.token !== "string" || payload.token.length === 0) {
    throw new Error("Autentifikačné rozhranie nevrátilo token.")
  }

  return {
    token: payload.token,
  }
}

export const requestPasswordResetProxy = async (email: string) => {
  const response = await fetch("/api/storefront-auth/forgot-password", {
    body: JSON.stringify({ email }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
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
    body: JSON.stringify({ password, token }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(await parseProxyError(response))
  }
}

export const requestSessionProxy =
  async (): Promise<AuthProxyResponse | null> => {
    const response = await fetch("/api/storefront-auth/session", {
      cache: "no-store",
      method: "GET",
    })

    if (response.status === 401) {
      return null
    }

    if (!response.ok) {
      throw new Error(await parseProxyError(response))
    }

    const payload = (await response.json()) as Partial<AuthProxyResponse>
    if (typeof payload.token !== "string" || payload.token.length === 0) {
      return null
    }

    return {
      token: payload.token,
    }
  }

export const requestLogoutProxy = async () => {
  const response = await fetch("/api/storefront-auth/logout", {
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(await parseProxyError(response))
  }
}
