import { Readable } from "node:stream"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const ORIGINAL_ENV = { ...process.env }

const restoreEnv = () => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key]
    }
  }

  Object.assign(process.env, ORIGINAL_ENV)
}

const createMockRequest = () =>
  Object.assign(Readable.from([Buffer.from("xlsx")]), {
    headers: {
      "content-length": "4",
      "content-type": "multipart/form-data; boundary=test",
    },
  })

const createMockResponse = () => ({
  json: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
  setHeader: vi.fn(),
  status: vi.fn().mockReturnThis(),
})

describe("POST /admin/payload/article-import", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    process.env.PAYLOAD_API_KEY = "payload-key"
    delete process.env.PAYLOAD_IMPORT_UPSTREAM_TIMEOUT_MS
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    restoreEnv()
  })

  it("allows long imports and aborts the Payload request after 15 minutes", async () => {
    const fetchMock = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => {
              const error = new Error("aborted")
              error.name = "AbortError"
              reject(error)
            },
            { once: true }
          )
        })
    )
    vi.stubGlobal("fetch", fetchMock)

    const { POST } = await import(
      "../../../../../../../src/api/admin/payload/article-import/route"
    )
    const req = createMockRequest()
    const res = createMockResponse()
    const request = POST(
      req as unknown as Parameters<typeof POST>[0],
      res as unknown as Parameters<typeof POST>[1]
    )

    await vi.advanceTimersByTimeAsync(30_000)
    expect(res.status).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(14 * 60_000 + 30_000)
    await request

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(res.status).toHaveBeenCalledWith(504)
    expect(res.json).toHaveBeenCalledWith({
      message: "Payload import timed out",
    })
  })
})
