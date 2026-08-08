import { afterEach, describe, expect, it, vi } from "vitest"

import { fetchSearchAutocomplete } from "./search-autocomplete.server"

vi.mock(import("server-only"), () => ({}))

const createPayload = (products: unknown, degraded = false) => ({
  brands: [],
  categories: [],
  content: [],
  degraded,
  products,
})

describe("fetchSearchAutocomplete response validation", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("accepts nullable product relations and propagates degraded search", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        createPayload(
          [
            {
              brand: null,
              categories: null,
              handle: "magnesium",
              id: "prod_1",
              metadata: null,
              thumbnail: null,
              title: "Magnesium",
              variants: null,
            },
            {
              brand: null,
              categories: [],
              handle: "vitamin-c",
              id: "prod_2",
              metadata: {},
              title: "Vitamin C",
              variants: [
                {
                  calculated_price: null,
                  id: "var_2",
                  title: "Default",
                },
              ],
            },
          ],
          true,
        ),
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await fetchSearchAutocomplete({
      currencyCode: "eur",
      locale: "sk-SK",
      query: "mag",
    })

    const requestUrl = fetchMock.mock.calls[0]?.[0]
    expect(requestUrl).toBeInstanceOf(URL)
    if (!(requestUrl instanceof URL)) {
      throw new TypeError("Expected autocomplete request URL")
    }
    expect(requestUrl.searchParams.get("locale")).toBe("sk-SK")
    expect(result.degraded).toBeTruthy()
    expect(result.products).toHaveLength(2)
  })

  it("rejects malformed sections instead of silently returning empty results", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(createPayload([], false)))
    fetchMock.mockResolvedValueOnce(
      Response.json({
        ...createPayload([], false),
        brands: [{ id: 7, title: "Invalid" }],
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      fetchSearchAutocomplete({ currencyCode: "eur", query: "invalid" }),
    ).rejects.toMatchObject({
      code: "INVALID_CATALOG_AUTOCOMPLETE_RESPONSE",
    })
  })

  it("rejects protocol-relative content links", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        ...createPayload([], false),
        content: [
          { href: "//evil.example/path", id: "page_1", title: "Unsafe" },
        ],
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      fetchSearchAutocomplete({ currencyCode: "eur", query: "unsafe" }),
    ).rejects.toMatchObject({
      code: "INVALID_CATALOG_AUTOCOMPLETE_RESPONSE",
    })
  })
})
