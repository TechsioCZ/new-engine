import type { ClaimedInvalidationOutboxEvent } from "../postgres/invalidation-outbox-store"
import { parseUrlRegistryInvalidationDeliveryV1 } from "./invalidation-contract"

const MAX_RESPONSE_BYTES = 8 * 1024
const MAX_RETRY_AFTER_MS = 60 * 60 * 1000
const REQUEST_TIMEOUT_MS = 5000
const UNSIGNED_INTEGER = /^\d+$/
const ignoreCancellationError = () => {
  // The response status is the delivery result; body cancellation is cleanup.
}

export type InvalidationDeliveryAttempt =
  | Readonly<{ kind: "delivered"; replayed: boolean }>
  | Readonly<{ errorCode: string; kind: "failed" }>
  | Readonly<{
      errorCode: string
      kind: "retry"
      retryAfterMs?: number
    }>

type DeliveryOptions = Readonly<{
  fetchImpl?: typeof fetch
  now?: () => number
}>

const retryAfterMs = (
  value: string | null,
  now: () => number
): number | undefined => {
  if (!value) {
    return
  }
  if (UNSIGNED_INTEGER.test(value)) {
    return Math.min(MAX_RETRY_AFTER_MS, Number(value) * 1000)
  }
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp)
    ? undefined
    : Math.min(MAX_RETRY_AFTER_MS, Math.max(0, timestamp - now()))
}

const isRetryableStatus = (status: number): boolean =>
  status === 408 ||
  status === 425 ||
  status === 429 ||
  (status >= 500 && status <= 599)

const readBoundedResponse = async (
  response: Response
): Promise<{ kind: "text"; value: string } | { kind: "too-large" }> => {
  const reader = response.body?.getReader()
  if (!reader) {
    return { kind: "text", value: "" }
  }
  const decoder = new TextDecoder()
  let bytes = 0
  let value = ""
  while (true) {
    const chunk = await reader.read()
    if (chunk.done) {
      return { kind: "text", value: value + decoder.decode() }
    }
    bytes += chunk.value.byteLength
    if (bytes > MAX_RESPONSE_BYTES) {
      await reader.cancel().catch(ignoreCancellationError)
      return { kind: "too-large" }
    }
    value += decoder.decode(chunk.value, { stream: true })
  }
}

const parseAcknowledgement = async (
  response: Response,
  event: ClaimedInvalidationOutboxEvent
): Promise<InvalidationDeliveryAttempt> => {
  if (
    response.headers.get("content-type")?.split(";", 1)[0]?.trim() !==
    "application/json"
  ) {
    return { errorCode: "invalid-ack", kind: "retry" }
  }
  const body = await readBoundedResponse(response)
  if (body.kind === "too-large") {
    return { errorCode: "response-too-large", kind: "retry" }
  }
  try {
    const value: unknown = JSON.parse(body.value)
    if (
      !(typeof value === "object" && value !== null && !Array.isArray(value))
    ) {
      return { errorCode: "invalid-ack", kind: "retry" }
    }
    const record = value as Record<string, unknown>
    if (
      Object.keys(record).sort().join(",") !==
        "invalidatedTagCount,outboxEventId,replayed,schemaVersion" ||
      record.schemaVersion !== 1 ||
      record.outboxEventId !== event.id ||
      record.invalidatedTagCount !== event.tags.length ||
      typeof record.replayed !== "boolean"
    ) {
      return { errorCode: "invalid-ack", kind: "retry" }
    }
    return { kind: "delivered", replayed: record.replayed }
  } catch {
    return { errorCode: "invalid-ack", kind: "retry" }
  }
}

export const deliverInvalidationOutboxEvent = async (
  event: ClaimedInvalidationOutboxEvent,
  config: Readonly<{ endpoint: string; token: string }>,
  options: DeliveryOptions = {}
): Promise<InvalidationDeliveryAttempt> => {
  const delivery = parseUrlRegistryInvalidationDeliveryV1({
    outboxEventId: event.id,
    schemaVersion: 1,
    tags: event.tags,
  })
  if (!delivery) {
    return { errorCode: "invalid-outbox-payload", kind: "failed" }
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await (options.fetchImpl ?? fetch)(config.endpoint, {
      body: JSON.stringify(delivery),
      headers: {
        accept: "application/json",
        authorization: `Bearer ${config.token}`,
        "content-type": "application/json",
      },
      method: "POST",
      redirect: "error",
      signal: controller.signal,
    })
    if (response.status === 200) {
      return await parseAcknowledgement(response, event)
    }
    await response.body?.cancel().catch(ignoreCancellationError)
    const errorCode = `http-${response.status}`
    if (!isRetryableStatus(response.status)) {
      return { errorCode, kind: "failed" }
    }
    const retry = retryAfterMs(
      response.headers.get("retry-after"),
      options.now ?? Date.now
    )
    return {
      errorCode,
      kind: "retry",
      ...(retry === undefined ? {} : { retryAfterMs: retry }),
    }
  } catch {
    return {
      errorCode: controller.signal.aborted ? "timeout" : "network-error",
      kind: "retry",
    }
  } finally {
    clearTimeout(timeout)
  }
}
