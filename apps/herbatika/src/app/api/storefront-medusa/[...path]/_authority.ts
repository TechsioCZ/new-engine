import { resolveStorefrontApiMessages } from "@/app/api/_messages"
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

type CheckoutAuthority = Extract<
  GatewayPathAuthority,
  {
    kind: "payment-collection-create" | "payment-collection" | "shipping-option"
  }
>

type CheckoutCartAuthority = Readonly<{
  customerId: string | null
  id: string
  paymentCollectionId: string | null
}>

type BodyAuthorityId =
  | Readonly<{ kind: "found"; value: string }>
  | Readonly<{ kind: "invalid" | "missing" }>

const AUTHORITY_ID_PATTERN = /^[A-Za-z0-9_-]{1,160}$/
const AUTHORITY_FIELD_SEPARATOR_PATTERN = /[.[\]]+/
const MAX_BODY_AUTHORITY_NODES = 20_000

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

const fieldContainsAuthorityName = (key: string, expected: string) =>
  key
    .toLowerCase()
    .split(AUTHORITY_FIELD_SEPARATOR_PATTERN)
    .some((segment) => segment === expected)

const readAuthorityFieldValue = (
  key: string,
  value: unknown,
  expectedField: string
): BodyAuthorityId | null => {
  if (!fieldContainsAuthorityName(key, expectedField)) {
    return null
  }
  return typeof value === "string" && AUTHORITY_ID_PATTERN.test(value)
    ? { kind: "found", value }
    : { kind: "invalid" }
}

const collectRecordAuthorityValues = (
  value: Record<string, unknown>,
  field: string,
  values: string[],
  pending: unknown[]
): boolean => {
  for (const [key, nestedValue] of Object.entries(value)) {
    const authorityValue = readAuthorityFieldValue(key, nestedValue, field)
    if (authorityValue?.kind === "invalid") {
      return false
    }
    if (authorityValue?.kind === "found") {
      values.push(authorityValue.value)
    }
    if (nestedValue && typeof nestedValue === "object") {
      pending.push(nestedValue)
    }
  }
  return true
}

const collectBodyAuthorityValues = (
  payload: Record<string, unknown>,
  field: string
): readonly string[] | null => {
  const values: string[] = []
  const pending: unknown[] = [payload]
  let visited = 0
  while (pending.length > 0 && visited <= MAX_BODY_AUTHORITY_NODES) {
    visited += 1
    const value = pending.pop()
    if (Array.isArray(value)) {
      pending.push(...value)
      continue
    }
    if (
      isRecord(value) &&
      !collectRecordAuthorityValues(value, field, values, pending)
    ) {
      return null
    }
  }
  return visited <= MAX_BODY_AUTHORITY_NODES ? values : null
}

const resolveConsistentBodyAuthorityId = (
  values: readonly string[],
  topLevelValue: unknown,
  requireTopLevel: boolean
): BodyAuthorityId => {
  if (
    requireTopLevel &&
    (typeof topLevelValue !== "string" ||
      !AUTHORITY_ID_PATTERN.test(topLevelValue))
  ) {
    return { kind: "invalid" }
  }
  if (values.length === 0) {
    return { kind: "missing" }
  }

  const expected = requireTopLevel ? topLevelValue : values[0]
  return typeof expected === "string" &&
    values.every((value) => value === expected)
    ? { kind: "found", value: expected }
    : { kind: "invalid" }
}

const readBodyAuthorityId = (
  payload: unknown,
  field: string,
  requireTopLevel: boolean
): BodyAuthorityId => {
  if (!isRecord(payload)) {
    return { kind: "invalid" }
  }
  const values = collectBodyAuthorityValues(payload, field)
  return values
    ? resolveConsistentBodyAuthorityId(values, payload[field], requireTopLevel)
    : { kind: "invalid" }
}

