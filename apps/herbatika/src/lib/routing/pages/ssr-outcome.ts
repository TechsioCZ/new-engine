import type { GetServerSidePropsResult } from "next"

const NO_STORE = "private, no-store, max-age=0, must-revalidate"
const DEFAULT_RETRY_AFTER_SECONDS = 30
const MIN_RETRY_AFTER_SECONDS = 1
const MAX_RETRY_AFTER_SECONDS = 300

export type SsrResponseWriter = {
  statusCode: number
  setHeader(name: string, value: number | string | readonly string[]): unknown
}

export type SsrOutcome<Value> =
  | { kind: "found"; value: Value }
  | {
      kind: "redirect"
      destination: string
      statusCode: 307 | 308
    }
  | { kind: "not-found" }
  | { kind: "bad-request" }
  | { kind: "gone" }
  | { kind: "unavailable"; retryAfterSeconds?: number }

export type SsrPageProps<Value> = {
  page:
    | { kind: "found"; value: Value }
    | { kind: "error"; status: 400 | 410 | 503 }
}

const setNoStore = (response: SsrResponseWriter) => {
  response.setHeader("Cache-Control", NO_STORE)
}

const setErrorHeaders = (response: SsrResponseWriter) => {
  setNoStore(response)
  response.setHeader("X-Robots-Tag", "noindex, nofollow")
}

const normalizeRetryAfter = (value: number | undefined) => {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_RETRY_AFTER_SECONDS
  }

  return Math.min(
    MAX_RETRY_AFTER_SECONDS,
    Math.max(MIN_RETRY_AFTER_SECONDS, Math.trunc(value))
  )
}

export const applySsrOutcome = <Value>(
  response: SsrResponseWriter,
  outcome: SsrOutcome<Value>
): GetServerSidePropsResult<SsrPageProps<Value>> => {
  if (outcome.kind === "found") {
    response.statusCode = 200
    setNoStore(response)
    return {
      props: { page: { kind: "found", value: outcome.value } },
    }
  }

  if (outcome.kind === "redirect") {
    setNoStore(response)
    return {
      redirect: {
        destination: outcome.destination,
        statusCode: outcome.statusCode,
      },
    }
  }

  setErrorHeaders(response)

  if (outcome.kind === "not-found") {
    response.statusCode = 404
    return { notFound: true }
  }

  let status: 400 | 410 | 503 = 503
  if (outcome.kind === "bad-request") {
    status = 400
  } else if (outcome.kind === "gone") {
    status = 410
  }

  response.statusCode = status

  if (outcome.kind === "unavailable") {
    response.setHeader(
      "Retry-After",
      String(normalizeRetryAfter(outcome.retryAfterSeconds))
    )
  }

  return { props: { page: { kind: "error", status } } }
}
