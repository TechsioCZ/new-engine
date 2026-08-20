import {
  type CatalogLifecycleDeliveryV1,
  parseCatalogLifecycleDeliveryV1,
} from "../catalog-lifecycle-parser"
import type {
  ProductLifecycleDecision,
  ProductLifecycleReceiptAction,
  UrlRegistryLifecycleDeliveryV1,
} from "../product-lifecycle"
import {
  type ProductLifecycleDeliveryV1,
  parseProductLifecycleDeliveryV1,
} from "../product-lifecycle-parser"
import { readBoundedTextBody } from "./bounded-body-reader"
import { verifyBearerAuthorization } from "./command-auth"

type RetryDecision = Extract<ProductLifecycleDecision, { kind: "retry" }> &
  Readonly<{ retryAfterSeconds?: number }>
type ConflictDecision = Extract<ProductLifecycleDecision, { kind: "conflict" }>

export type ProductLifecycleConsumeResult =
  | Readonly<{
      kind: "acknowledged"
      action: ProductLifecycleReceiptAction
      replayed: boolean
    }>
  | RetryDecision
  | ConflictDecision

export type ProductLifecycleEndpointDependencies = Readonly<{
  enabled: boolean
  expectedSalesChannelId(
    market: ProductLifecycleDeliveryV1["marketCode"]
  ): string | null
  lifecycleToken: string | undefined
  consume(
    delivery: UrlRegistryLifecycleDeliveryV1
  ): Promise<ProductLifecycleConsumeResult>
}>

const MAX_BODY_BYTES = 64 * 1024
const DEFAULT_RETRY_AFTER_SECONDS = 5
const MAX_RETRY_AFTER_SECONDS = 3600
const PRIVATE_NO_STORE = "private, no-store, max-age=0"

const responseHeaders = {
  "cache-control": PRIVATE_NO_STORE,
  "x-robots-tag": "noindex, nofollow",
}

const jsonError = (error: string, status: number, headers?: HeadersInit) =>
  Response.json(
    { error },
    { headers: { ...responseHeaders, ...headers }, status }
  )

const retryAfterSeconds = (value: number | undefined) => {
  if (!(Number.isSafeInteger(value) && Number(value) > 0)) {
    return DEFAULT_RETRY_AFTER_SECONDS
  }
  return Math.min(Number(value), MAX_RETRY_AFTER_SECONDS)
}

const retry = (error: string, requestedSeconds?: number) =>
  jsonError(error, 503, {
    "retry-after": String(retryAfterSeconds(requestedSeconds)),
  })

const mediaTypeIsJson = (request: Request) =>
  request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase() === "application/json"

const parseDelivery = <Delivery extends UrlRegistryLifecycleDeliveryV1>(
  body: string,
  parser: (input: unknown) => Delivery
): Delivery | null => {
  try {
    return parser(JSON.parse(body))
  } catch {
    return null
  }
}

type ConsumerOrderingErrorCode =
  | "DELIVERY_DRIFT"
  | "SEQUENCE_GAP"
  | "STALE_DELIVERY"

const orderingErrorCode = (
  error: unknown
): ConsumerOrderingErrorCode | null => {
  if (!(error && typeof error === "object")) {
    return null
  }
  const record = error as Readonly<Record<string, unknown>>
  if (record.name !== "ProductLifecycleConsumerError") {
    return null
  }
  return record.code === "DELIVERY_DRIFT" ||
    record.code === "SEQUENCE_GAP" ||
    record.code === "STALE_DELIVERY"
    ? record.code
    : null
}

const consumerFailure = (error: unknown) => {
  const code = orderingErrorCode(error)
  if (code === "SEQUENCE_GAP") {
    return retry("source-event-gap")
  }
  if (code === "DELIVERY_DRIFT" || code === "STALE_DELIVERY") {
    return jsonError("source-event-conflict", 409)
  }
  return retry("service-unavailable")
}

const acknowledge = (
  delivery: UrlRegistryLifecycleDeliveryV1,
  action: ProductLifecycleReceiptAction,
  replayed: boolean
) =>
  Response.json(
    {
      schemaVersion: 1,
      outcome: replayed ? "already-applied" : "applied",
      action,
      replayed,
      outboxEventId: delivery.outboxEventId,
      marketCode: delivery.marketCode,
      streamSequence: delivery.streamSequence,
    },
    { headers: responseHeaders, status: 200 }
  )

const handleLifecycleRequest = async <
  Delivery extends UrlRegistryLifecycleDeliveryV1,
>(
  request: Request,
  dependencies: ProductLifecycleEndpointDependencies,
  parser: (input: unknown) => Delivery
): Promise<Response> => {
  if (!dependencies.enabled) {
    return jsonError("not-found", 404)
  }

  const authorization = verifyBearerAuthorization(
    request.headers.get("authorization"),
    dependencies.lifecycleToken
  )
  if (authorization === "misconfigured") {
    return retry("service-unavailable")
  }
  if (authorization !== "authorized") {
    return jsonError("unauthorized", 401, { "www-authenticate": "Bearer" })
  }
  if (!mediaTypeIsJson(request)) {
    return jsonError("invalid-delivery", 400)
  }

  let body: Awaited<ReturnType<typeof readBoundedTextBody>>
  try {
    body = await readBoundedTextBody(request, MAX_BODY_BYTES)
  } catch {
    return retry("service-unavailable")
  }
  if (body.kind === "too-large") {
    return jsonError("payload-too-large", 413)
  }
  if (body.kind !== "text") {
    return jsonError("invalid-delivery", 400)
  }

  const delivery = parseDelivery(body.value, parser)
  if (!delivery) {
    return jsonError("invalid-delivery", 400)
  }
  const assignment = delivery.payload.assignment
  const expectedSalesChannelId = dependencies.expectedSalesChannelId(
    delivery.marketCode
  )
  if (
    !expectedSalesChannelId ||
    (assignment !== null &&
      assignment.salesChannelId !== expectedSalesChannelId)
  ) {
    return jsonError("market-assignment-mismatch", 409)
  }

  try {
    const result = await dependencies.consume(delivery)
    if (result.kind === "acknowledged") {
      return acknowledge(delivery, result.action, result.replayed)
    }
    if (result.kind === "retry") {
      return retry(result.cause, result.retryAfterSeconds)
    }
    if (result.kind === "conflict") {
      return jsonError(result.cause, 409)
    }
    return retry("service-unavailable")
  } catch (error) {
    return consumerFailure(error)
  }
}

export const handleProductLifecycleRequest = (
  request: Request,
  dependencies: ProductLifecycleEndpointDependencies
) =>
  handleLifecycleRequest(request, dependencies, parseProductLifecycleDeliveryV1)

export type CatalogLifecycleEndpointDependencies = Omit<
  ProductLifecycleEndpointDependencies,
  "consume"
> &
  Readonly<{
    consume(
      delivery: CatalogLifecycleDeliveryV1
    ): Promise<ProductLifecycleConsumeResult>
  }>

export const handleCatalogLifecycleRequest = (
  request: Request,
  dependencies: CatalogLifecycleEndpointDependencies
) =>
  handleLifecycleRequest(
    request,
    dependencies as ProductLifecycleEndpointDependencies,
    parseCatalogLifecycleDeliveryV1
  )
