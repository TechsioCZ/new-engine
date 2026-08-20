import {
  fetchPrivateFlow,
  privateJson,
  proxyCaughtFailure,
  proxyFailure,
  readExactBodyStrings,
  readUpstreamJson,
  requireCartSessionHeaders,
} from "../../_lib"

const PAYMENT_PROVIDERS = new Set(["comgate", "gopay", "stripe"])

export async function POST(request: Request) {
  const body = await readExactBodyStrings(request, ["cart_id", "provider_id"])
  if (!body) {
    return proxyFailure(400)
  }

  const sessionHeaders = requireCartSessionHeaders(request)
  if (!sessionHeaders) {
    return proxyFailure(404)
  }

  try {
    const upstream = await fetchPrivateFlow(
      request,
      "/store/payment-returns/issue",
      body,
      { headers: sessionHeaders }
    )
    if (!upstream.ok) {
      return proxyFailure(upstream.status)
    }

    const payload = await readUpstreamJson(upstream)
    if (
      payload?.cart_id !== body.cart_id ||
      payload.provider_id !== body.provider_id ||
      typeof payload.provider !== "string" ||
      !PAYMENT_PROVIDERS.has(payload.provider) ||
      typeof payload.state !== "string" ||
      payload.state.length === 0 ||
      typeof payload.expires_at !== "string" ||
      !Number.isFinite(Date.parse(payload.expires_at))
    ) {
      return proxyFailure(502)
    }

    return privateJson({
      cartId: payload.cart_id,
      expiresAt: payload.expires_at,
      provider: payload.provider,
      providerId: payload.provider_id,
      state: payload.state,
    })
  } catch (error) {
    return proxyCaughtFailure(error)
  }
}
