import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { resolveMedusaBackendUrl } from "@/lib/storefront/runtime-env"
import { jsonError } from "./_response"
import type { GatewayPathAuthority } from "./_routes"

export const GATEWAY_TIMEOUT_MS = 10_000
const MAX_RESOURCE_AUTHORITY_BYTES = 64 * 1024

type ResourceAuthority = Extract<
  GatewayPathAuthority,
  { kind: "cart" | "order" }
>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

const payloadHasValidResourceMarketScope = (
  payload: unknown,
  authority: ResourceAuthority,
  binding: MarketRuntimeBinding,
  authenticatedCustomerId: string | null
): boolean => {
  if (!isRecord(payload)) {
    return false
  }

  const resource = payload[authority.kind]
  const hasMarketScope =
    isRecord(resource) &&
    resource.id === authority.id &&
    resource.sales_channel_id === binding.salesChannelId
  return authority.kind === "order"
    ? hasMarketScope &&
        typeof authenticatedCustomerId === "string" &&
        resource.customer_id === authenticatedCustomerId
    : hasMarketScope
}

const readResourceAuthorityPayload = async (
  response: Response
): Promise<unknown | null> => {
  const declaredLength = Number(response.headers.get("content-length") ?? "0")
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_RESOURCE_AUTHORITY_BYTES
  ) {
    await response.body?.cancel()
    return null
  }

  if (!response.body) {
    return null
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalLength = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    totalLength += value.byteLength
    if (totalLength > MAX_RESOURCE_AUTHORITY_BYTES) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }

  const body = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    return JSON.parse(new TextDecoder().decode(body)) as unknown
  } catch {
    return null
  }
}

const resourceAuthorityError = (status = 404) =>
  jsonError(status, "Storefront resource is not available.")

type AuthorityPayloadResult =
  | Readonly<{ kind: "found"; payload: unknown }>
  | Readonly<{ kind: "rejected"; response: Response }>

const fetchAuthorityPayload = async (
  url: URL,
  headers: Headers
): Promise<AuthorityPayloadResult> => {
  let response: Response
  try {
    response = await fetch(url, {
      cache: "no-store",
      credentials: "omit",
      headers,
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
    })
  } catch (error) {
    return {
      kind: "rejected",
      response:
        error instanceof DOMException && error.name === "TimeoutError"
          ? resourceAuthorityError(504)
          : resourceAuthorityError(502),
    }
  }

  if (!response.ok) {
    await response.body?.cancel()
    return {
      kind: "rejected",
      response:
        response.status >= 500
          ? resourceAuthorityError(502)
          : resourceAuthorityError(),
    }
  }

  return {
    kind: "found",
    payload: await readResourceAuthorityPayload(response),
  }
}

const readAuthenticatedCustomerId = async (
  headers: Headers
): Promise<string | Response> => {
  if (!headers.has("authorization")) {
    return resourceAuthorityError()
  }
  const url = new URL("/store/customers/me", resolveMedusaBackendUrl())
  url.searchParams.set("fields", "id")
  const result = await fetchAuthorityPayload(url, headers)
  if (result.kind === "rejected") {
    return result.response
  }
  if (!(isRecord(result.payload) && isRecord(result.payload.customer))) {
    return resourceAuthorityError()
  }
  const customerId = result.payload.customer.id
  return typeof customerId === "string" && customerId
    ? customerId
    : resourceAuthorityError()
}

const hasExactSignedCartAuthority = async (
  headers: Headers,
  cartId: string
): Promise<boolean> => {
  if (!headers.has("x-cart-session")) {
    return false
  }

  const authorityHeaders = new Headers(headers)
  authorityHeaders.set("content-type", "application/json")
  try {
    const response = await fetch(
      new URL("/store/cart-session/resolve", resolveMedusaBackendUrl()),
      {
        body: JSON.stringify({ cart_id: cartId }),
        cache: "no-store",
        credentials: "omit",
        headers: authorityHeaders,
        method: "POST",
        redirect: "manual",
        signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
      }
    )
    if (!response.ok) {
      await response.body?.cancel()
      return false
    }
    const payload = await readResourceAuthorityPayload(response)
    return isRecord(payload) && payload.cart_id === cartId
  } catch {
    return false
  }
}

export const verifyResourceMarketAuthority = async (
  headers: Headers,
  authority: ResourceAuthority,
  binding: MarketRuntimeBinding
): Promise<Response | null> => {
  if (
    authority.kind === "cart" &&
    (await hasExactSignedCartAuthority(headers, authority.id))
  ) {
    return null
  }

  let authenticatedCustomerId: string | null = null
  if (authority.kind === "order") {
    const customerAuthority = await readAuthenticatedCustomerId(headers)
    if (customerAuthority instanceof Response) {
      return customerAuthority
    }
    authenticatedCustomerId = customerAuthority
  }

  const resourceUrl = new URL(
    `/store/${authority.kind}s/${encodeURIComponent(authority.id)}`,
    resolveMedusaBackendUrl()
  )
  resourceUrl.searchParams.set(
    "fields",
    authority.kind === "order"
      ? "id,customer_id,sales_channel_id"
      : "id,sales_channel_id"
  )
  const result = await fetchAuthorityPayload(resourceUrl, headers)
  if (result.kind === "rejected") {
    return result.response
  }

  return payloadHasValidResourceMarketScope(
    result.payload,
    authority,
    binding,
    authenticatedCustomerId
  )
    ? null
    : resourceAuthorityError()
}
