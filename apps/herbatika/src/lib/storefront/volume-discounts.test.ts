import { afterEach, describe, expect, it, vi } from "vitest"
import { resolveProductVolumeDiscountOptions } from "../../components/product-detail/product-detail-pricing-data.utils"
import { resolveVolumeDiscountOptions } from "../../components/product-detail/utils/pricing-utils"
import { fetchVolumeDiscountTiers } from "./volume-discounts"
import { parseVolumeDiscountTierResponse } from "./volume-discounts-contract"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("parseVolumeDiscountTierResponse", () => {
  it("accepts the complete backend response contract", () => {
    const response = {
      volume_discount_tiers: [
        {
          promotion_id: "promo_2",
          minimum_quantity: 2,
          percentage: 5,
          unit_amount: 950,
          total_amount: 1900,
          currency_code: "eur",
        },
      ],
    }

    expect(parseVolumeDiscountTierResponse(response)).toEqual(response)
  })

  it("rejects malformed backend tiers", () => {
    expect(() =>
      parseVolumeDiscountTierResponse({
        volume_discount_tiers: [
          {
            promotion_id: "promo_2",
            minimum_quantity: "2",
            percentage: 5,
            unit_amount: 950,
            total_amount: 1900,
            currency_code: "eur",
          },
        ],
      })
    ).toThrow("Invalid volume discount response")
  })
})

describe("fetchVolumeDiscountTiers", () => {
  it("uses the same-origin gateway and sends only the variant identity", async () => {
    const responseBody = {
      volume_discount_tiers: [
        {
          promotion_id: "promo_2",
          minimum_quantity: 2,
          percentage: 5,
          unit_amount: 950,
          total_amount: 1900,
          currency_code: "eur",
        },
      ],
    }
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(responseBody, {
        status: 200,
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchVolumeDiscountTiers("variant_1")).resolves.toEqual(
      responseBody
    )
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/storefront/product/volume-discounts?variant_id=variant_1",
      {
        cache: "no-store",
        credentials: "same-origin",
        headers: { accept: "application/json" },
        signal: undefined,
      }
    )
  })

  it("rejects a failed gateway response without exposing its body", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { message: "sensitive upstream detail" },
            { status: 503 }
          )
        )
    )

    const error = await fetchVolumeDiscountTiers("variant_1").catch(
      (reason: unknown) => reason
    )

    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({
      message: "Volume discount request failed with status 503",
      status: 503,
    })
  })
})

describe("resolveVolumeDiscountOptions", () => {
  it("uses configured promotion percentages without inventing fallback values", () => {
    const options = resolveVolumeDiscountOptions(
      1000,
      "EUR",
      [
        {
          promotion_id: "promo_2",
          minimum_quantity: 2,
          percentage: 5,
          unit_amount: 950,
          total_amount: 1900,
          currency_code: "eur",
        },
        {
          promotion_id: "promo_5",
          minimum_quantity: 5,
          percentage: 12.5,
          unit_amount: 875,
          total_amount: 4375,
          currency_code: "eur",
        },
      ],
      {
        title: (quantity) => String(quantity).concat(" items"),
        perUnit: (price) => price.concat(" each"),
      }
    )

    expect(options).toEqual([
      expect.objectContaining({
        id: "promo_2",
        percentage: 5,
        quantity: 2,
        title: "2 items",
      }),
      expect.objectContaining({
        id: "promo_5",
        percentage: 12.5,
        quantity: 5,
        title: "5 items",
      }),
    ])
  })

  it("returns no preview without an authoritative product price", () => {
    const tiers = [
      {
        promotion_id: "promo_2",
        minimum_quantity: 2,
        percentage: 5,
        unit_amount: 950,
        total_amount: 1900,
        currency_code: "eur",
      },
    ]

    expect(
      resolveVolumeDiscountOptions(null, "EUR", tiers, {
        title: String,
        perUnit: String,
      })
    ).toEqual([])
  })

  it("offers native tiers to every product and hides quantities that inventory cannot satisfy", () => {
    const options = resolveProductVolumeDiscountOptions({
      availableQuantity: 3,
      currentAmount: 1000,
      currentCurrencyCode: "EUR",
      labels: { title: String, perUnit: String },
      tiers: [
        {
          promotion_id: "promo_2",
          minimum_quantity: 2,
          percentage: 5,
          unit_amount: 950,
          total_amount: 1900,
          currency_code: "eur",
        },
        {
          promotion_id: "promo_5",
          minimum_quantity: 5,
          percentage: 15,
          unit_amount: 850,
          total_amount: 4250,
          currency_code: "eur",
        },
      ],
    })

    expect(options.map((option) => option.quantity)).toEqual([2])
  })
})
