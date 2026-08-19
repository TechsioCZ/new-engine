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
    return proxyFailure(400)
  }

  const authToken = readAuthToken(request)
  const cartSession = readCartSession(request)
  if (!(authToken || cartSession)) {
    return proxyFailure(404)
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
      return proxyFailure(upstream.status)
    }

    const payload = await readUpstreamJson(upstream)
    if (
      payload?.public_order_id !== body.public_order_id ||
      typeof payload.order_token !== "string" ||
      payload.order_token.length === 0
    ) {
      return proxyFailure(502)
    }

    return privateJson({
      ot: payload.order_token,
      publicOrderId: payload.public_order_id,
    })
  } catch (error) {
    return proxyCaughtFailure(error)
  }
}
