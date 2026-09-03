import {
  fetchPrivateFlow,
  privateJson,
  proxyCaughtFailure,
  proxyFailure,
  readExactBodyStrings,
  readUpstreamJson,
  setCartSessionCookie,
} from "../_lib"

export async function POST(request: Request) {
  const body = await readExactBodyStrings(request, ["cart_id"])
  if (!body) {
    return proxyFailure(request, 400)
  }

  try {
    const upstream = await fetchPrivateFlow(
      request,
      "/store/cart-session/sync",
      body
    )
    if (!upstream.ok) {
      return proxyFailure(request, upstream.status)
    }

    const payload = await readUpstreamJson(upstream)
    if (
      payload?.cart_id !== body.cart_id ||
      typeof payload.cart_session !== "string" ||
      payload.cart_session.length === 0
    ) {
      return proxyFailure(request, 502)
    }

    const response = privateJson({ cart_id: body.cart_id })
    setCartSessionCookie(response, payload.cart_session)
    return response
  } catch (error) {
    return proxyCaughtFailure(request, error)
  }
}
