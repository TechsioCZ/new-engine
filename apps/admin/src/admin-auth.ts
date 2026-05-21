import { buildMedusaUrl } from "./admin-config"
import { createApiError, isAuthError } from "./admin-errors"

const ADMIN_AUTH_TOKEN_STORAGE_KEY = "new-engine-admin-auth-token"

type AdminLoginInput = {
  email: string
  password: string
}

type AdminLoginResponse = {
  token?: unknown
}

export function getStoredAdminToken() {
  if (typeof window === "undefined") {
    return null
  }

  return window.sessionStorage.getItem(ADMIN_AUTH_TOKEN_STORAGE_KEY)
}

export function hasStoredAdminToken() {
  return Boolean(getStoredAdminToken())
}

export function clearStoredAdminToken() {
  if (typeof window === "undefined") {
    return
  }

  window.sessionStorage.removeItem(ADMIN_AUTH_TOKEN_STORAGE_KEY)
}

export async function loginAdmin({ email, password }: AdminLoginInput) {
  const response = await fetch(buildMedusaUrl("/auth/user/emailpass"), {
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw createApiError(
      `Admin login failed with ${response.status}`,
      response.status
    )
  }

  const payload = (await response.json()) as AdminLoginResponse

  if (typeof payload.token !== "string" || !payload.token) {
    throw new Error("Medusa login did not return an auth token")
  }

  window.sessionStorage.setItem(ADMIN_AUTH_TOKEN_STORAGE_KEY, payload.token)
}

export function getLoginErrorMessage(error: unknown) {
  if (isAuthError(error)) {
    return "E-mail nebo heslo nesedi."
  }

  return "Prihlaseni se nepodarilo. Zkontrolujte pristup k admin API."
}