const bodyAuthorityMatches = (
  payload: unknown,
  field: string,
  expected: string | null
) => {
  const authority = readBodyAuthorityId(payload, field, false)
  return authority.kind === "missing"
    ? true
    : authority.kind === "found" && authority.value === expected
}

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

const resourceAuthorityError = (binding: MarketRuntimeBinding, status = 404) =>
  jsonError(
    status,
    resolveStorefrontApiMessages(binding.market).gatewayResourceUnavailable
  )

type AuthorityPayloadResult =
  | Readonly<{ kind: "found"; payload: unknown }>
  | Readonly<{ kind: "rejected"; response: Response }>

const fetchAuthorityPayload = async (
  url: URL,
  headers: Headers,
  binding: MarketRuntimeBinding
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
          ? resourceAuthorityError(binding, 504)
          : resourceAuthorityError(binding, 502),
    }
  }

  if (!response.ok) {
    await response.body?.cancel()
    return {
      kind: "rejected",
      response:
        response.status >= 500
          ? resourceAuthorityError(binding, 502)
          : resourceAuthorityError(binding),
    }
  }

  return {
    kind: "found",
    payload: await readResourceAuthorityPayload(response),
  }
}

const readAuthenticatedCustomerId = async (
  headers: Headers,
  binding: MarketRuntimeBinding
): Promise<string | Response> => {
  if (!headers.has("authorization")) {
    return resourceAuthorityError(binding)
  }
  const url = new URL("/store/customers/me", resolveMedusaBackendUrl())
  url.searchParams.set("fields", "id")
  const result = await fetchAuthorityPayload(url, headers, binding)
  if (result.kind === "rejected") {
    return result.response
  }
  if (!(isRecord(result.payload) && isRecord(result.payload.customer))) {
    return resourceAuthorityError(binding)
  }
  const customerId = result.payload.customer.id
  return typeof customerId === "string" && customerId
    ? customerId
    : resourceAuthorityError(binding)
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

const parseCheckoutCartAuthority = (
  payload: unknown,
  cartId: string,
  binding: MarketRuntimeBinding
): CheckoutCartAuthority | null => {
  if (!(isRecord(payload) && isRecord(payload.cart))) {
    return null
  }

  const cart = payload.cart
  if (
    cart.id !== cartId ||
    cart.region_id !== binding.regionId ||
    cart.sales_channel_id !== binding.salesChannelId
  ) {
    return null
  }

  const customerId =
    typeof cart.customer_id === "string" && cart.customer_id
      ? cart.customer_id
      : null
  const paymentCollectionId =
    isRecord(cart.payment_collection) &&
    typeof cart.payment_collection.id === "string" &&
    cart.payment_collection.id
      ? cart.payment_collection.id
      : null
  return { customerId, id: cartId, paymentCollectionId }
}

const verifyCheckoutCartCustomer = async (
  headers: Headers,
  cart: CheckoutCartAuthority,
  binding: MarketRuntimeBinding
): Promise<Response | null> => {
  if (!cart.customerId) {
    return null
  }
  const authenticatedCustomerId = await readAuthenticatedCustomerId(
    headers,
    binding
  )
  if (authenticatedCustomerId instanceof Response) {
    return authenticatedCustomerId
  }
  return authenticatedCustomerId === cart.customerId
    ? null
    : resourceAuthorityError(binding)
}

const readCheckoutCartAuthority = async (
  headers: Headers,
  cartId: string,
  binding: MarketRuntimeBinding
): Promise<CheckoutCartAuthority | Response> => {
  if (!(await hasExactSignedCartAuthority(headers, cartId))) {
    return resourceAuthorityError(binding)
  }

  const cartUrl = new URL(
    `/store/carts/${encodeURIComponent(cartId)}`,
    resolveMedusaBackendUrl()
  )
  cartUrl.searchParams.set(
    "fields",
    "id,customer_id,region_id,sales_channel_id,payment_collection.id"
  )
  const result = await fetchAuthorityPayload(cartUrl, headers, binding)
  if (result.kind === "rejected") {
    return result.response
  }
  const cart = parseCheckoutCartAuthority(result.payload, cartId, binding)
  if (!cart) {
    return resourceAuthorityError(binding)
  }
  return (await verifyCheckoutCartCustomer(headers, cart, binding)) ?? cart
}

const verifyPaymentProviderAuthority = async (
  headers: Headers,
  providerId: string,
  binding: MarketRuntimeBinding
): Promise<Response | null> => {
  const providerUrl = new URL(
    "/store/payment-providers",
    resolveMedusaBackendUrl()
  )
  providerUrl.searchParams.set("region_id", binding.regionId)
  providerUrl.searchParams.set("fields", "id")
  providerUrl.searchParams.set("limit", "100")
  const result = await fetchAuthorityPayload(providerUrl, headers, binding)
  if (result.kind === "rejected") {
    return result.response
  }

  const providers = isRecord(result.payload)
    ? result.payload.payment_providers
    : null
  return Array.isArray(providers) &&
    providers.some(
      (provider) => isRecord(provider) && provider.id === providerId
    )
    ? null
    : resourceAuthorityError(binding)
}

const verifyShippingOptionAuthority = async (
  headers: Headers,
  cartId: string,
  shippingOptionId: string,
  binding: MarketRuntimeBinding
): Promise<Response | null> => {
  const optionUrl = new URL(
    "/store/shipping-options",
    resolveMedusaBackendUrl()
  )
  optionUrl.searchParams.set("cart_id", cartId)
  optionUrl.searchParams.set("fields", "id")
  optionUrl.searchParams.set("limit", "100")
  const result = await fetchAuthorityPayload(optionUrl, headers, binding)
  if (result.kind === "rejected") {
    return result.response
  }

  const options = isRecord(result.payload)
    ? result.payload.shipping_options
    : null
  return Array.isArray(options) &&
    options.some((option) => isRecord(option) && option.id === shippingOptionId)
    ? null
    : resourceAuthorityError(binding)
}

export const verifyCheckoutResourceAuthority = async (
  headers: Headers,
  authority: CheckoutAuthority,
  body: unknown,
  binding: MarketRuntimeBinding
): Promise<Response | null> => {
  const cartAuthority = readBodyAuthorityId(
    body,
    "cart_id",
    authority.kind !== "payment-collection"
  )
  if (cartAuthority.kind !== "found") {
    return resourceAuthorityError(binding)
  }

  const cart = await readCheckoutCartAuthority(
    headers,
    cartAuthority.value,
    binding
  )
  if (cart instanceof Response) {
    return cart
  }

  if (
    !(
      bodyAuthorityMatches(body, "customer_id", cart.customerId) &&
      bodyAuthorityMatches(
        body,
        "payment_collection_id",
        authority.kind === "payment-collection" ? authority.id : null
      ) &&
      bodyAuthorityMatches(
        body,
        "shipping_option_id",
        authority.kind === "shipping-option" ? authority.id : null
      )
    )
  ) {
    return resourceAuthorityError(binding)
  }

  if (authority.kind === "payment-collection-create") {
    return null
  }

  if (authority.kind === "payment-collection") {
    if (cart.paymentCollectionId !== authority.id) {
      return resourceAuthorityError(binding)
    }

    const providerAuthority = readBodyAuthorityId(body, "provider_id", true)
    return providerAuthority.kind === "found"
      ? verifyPaymentProviderAuthority(
          headers,
          providerAuthority.value,
          binding
        )
      : resourceAuthorityError(binding)
  }

  return verifyShippingOptionAuthority(headers, cart.id, authority.id, binding)
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
    const customerAuthority = await readAuthenticatedCustomerId(
      headers,
      binding
    )
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
  const result = await fetchAuthorityPayload(resourceUrl, headers, binding)
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
    : resourceAuthorityError(binding)
}
