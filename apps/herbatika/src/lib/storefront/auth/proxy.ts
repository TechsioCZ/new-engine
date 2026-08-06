import { isRecord, getRecordValue } from "@techsio/std/object"

import type { AuthProxyResponse } from "./types"

const parseProxyError = async (response: Response) => {
  try {
    const payload: unknown = await response.json()
    if (isRecord(payload)) {
      const message = getRecordValue(payload, "message")
      if (typeof message === "string") {
        return message
      }
    }
  } catch {
    // noop
  }

  return `Autentifikačná požiadavka zlyhala so stavom ${response.status}`
}

export const requestAuthProxy = async (
  path: "login" | "register",
  body: Record<string, unknown>,
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

  const payload: unknown = await response.json()
  const token = isRecord(payload) ? getRecordValue(payload, "token") : null
  if (typeof token !== "string" || token.length === 0) {
    throw new Error("Autentifikačné rozhranie nevrátilo token.")
  }

  return { token }
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

    const payload: unknown = await response.json()
    const token = isRecord(payload) ? getRecordValue(payload, "token") : null
    if (typeof token !== "string" || token.length === 0) {
      return null
    }

    return { token }
  }

export const requestLogoutProxy = async () => {
  const response = await fetch("/api/storefront-auth/logout", {
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(await parseProxyError(response))
  }
}
