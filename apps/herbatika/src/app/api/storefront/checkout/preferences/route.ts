import { NextResponse } from "next/server"
import { resolveStorefrontApiMessages } from "@/app/api/_messages"
import { requireStorefrontMarketBinding } from "@/app/api/storefront-auth/_lib"
import { hasSameOriginCsrfEvidence } from "@/app/api/storefront-medusa/[...path]/_policy"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import {
  CHECKOUT_CONSENT_COOKIE_NAME,
  CHECKOUT_CONSENT_MAX_AGE_SECONDS,
  CHECKOUT_CONSENT_POLICY_VERSION,
  CHECKOUT_CONSENT_VERSION,
  type CheckoutConsentPurposes,
  createCheckoutConsentSnapshot,
  createDeniedCheckoutConsent,
  readCheckoutConsentCookie,
  serializeCheckoutConsentSnapshot,
} from "@/lib/storefront/checkout-consent"

const PRIVATE_RESPONSE_HEADERS = {
  "cache-control": "private, no-store",
  vary: "Host, Cookie",
} as const

const REQUEST_KEYS = Object.freeze([
  "policyVersion",
  "purposes",
  "version",
] as const)
const PURPOSE_KEYS = Object.freeze(["heureka", "marketing"] as const)

type CheckoutConsentRouteDependencies = Readonly<{
  hasSameOrigin(request: Request, binding: MarketRuntimeBinding): boolean
  now(): Date
  requireBinding(request: Request): MarketRuntimeBinding
}>

const runtimeDependencies: CheckoutConsentRouteDependencies = {
  hasSameOrigin: hasSameOriginCsrfEvidence,
  now: () => new Date(),
  requireBinding: requireStorefrontMarketBinding,
}

const hasExactKeys = (value: object, keys: readonly string[]) => {
  const actualKeys = Object.keys(value)
  const expectedKeys = new Set(keys)
  return (
    actualKeys.length === keys.length &&
    actualKeys.every((key) => expectedKeys.has(key))
  )
}

export const parseCheckoutConsentRequest = (
  value: unknown
): CheckoutConsentPurposes | null => {
  if (
    !(value && typeof value === "object") ||
    Array.isArray(value) ||
    !hasExactKeys(value, REQUEST_KEYS)
  ) {
    return null
  }

  const request = value as Record<string, unknown>
  if (
    request.version !== CHECKOUT_CONSENT_VERSION ||
    request.policyVersion !== CHECKOUT_CONSENT_POLICY_VERSION ||
    !(request.purposes && typeof request.purposes === "object") ||
    Array.isArray(request.purposes) ||
    !hasExactKeys(request.purposes, PURPOSE_KEYS)
  ) {
    return null
  }

  const purposes = request.purposes as Record<string, unknown>
  return typeof purposes.marketing === "boolean" &&
    typeof purposes.heureka === "boolean"
    ? {
        heureka: purposes.heureka,
        marketing: purposes.marketing,
      }
    : null
}

const privateJson = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    headers: PRIVATE_RESPONSE_HEADERS,
    status,
  })

export const handleCheckoutConsentGet = (
  request: Request,
  dependencies: CheckoutConsentRouteDependencies = runtimeDependencies
) => {
  let binding: MarketRuntimeBinding
  try {
    binding = dependencies.requireBinding(request)
  } catch {
    return privateJson({ message: "Unknown storefront host." }, 421)
  }

  const consent =
    readCheckoutConsentCookie({
      cookieHeader: request.headers.get("cookie"),
      market: binding.market,
      now: dependencies.now(),
    }) ?? createDeniedCheckoutConsent(binding.market, dependencies.now())

  return privateJson(consent)
}

export const handleCheckoutConsentPut = async (
  request: Request,
  dependencies: CheckoutConsentRouteDependencies = runtimeDependencies
) => {
  let binding: MarketRuntimeBinding
  try {
    binding = dependencies.requireBinding(request)
  } catch {
    return privateJson({ message: "Unknown storefront host." }, 421)
  }

  if (!dependencies.hasSameOrigin(request, binding)) {
    return privateJson(
      {
        message: resolveStorefrontApiMessages(binding.market)
          .sameOriginRequired,
      },
      403
    )
  }

  const messages = resolveStorefrontApiMessages(binding.market)

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return privateJson({ message: messages.invalidConsentRequest }, 400)
  }

  const purposes = parseCheckoutConsentRequest(payload)
  const consent = purposes
    ? createCheckoutConsentSnapshot({
        market: binding.market,
        now: dependencies.now(),
        purposes,
      })
    : null

  if (!consent) {
    return privateJson({ message: messages.invalidConsentRequest }, 400)
  }

  const response = privateJson(consent)
  response.cookies.set({
    httpOnly: true,
    maxAge: CHECKOUT_CONSENT_MAX_AGE_SECONDS,
    name: CHECKOUT_CONSENT_COOKIE_NAME,
    path: "/",
    sameSite: "lax",
    secure: true,
    value: serializeCheckoutConsentSnapshot(consent),
  })
  return response
}

export const GET = (request: Request) => handleCheckoutConsentGet(request)
export const PUT = (request: Request) => handleCheckoutConsentPut(request)
