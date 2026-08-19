import { NextResponse } from "next/server"
import {
  fetchPrivateFlow,
  privateJson,
  proxyCaughtFailure,
  proxyFailure,
  readCartSession,
  readUpstreamJson,
} from "@/app/api/storefront/checkout/_lib"
import { requireStorefrontMarketBinding } from "@/app/api/storefront-auth/_lib"
import {
  PAYMENT_RESULT_COOKIE_MAX_AGE_SECONDS,
  PAYMENT_RESULT_COOKIE_NAME,
  type PaymentResultProjection,
} from "@/lib/storefront/payment-result-session"
import { buildPath } from "@/lib/url/public-url"

const CALLBACK_TIMEOUT_MS = 5000
const RESULT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
const PROVIDER_IDS = {
  comgate: "pp_paykit_comgate",
  gopay: "pp_paykit_gopay",
  stripe: "pp_paykit_stripe",
} as const
const CALLBACK_QUERY_KEYS = new Set([
  "cart_id",
  "payment_session_id",
  "provider_id",
  "state",
])

type PaymentProvider = keyof typeof PROVIDER_IDS

const isPaymentProvider = (value: string): value is PaymentProvider =>
  Object.hasOwn(PROVIDER_IDS, value)

const readExactQuery = (request: Request) => {
  const entries = [...new URL(request.url).searchParams.entries()]
  if (
    entries.some(([key]) => !CALLBACK_QUERY_KEYS.has(key)) ||
    new Set(entries.map(([key]) => key)).size !== entries.length
  ) {
    return null
  }
  const values = Object.fromEntries(entries)
  for (const key of ["cart_id", "provider_id", "state"] as const) {
    const value = values[key]
    if (!value || value !== value.trim() || value.includes("\0")) {
      return null
    }
  }
  const paymentSessionId = values.payment_session_id
  if (
    paymentSessionId !== undefined &&
    (!paymentSessionId ||
      paymentSessionId !== paymentSessionId.trim() ||
      paymentSessionId.includes("\0"))
  ) {
    return null
  }
  return {
    cart_id: values.cart_id as string,
    ...(paymentSessionId ? { payment_session_id: paymentSessionId } : {}),
    provider_id: values.provider_id as string,
    state: values.state as string,
  }
}

const isPaymentStatus = (
  value: unknown
): value is PaymentResultProjection["status"] =>
  value === "authorized" ||
  value === "cancelled" ||
  value === "completed" ||
  value === "pending"

const isTimeoutError = (error: unknown) =>
  error instanceof DOMException && error.name === "TimeoutError"

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const query = readExactQuery(request)
  const { provider } = await context.params
  if (
    !(query && isPaymentProvider(provider)) ||
    query.provider_id !== PROVIDER_IDS[provider]
  ) {
    return privateJson({ message: "Payment return was not found." }, 404)
  }

  const cartSession = readCartSession(request)
  if (!cartSession) {
    return privateJson({ message: "Payment return was not found." }, 404)
  }

  try {
    const binding = requireStorefrontMarketBinding(request)
    const upstream = await fetchPrivateFlow(
      request,
      "/store/payment-returns/resolve",
      query,
      {
        headers: { "x-cart-session": cartSession },
        signal: AbortSignal.timeout(CALLBACK_TIMEOUT_MS),
      }
    )
    if (!upstream.ok) {
      return proxyFailure(
        upstream.status === 404 || upstream.status === 503
          ? upstream.status
          : 502
      )
    }

    const payload = await readUpstreamJson(upstream)
    const publicOrderId = payload?.public_order_id
    const hasPublicOrderId =
      typeof publicOrderId === "string" && publicOrderId.length > 0
    if (
      payload?.cart_id !== query.cart_id ||
      payload.provider_id !== query.provider_id ||
      typeof payload.payment_session_id !== "string" ||
      (query.payment_session_id !== undefined &&
        payload.payment_session_id !== query.payment_session_id) ||
      !isPaymentStatus(payload.status) ||
      typeof payload.result_token !== "string" ||
      !RESULT_TOKEN_PATTERN.test(payload.result_token) ||
      (payload.status === "completed") !== hasPublicOrderId
    ) {
      return proxyFailure(502)
    }

    const resultPath = buildPath(
      { kind: "checkout", step: "checkoutResult" },
      binding.market
    )
    const response = NextResponse.redirect(
      new URL(resultPath, binding.canonicalOrigin),
      303
    )
    response.headers.set("Cache-Control", "private, no-store")
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
    response.cookies.set({
      httpOnly: true,
      maxAge: PAYMENT_RESULT_COOKIE_MAX_AGE_SECONDS,
      name: PAYMENT_RESULT_COOKIE_NAME,
      path: "/",
      sameSite: "lax",
      secure: true,
      value: payload.result_token,
    })
    return response
  } catch (error) {
    return isTimeoutError(error) ? proxyFailure(503) : proxyCaughtFailure(error)
  }
}
