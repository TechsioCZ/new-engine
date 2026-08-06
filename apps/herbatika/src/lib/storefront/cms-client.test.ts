import { afterEach, describe, expect, it, vi } from "vitest"
import { CmsUpstreamError, fetchCmsJson } from "./cms-client"

vi.mock("./sdk", () => ({
  storefrontConfig: { publishableKey: "test-publishable-key" },
}))

const fetchJson = () => fetchCmsJson<{ ok: boolean }>("pages/promo", "sk-SK")

const rejectedError = async (request: Promise<unknown>) => {
  try {
    await request
  } catch (error) {
    return error
  }

  throw new Error("Expected CMS request to reject")
}

describe("fetchCmsJson", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("returns null only for a definitive HTTP 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 404 }))
    )

    await expect(fetchJson()).resolves.toBeNull()
  })

  it("throws a typed HTTP error for a CMS 500 without exposing its body", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("private upstream details", { status: 500 })
        )
    )

    const error = await rejectedError(fetchJson())

    expect(error).toBeInstanceOf(CmsUpstreamError)
    expect(error).toMatchObject({ reason: "http", status: 500 })
    expect((error as Error).message).not.toContain("private upstream details")
  })

  it("throws a typed network error and sends a bounded abort signal", async () => {
    const timeoutSignal = new AbortController().signal
    const timeoutSpy = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(timeoutSignal)
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new Error("private network details"))
    vi.stubGlobal("fetch", fetchMock)

    const error = await rejectedError(fetchJson())

    expect(error).toBeInstanceOf(CmsUpstreamError)
    expect(error).toMatchObject({ reason: "network", status: undefined })
    expect((error as Error).message).not.toContain("private network details")

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit & {
      next?: { revalidate?: number }
    }
    expect(timeoutSpy).toHaveBeenCalledWith(10_000)
    expect(requestInit.signal).toBe(timeoutSignal)
    expect(requestInit.next).toEqual({ revalidate: 600 })
  })

  it("does not use null as a successful CMS payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("null", {
          headers: { "content-type": "application/json" },
          status: 200,
        })
      )
    )

    const error = await rejectedError(fetchJson())

    expect(error).toBeInstanceOf(CmsUpstreamError)
    expect(error).toMatchObject({ reason: "invalid-payload", status: 200 })
  })

  it("throws a typed invalid-payload error for malformed JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("{not-json", {
          headers: { "content-type": "application/json" },
          status: 200,
        })
      )
    )

    const error = await rejectedError(fetchJson())

    expect(error).toBeInstanceOf(CmsUpstreamError)
    expect(error).toMatchObject({ reason: "invalid-payload", status: 200 })
    expect((error as Error).message).not.toContain("not-json")
  })
})
