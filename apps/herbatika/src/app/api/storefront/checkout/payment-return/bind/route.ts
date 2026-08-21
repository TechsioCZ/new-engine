import {
  fetchPrivateFlow,
  privateJson,
  proxyCaughtFailure,
  proxyFailure,
  readExactBodyStrings,
  readUpstreamJson,
  requireCartSessionHeaders,
} from "../../_lib"

export async function POST(request: Request) {
  const body = await readExactBodyStrings(request, [
    "cart_id",
    "payment_session_id",
    "provider_id",
    "state",
  ])
  if (!body) {
    return proxyFailure(request, 400)
  }

  const sessionHeaders = requireCartSessionHeaders(request)
  if (!sessionHeaders) {
    return proxyFailure(request, 404)
  }

  try {
    const upstream = await fetchPrivateFlow(
      request,
      "/store/payment-returns/bind",
      body,
      { headers: sessionHeaders }
    )
    if (!upstream.ok) {
      return proxyFailure(request, upstream.status)
    }

    const payload = await readUpstreamJson(upstream)
    if (
      payload?.cart_id !== body.cart_id ||
      payload.payment_session_id !== body.payment_session_id ||
      payload.provider_id !== body.provider_id
    ) {
      return proxyFailure(request, 502)
    }

    return privateJson({
      cartId: payload.cart_id,
      paymentSessionId: payload.payment_session_id,
      providerId: payload.provider_id,
    })
  } catch (error) {
    return proxyCaughtFailure(request, error)
  }
}
