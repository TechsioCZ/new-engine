import { describe, expect, it } from "vitest"
import { applySsrOutcome, type SsrResponseWriter } from "./ssr-outcome"

const createResponse = () => {
  const headers = new Map<string, string>()
  const response: SsrResponseWriter = {
    statusCode: 0,
    setHeader(name, value) {
      headers.set(name.toLowerCase(), String(value))
      return response
    },
  }

  return { headers, response }
}

describe("applySsrOutcome", () => {
  it("returns serializable found props with an explicit 200 and no shared cache", () => {
    const { headers, response } = createResponse()

    expect(
      applySsrOutcome(response, {
        kind: "found",
        value: { entityId: "prod_123" },
      })
    ).toEqual({
      props: {
        page: {
          kind: "found",
          value: { entityId: "prod_123" },
        },
      },
    })
    expect(response.statusCode).toBe(200)
    expect(headers.get("cache-control")).toBe(
      "private, no-store, max-age=0, must-revalidate"
    )
    expect(headers.has("x-robots-tag")).toBe(false)
  })

  it("returns one permanent redirect without rendering a page", () => {
    const { headers, response } = createResponse()

    expect(
      applySsrOutcome(response, {
        kind: "redirect",
        destination: "/products/current?variant=SKU-AbC-01",
        statusCode: 308,
      })
    ).toEqual({
      redirect: {
        destination: "/products/current?variant=SKU-AbC-01",
        statusCode: 308,
      },
    })
    expect(headers.get("cache-control")).toBe(
      "private, no-store, max-age=0, must-revalidate"
    )
  })

  it("uses the framework 404 result while keeping the error non-indexable", () => {
    const { headers, response } = createResponse()

    expect(applySsrOutcome(response, { kind: "not-found" })).toEqual({
      notFound: true,
    })
    expect(headers.get("cache-control")).toBe(
      "private, no-store, max-age=0, must-revalidate"
    )
    expect(headers.get("x-robots-tag")).toBe("noindex, nofollow")
  })

  it.each([
    ["bad-request", 400],
    ["gone", 410],
  ] as const)("renders a hard %s error before the page flushes", (kind, status) => {
    const { headers, response } = createResponse()

    expect(applySsrOutcome(response, { kind })).toEqual({
      props: { page: { kind: "error", status } },
    })
    expect(response.statusCode).toBe(status)
    expect(headers.get("cache-control")).toBe(
      "private, no-store, max-age=0, must-revalidate"
    )
    expect(headers.get("x-robots-tag")).toBe("noindex, nofollow")
  })

  it("renders 503 with a bounded default Retry-After value", () => {
    const { headers, response } = createResponse()

    expect(applySsrOutcome(response, { kind: "unavailable" })).toEqual({
      props: { page: { kind: "error", status: 503 } },
    })
    expect(response.statusCode).toBe(503)
    expect(headers.get("retry-after")).toBe("30")
    expect(headers.get("x-robots-tag")).toBe("noindex, nofollow")
  })

  it.each([
    [-10, "1"],
    [45.9, "45"],
    [999, "300"],
  ])("bounds Retry-After input %s to %s seconds", (input, expected) => {
    const { headers, response } = createResponse()

    applySsrOutcome(response, {
      kind: "unavailable",
      retryAfterSeconds: input,
    })

    expect(headers.get("retry-after")).toBe(expected)
  })

  // Markets share one origin and one set of public paths; only Host selects the
  // market. A cache keyed on the URL alone would serve one market's page to
  // another, so every response that reaches a cache must vary on Host.
  it.each([
    [{ kind: "found", value: { entityId: "prod_123" } }],
    [{ kind: "redirect", destination: "/x", statusCode: 308 }],
    [{ kind: "not-found" }],
    [{ kind: "bad-request" }],
    [{ kind: "gone" }],
    [{ kind: "unavailable" }],
  ] as const)("keys the %o response on Host for any shared cache", (outcome) => {
    const { headers, response } = createResponse()

    applySsrOutcome(response, outcome)

    expect(headers.get("vary")).toBe("Host")
    expect(headers.get("cache-control")).toBe(
      "private, no-store, max-age=0, must-revalidate"
    )
  })
})
