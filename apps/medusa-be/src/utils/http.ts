import { MedusaError } from "@medusajs/framework/utils"
import { withMedusaStatusCode } from "./errors"

export type RetryPolicy = {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  jitterMs: number
  retryableStatusCodes: Set<number>
  nonRetryableStatusCodes: Set<number>
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 2,
  baseDelayMs: 200,
  maxDelayMs: 2_000,
  jitterMs: 150,
  retryableStatusCodes: new Set([408, 429, 500, 502, 503, 504]),
  nonRetryableStatusCodes: new Set([400, 401, 403, 404, 422]),
}

export const DEFAULT_RETRY_TIMEOUT_MS = 10_000

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "TimeoutError"
  }
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  const signals = init.signal
    ? [controller.signal, init.signal]
    : [controller.signal]
  const combinedSignal = AbortSignal.any(signals)

  try {
    return await fetch(url, { ...init, signal: combinedSignal })
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      if (controller.signal.aborted) {
        throw new TimeoutError(`Request timed out after ${timeoutMs}ms`)
      }
      throw error
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function assertResponseOk(
  response: Response,
  message: string
): Promise<void> {
  if (response.ok) {
    return
  }

  const body = await response.text()
  const suffix = body ? ` - ${body}` : ""
  const errorType =
    response.status >= 500 && response.status < 600
      ? MedusaError.Types.UNEXPECTED_STATE
      : MedusaError.Types.INVALID_DATA

  throw withMedusaStatusCode(
    new MedusaError(errorType, `${message}: ${response.status}${suffix}`),
    response.status
  )
}

export async function readResponseText(
  response: Response,
  message: string
): Promise<string> {
  const text = await response.text()

  if (!text) {
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, message)
  }

  return text
}

export function parseJson(raw: string, message: string): unknown {
  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `${message}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getRetryDelayMs(attempt: number, policy: RetryPolicy): number {
  const exponential = policy.baseDelayMs * 2 ** Math.max(attempt - 1, 0)
  const jitter = Math.floor(Math.random() * policy.jitterMs)
  return Math.min(exponential + jitter, policy.maxDelayMs)
}

function isRetryableStatus(status: number, policy: RetryPolicy): boolean {
  if (policy.nonRetryableStatusCodes.has(status)) {
    return false
  }
  if (policy.retryableStatusCodes.has(status)) {
    return true
  }
  return status >= 500
}

export async function withRetry<T>(
  operation: () => Promise<Response>,
  handleResponse: (response: Response) => Promise<T>,
  errorContext: string,
  policy: RetryPolicy
): Promise<T> {
  if (policy.maxRetries < 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${errorContext}: maxRetries must be non-negative`
    )
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
    if (attempt > 0) {
      await sleep(getRetryDelayMs(attempt, policy))
    }

    try {
      const response = await operation()

      if (isRetryableStatus(response.status, policy)) {
        if (attempt < policy.maxRetries) {
          lastError = new Error(`HTTP ${response.status}`)
          continue
        }
      }

      return await handleResponse(response)
    } catch (error) {
      if (error instanceof MedusaError) {
        throw error
      }

      if (error instanceof TimeoutError) {
        if (attempt >= policy.maxRetries) {
          throw error
        }
        lastError = error
        continue
      }

      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }

  const fallbackMessage =
    lastError?.message ?? "Retry loop completed without a final error"
  throw new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    `${errorContext}: ${fallbackMessage}`
  )
}
