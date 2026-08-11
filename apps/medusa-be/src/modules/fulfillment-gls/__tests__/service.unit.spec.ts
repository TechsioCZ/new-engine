import { describe, expect, it, vi } from "vitest"
import { GLS_CLIENT_MODULE } from "../../gls-client"
import { GLSFulfillmentProviderService } from "../service"

describe("GLSFulfillmentProviderService", () => {
  it("advertises courier and ParcelShop delivery with prepaid and COD variants", async () => {
    const provider = createProvider({
      getEffectiveConfig: vi.fn().mockResolvedValue({}),
    })

    await expect(provider.getFulfillmentOptions()).resolves.toEqual([
      {
        id: "gls-home-delivery",
        name: "GLS Courier (home delivery)",
        code: "home_delivery",
        requires_access_point: false,
        supports_cod: false,
      },
      {
        id: "gls-home-delivery-cod",
        name: "GLS Courier COD (home delivery)",
        code: "home_delivery_cod",
        requires_access_point: false,
        supports_cod: true,
      },
      {
        id: "gls-parcelshop",
        name: "GLS ParcelShop (pickup point)",
        code: "parcelshop",
        requires_access_point: true,
        supports_cod: false,
      },
      {
        id: "gls-parcelshop-cod",
        name: "GLS ParcelShop COD (pickup point)",
        code: "parcelshop_cod",
        requires_access_point: true,
        supports_cod: true,
      },
    ])
    await expect(
      provider.validateOption({ code: "parcelshop_cod" })
    ).resolves.toBe(true)
  })

  it("throws when MyGLS does not confirm cancellation", async () => {
    const provider = createProvider({
      cancelPacketForAttempt: vi.fn().mockResolvedValue(false),
    })

    await expect(
      provider.cancelFulfillment(completedFulfillmentData())
    ).rejects.toThrow("did not confirm cancellation")
  })

  it("only resolves cancellation after the carrier and attempt journal confirm it", async () => {
    const cancelPacketForAttempt = vi.fn().mockResolvedValue(true)
    const provider = createProvider({ cancelPacketForAttempt })

    await expect(
      provider.cancelFulfillment(completedFulfillmentData())
    ).resolves.toEqual({ cancelled: true, packet_id: "packet_1" })
    expect(cancelPacketForAttempt).toHaveBeenCalledWith(
      "attempt_1",
      "packet_1",
      { config_id: "config_testing", environment: "testing" }
    )
  })

  it("replaces client pickup data with the canonical point for the cart market", async () => {
    const getBranch = vi.fn().mockResolvedValue({
      id: "point_1",
      name: "Canonical point",
      nameStreet: "Canonical street",
      street: "Canonical street 1",
      city: "Bratislava",
      zip: "81101",
      country: "SK",
    })
    const query = {
      graph: vi.fn().mockResolvedValue({
        data: [
          {
            id: "cart_1",
            sales_channel_id: "sc_sk",
            shipping_address: { country_code: "sk" },
            region: { countries: [{ iso_2: "sk" }] },
          },
        ],
      }),
    }
    const provider = createProvider(
      {
        getEffectiveConfig: vi
          .fn()
          .mockResolvedValue({ supported_countries: ["SK"] }),
        getBranch,
      },
      query
    )

    await expect(
      provider.validateFulfillmentData(
        { code: "parcelshop_cod" },
        {
          access_point_id: "point_1",
          access_point_name: "Client value",
          access_point_country: "CZ",
        },
        { id: "cart_1", shipping_address: { country_code: "sk" } } as never
      )
    ).resolves.toEqual({
      code: "parcelshop_cod",
      requires_access_point: true,
      supports_cod: true,
      access_point_id: "point_1",
      access_point_name: "Canonical point",
      access_point_street: "Canonical street 1",
      access_point_zip: "81101",
      access_point_city: "Bratislava",
      access_point_country: "SK",
      email: undefined,
    })
    expect(getBranch).toHaveBeenCalledWith("SK", "point_1")
  })
})

function createProvider(
  glsClient: Record<string, unknown>,
  query?: Record<string, unknown>
) {
  return new GLSFulfillmentProviderService(
    {
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      file: {},
      query,
      [GLS_CLIENT_MODULE]: glsClient,
    } as never,
    {} as never
  )
}

function completedFulfillmentData() {
  return {
    status: "completed",
    packet_id: "packet_1",
    barcode: "barcode_1",
    supports_cod: false,
    config_id: "config_testing",
    environment: "testing",
    attempt_id: "attempt_1",
    operation_key: "operation_1",
  }
}
