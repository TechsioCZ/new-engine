import { MedusaError } from "@medusajs/framework/utils"
import {
  assertResponseOk,
  fetchWithTimeout,
  parseJson,
  readResponseText,
  TimeoutError,
  withRetry,
  type RetryPolicy,
} from "../http"

const TEST_POLICY: RetryPolicy = {
  maxRetries: 0,
  baseDelayMs: 1,
  maxDelayMs: 1,
  jitterMs: 0,
  retryableStatusCodes: new Set([500, 502, 503, 504]),
  nonRetryableStatusCodes: new Set([400, 401, 403, 404, 422]),
}

describe("http utils", () => {
  const originalFetch = global.fetch
  let fetchMock: jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>
    global.fetch = fetchMock
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it("fetchWithTimeout returns response for successful fetch", async () => {
    fetchMock.mockResolvedValue(new Response("ok", { status: 200 }))

    const response = await fetchWithTimeout(
      "https://example.invalid",
      { method: "GET" },
      100
    )

    expect(response.status).toBe(200)
  })

  it("fetchWithTimeout throws TimeoutError when timeout aborts request", async () => {
    jest.useFakeTimers()

    fetchMock.mockImplementation(
      async (_url: string | URL | Request, init?: RequestInit): Promise<Response> =>
        await new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const abortError = new Error("aborted")
            ;(abortError as Error & { name: string }).name = "AbortError"
            reject(abortError)
          })
        })
    )

    const pending = fetchWithTimeout(
      "https://example.invalid",
      { method: "GET" },
      20
    )
    const assertion = expect(pending).rejects.toBeInstanceOf(TimeoutError)

    await jest.advanceTimersByTimeAsync(20)

    await assertion
  })

  it("fetchWithTimeout rethrows AbortError when request is aborted by caller signal", async () => {
    const externalController = new AbortController()

    fetchMock.mockImplementation(
      async (_url: string | URL | Request, init?: RequestInit): Promise<Response> =>
        await new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const abortError = new Error("aborted by caller")
            ;(abortError as Error & { name: string }).name = "AbortError"
            reject(abortError)
          })
        })
    )

    const pending = fetchWithTimeout(
      "https://example.invalid",
      {
        method: "GET",
        signal: externalController.signal,
      },
      500
    )
    externalController.abort()

    await expect(pending).rejects.toMatchObject({
      name: "AbortError",
      message: "aborted by caller",
    })
  })

  it("fetchWithTimeout rethrows non-abort fetch errors", async () => {
    fetchMock.mockRejectedValue(new Error("network exploded"))

    await expect(
      fetchWithTimeout("https://example.invalid", { method: "GET" }, 50)
    ).rejects.toThrow("network exploded")
  })

  it("assertResponseOk throws INVALID_DATA for 4xx and UNEXPECTED_STATE for 5xx", async () => {
    await expect(
      assertResponseOk(new Response("bad", { status: 400 }), "request failed")
    ).rejects.toMatchObject({
      type: MedusaError.Types.INVALID_DATA,
      statusCode: 400,
    })

    await expect(
      assertResponseOk(new Response("oops", { status: 503 }), "request failed")
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
      statusCode: 503,
    })
  })

  it("assertResponseOk returns when response is ok", async () => {
    await expect(
      assertResponseOk(new Response("ok", { status: 200 }), "request failed")
    ).resolves.toBeUndefined()
  })

  it("readResponseText throws when body is empty", async () => {
    await expect(readResponseText(new Response(null), "empty")).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
  })

  it("readResponseText returns text for non-empty body", async () => {
    await expect(
      readResponseText(new Response("payload"), "empty")
    ).resolves.toBe("payload")
  })

  it("parseJson throws UNEXPECTED_STATE for invalid JSON", () => {
    expect(() => parseJson("not-json", "invalid")).toThrow(MedusaError)
  })

  it("withRetry rejects negative maxRetries", async () => {
    await expect(
      withRetry(
        async () => new Response("ok", { status: 200 }),
        async (response) => response.text(),
        "retry test",
        {
          ...TEST_POLICY,
          maxRetries: -1,
        }
      )
    ).rejects.toMatchObject({
      type: MedusaError.Types.INVALID_DATA,
    })
  })

  it("withRetry wraps non-Medusa errors after exhausting retries", async () => {
    await expect(
      withRetry(
        async () => {
          throw new Error("network down")
        },
        async () => "ok",
        "retry test",
        TEST_POLICY
      )
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
      message: expect.stringContaining("network down"),
    })
  })

  it("withRetry rethrows TimeoutError after retries are exhausted", async () => {
    const operation = jest.fn(async () => {
      throw new TimeoutError("request timed out")
    })

    await expect(
      withRetry(
        operation,
        async () => "ok",
        "retry test",
        {
          ...TEST_POLICY,
          maxRetries: 1,
        }
      )
    ).rejects.toBeInstanceOf(TimeoutError)

    expect(operation).toHaveBeenCalledTimes(2)
  })

  it("withRetry returns handled response when operation succeeds", async () => {
    const value = await withRetry(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
      async (response) => JSON.parse(await response.text()) as { ok: boolean },
      "retry test",
      TEST_POLICY
    )

    expect(value).toEqual({ ok: true })
  })

  it("withRetry does not retry non-retryable status codes", async () => {
    const operation = jest.fn(async () => new Response("bad", { status: 400 }))
    const handleResponse = jest.fn(async (response: Response) => response.status)

    const result = await withRetry(
      operation,
      handleResponse,
      "retry test",
      {
        ...TEST_POLICY,
        maxRetries: 2,
      }
    )

    expect(result).toBe(400)
    expect(operation).toHaveBeenCalledTimes(1)
    expect(handleResponse).toHaveBeenCalledTimes(1)
  })

  it("withRetry retries retryable status and succeeds on later attempt", async () => {
    const operation = jest
      .fn()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }))

    const result = await withRetry(
      operation,
      async (response) => response.status,
      "retry test",
      {
        ...TEST_POLICY,
        maxRetries: 1,
        baseDelayMs: 0,
        maxDelayMs: 0,
        jitterMs: 0,
        retryableStatusCodes: new Set([503]),
      }
    )

    expect(result).toBe(200)
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it("withRetry rethrows MedusaError without wrapping", async () => {
    const medusaError = new MedusaError(MedusaError.Types.INVALID_DATA, "bad request")

    await expect(
      withRetry(
        async () => {
          throw medusaError
        },
        async () => "ok",
        "retry test",
        TEST_POLICY
      )
    ).rejects.toBe(medusaError)
  })
})
