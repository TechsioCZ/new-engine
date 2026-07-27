import type { MedusaRequest } from "@medusajs/framework"
import {
  normalizeForwardedIpHeader,
  normalizeTurnstileAllowedHostnames,
} from "./cloudflare-turnstile-normalizers"

export const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify"

export type TurnstileSiteverifyResponse = {
  success: boolean
  "error-codes"?: string[]
  action?: string
  cdata?: string
  challenge_ts?: string
  hostname?: string
}

export function removeTurnstileTokenFields(
  body: unknown,
  tokenFields: readonly string[]
): void {
  if (!body || typeof body !== "object") {
    return
  }

  const record = body as Record<string, unknown>

  for (const field of tokenFields) {
    delete record[field]
  }
}

export function getRequestIp(req: MedusaRequest): string | undefined {
  return normalizeForwardedIpHeader(req.headers["x-forwarded-for"]) || req.ip
}

export function getAllowedTurnstileHostnames(): string[] {
  return normalizeTurnstileAllowedHostnames(
    process.env.CLOUDFLARE_TURNSTILE_ALLOWED_HOSTNAMES
  )
}

export function isTurnstileHostnameAllowed(
  verification: TurnstileSiteverifyResponse,
  allowedHostnames: readonly string[]
): boolean {
  if (!allowedHostnames.length) {
    return true
  }

  return Boolean(
    verification.hostname && allowedHostnames.includes(verification.hostname)
  )
}

export function createTurnstileSiteverifyBody(
  token: string,
  secretKey: string,
  remoteIp?: string
): URLSearchParams {
  const body = new URLSearchParams({
    response: token,
    secret: secretKey,
  })

  if (remoteIp) {
    body.set("remoteip", remoteIp)
  }

  return body
}

export async function verifyTurnstileToken(
  token: string,
  req: MedusaRequest,
  secretKey: string
): Promise<TurnstileSiteverifyResponse> {
  const response = await fetch(TURNSTILE_SITEVERIFY_URL, {
    body: createTurnstileSiteverifyBody(token, secretKey, getRequestIp(req)),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  })

  if (!response.ok) {
    return { success: false }
  }

  return (await response.json()) as TurnstileSiteverifyResponse
}
