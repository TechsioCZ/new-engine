import { afterEach, describe, expect, it, vi } from "vitest"
import { SHOP_REVIEW_MODULE } from "../../../../../modules/shop-review"
import { GET } from "../route"

const HEUREKA_SHOP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<reviews>
  <review>
    <rating_id>rating-live</rating_id>
    <unix_timestamp>1720000000</unix_timestamp>
    <total_rating>100</total_rating>
    <summary>RychlĂ© doruÄŤenĂ­</summary>
    <recommends>1</recommends>
  </review>
</reviews>`

describe("GET /store/external-reviews/heureka", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("loads the Heureka export through the API Store-backed shop review module", async () => {
    const fetchHeurekaReviews = vi.fn().mockResolvedValue({
      body: HEUREKA_SHOP_XML,
      content_type: "application/xml; charset=utf-8",
      provider: "heureka",
      source_url:
        "https://www.heureka.sk/direct/dotaznik/export-review.php?key=%5BREDACTED%5D",
    })
    const resolve = vi.fn((registrationName: string) => {
      if (registrationName === SHOP_REVIEW_MODULE) {
        return { fetchHeurekaReviews }
      }

      throw new Error(`Unexpected registration: ${registrationName}`)
    })
    const json = vi.fn()
    const response = {
      json,
      setHeader: vi.fn(),
      status: vi.fn(),
    }

    await GET(
      {
        scope: { resolve },
        validatedQuery: { kind: "shop", limit: 4 },
      } as never,
      response as never
    )

    expect(fetchHeurekaReviews).toHaveBeenCalledWith({
      kind: "shop",
      locale: "sk",
    })
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        reviews: [expect.objectContaining({ id: "rating-live" })],
      })
    )
  })
})
