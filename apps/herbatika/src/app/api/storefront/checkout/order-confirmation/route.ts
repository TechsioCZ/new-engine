import {
  ORDER_CONFIRMATION_TOKEN_COOKIE_MAX_AGE_SECONDS,
  ORDER_CONFIRMATION_TOKEN_COOKIE_NAME,
} from "@/lib/routing/private-flows/request-cookies"
import {
  fetchPrivateFlow,
  privateJson,
  proxyCaughtFailure,
  proxyFailure,
  readAuthToken,
  readCartSession,
  readExactBodyStrings,
  readUpstreamJson,
} from "../_lib"

export async function POST(request: Request) {
  const body = await readExactBodyStrings(request, [
    "cart_id",
    "public_order_id",
  ])
  if (!body) {
    return proxyFailure(request, 400)
  }

  const authToken = readAuthToken(request)
  const cartSession = readCartSession(request)
  if (!(authToken || cartSession)) {
    return proxyFailure(request, 404)
  }

  const accessHeaders: Record<string, string> = {}
  if (authToken) {
    accessHeaders.authorization = `Bearer ${authToken}`
  }
  if (cartSession) {
    accessHeaders["x-cart-session"] = cartSession
  }

  try {
    const upstream = await fetchPrivateFlow(
      request,
      "/store/order-confirmations/issue",
      body,
      { headers: accessHeaders }
    )
    if (!upstream.ok) {
      return proxyFailure(request, upstream.status)
    }

    const payload = await readUpstreamJson(upstream)
    if (
      payload?.public_order_id !== body.public_order_id ||
      typeof payload.order_token !== "string" ||
      payload.order_token.length === 0 ||
      payload.order_token.length > 512 ||
      payload.order_token !== payload.order_token.trim() ||
      payload.order_token.includes("\0")
    ) {
      return proxyFailure(request, 502)
    }

    const response = privateJson({
      publicOrderId: payload.public_order_id,
    })
    if (!authToken) {
      response.cookies.set({
        httpOnly: true,
        maxAge: ORDER_CONFIRMATION_TOKEN_COOKIE_MAX_AGE_SECONDS,
        name: ORDER_CONFIRMATION_TOKEN_COOKIE_NAME,
        path: "/",
        sameSite: "lax",
        secure: true,
        value: payload.order_token,
      })
    }
    return response
  } catch (error) {
    return proxyCaughtFailure(request, error)
  }
}
