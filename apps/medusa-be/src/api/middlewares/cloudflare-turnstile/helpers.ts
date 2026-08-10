import type { MedusaRequest } from "@medusajs/framework"
import { z } from "@medusajs/framework/zod"
import { isRecord } from "@techsio/std/object"

import type { ApiStoreModuleService } from "../../../modules/api-store"
import { API_STORE_MODULE } from "../../../modules/api-store"
import {
  normalizeForwardedIpHeader,
  normalizeTurnstileAllowedHostnames,
} from "./normalizers"

export const TURNSTILE_SECRET_API_STORE_NAME = "Cloudflare Turnstile"
export const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify"

const MAX_TURNSTILE_RESPONSE_LENGTH = 65_536
const TURNSTILE_TIMEOUT_MS = 10_000

export interface TurnstileSiteverifyResponse {
  success: boolean
  "error-codes"?: string[]
  action?: string
  cdata?: string
  challenge_ts?: string
  hostname?: string
}

const TurnstileSiteverifyResponseSchema = z.object({
  action: z.string().optional(),
  cdata: z.string().optional(),
  challenge_ts: z.string().optional(),
  "error-codes": z.array(z.string()).optional(),
  hostname: z.string().optional(),
  success: z.boolean(),
})

const parseTurnstileResponse = (
  value: unknown,
): TurnstileSiteverifyResponse | undefined => {
  const parsed = TurnstileSiteverifyResponseSchema.safeParse(value)
  if (!parsed.success) {
    return undefined
  }
  const { action, cdata, challenge_ts, hostname, success } = parsed.data
  const errorCodes = parsed.data["error-codes"]
  return {
    success,
    ...(errorCodes === undefined ? {} : { "error-codes": errorCodes }),
    ...(action === undefined ? {} : { action }),
    ...(cdata === undefined ? {} : { cdata }),
    ...(challenge_ts === undefined ? {} : { challenge_ts }),
    ...(hostname === undefined ? {} : { hostname }),
  }
}

export const removeTurnstileTokenFields = (
  body: unknown,
  tokenFields: readonly string[],
): void => {
  if (!isRecord(body)) {
    return
  }

  for (const field of tokenFields) {
    Reflect.deleteProperty(body, field)
  }
}

export const getRequestIp = (req: MedusaRequest): string | undefined => {
  const forwardedIp = normalizeForwardedIpHeader(req.headers["x-forwarded-for"])
  return forwardedIp !== undefined && forwardedIp.length > 0
    ? forwardedIp
    : req.ip
}

export const getAllowedTurnstileHostnames = (): string[] =>
  normalizeTurnstileAllowedHostnames(
    process.env["CLOUDFLARE_TURNSTILE_ALLOWED_HOSTNAMES"],
  )

export const retrieveTurnstileSecretKey = async (
  req: MedusaRequest,
  apiStoreName = TURNSTILE_SECRET_API_STORE_NAME,
): Promise<string | undefined> => {
  const apiStoreService =
    req.scope.resolve<ApiStoreModuleService>(API_STORE_MODULE)
  const apiStore =
    await apiStoreService.retrieveApiStoreSecretsByName(apiStoreName)

  return apiStore?.api_key ?? undefined
}

export const isTurnstileHostnameAllowed = (
  verification: TurnstileSiteverifyResponse,
  allowedHostnames: readonly string[],
): boolean => {
  if (allowedHostnames.length === 0) {
    return true
  }

  return (
    verification.hostname !== undefined &&
    verification.hostname.length > 0 &&
    allowedHostnames.includes(verification.hostname)
  )
}

export const createTurnstileSiteverifyBody = (
  token: string,
  secretKey: string,
  remoteIp?: string,
): URLSearchParams => {
  const body = new URLSearchParams({
    response: token,
    secret: secretKey,
  })

  if (remoteIp !== undefined && remoteIp.length > 0) {
    body.set("remoteip", remoteIp)
  }

  return body
}

export const verifyTurnstileToken = async (
  token: string,
  req: MedusaRequest,
  secretKey: string,
): Promise<TurnstileSiteverifyResponse> => {
  const response = await fetch(TURNSTILE_SITEVERIFY_URL, {
    body: createTurnstileSiteverifyBody(token, secretKey, getRequestIp(req)),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    signal: AbortSignal.timeout(TURNSTILE_TIMEOUT_MS),
  })

  if (!response.ok) {
    return { success: false }
  }

  const responseText = await response.text()
  if (responseText.length > MAX_TURNSTILE_RESPONSE_LENGTH) {
    return { success: false }
  }

  const payload: unknown = JSON.parse(responseText)
  return parseTurnstileResponse(payload) ?? { success: false }
}
