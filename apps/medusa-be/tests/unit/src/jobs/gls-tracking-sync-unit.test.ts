import { describe, expect, it } from "vitest"

import { decodePendingFulfillments } from "../../../../src/jobs/gls-tracking-sync"

const fulfillment = {
  data: {
    access_point_id: "parcel-shop-1",
    barcode: "12345678901",
    packet_id: 123,
    status: "completed",
    supports_cod: false,
  },
  delivered_at: null,
  id: "ful_current",
  provider_id: "gls_gls",
  shipped_at: "2026-08-07T10:00:00.000Z",
}

describe(decodePendingFulfillments, () => {
  it("accepts legacy fulfillment data without status", () => {
    const decoded = decodePendingFulfillments(
      [
        {
          ...fulfillment,
          data: {
            access_point_id: "parcel-shop-1",
            barcode: "12345678901",
            packet_id: 123,
            supports_cod: false,
          },
          id: "ful_legacy_status",
        },
      ],
      25,
    )

    expect(decoded).toHaveLength(1)
    expect(decoded[0]?.id).toBe("ful_legacy_status")
    expect(decoded[0]?.data.status).toBeUndefined()
  })

  it("accepts legacy fulfillment data with a null delivery-failed marker", () => {
    const decoded = decodePendingFulfillments(
      [
        {
          ...fulfillment,
          data: {
            ...fulfillment.data,
            delivery_failed: null,
          },
          id: "ful_legacy_delivery_failed",
        },
      ],
      25,
    )

    expect(decoded).toHaveLength(1)
    expect(decoded[0]?.id).toBe("ful_legacy_delivery_failed")
    expect(decoded[0]?.data.delivery_failed).toBeNull()
  })

  it("skips invalid rows while retaining valid and legacy rows", () => {
    const decoded = decodePendingFulfillments(
      [
        null,
        {
          ...fulfillment,
          data: { ...fulfillment.data, delivery_failed: true },
          id: "ful_failed",
        },
        {
          ...fulfillment,
          data: { ...fulfillment.data, status: "pending" },
          id: "ful_invalid_status",
        },
        {
          ...fulfillment,
          data: { ...fulfillment.data, packet_id: {} },
          id: "ful_invalid_packet",
        },
        {
          ...fulfillment,
          id: "ful_wrong_provider",
          provider_id: "gls_other",
        },
        fulfillment,
        {
          ...fulfillment,
          data: {
            access_point_id: "parcel-shop-2",
            barcode: "10987654321",
            delivery_failed: null,
            packet_id: "legacy-packet",
            supports_cod: true,
          },
          id: "ful_legacy",
        },
      ],
      25,
    )

    expect(decoded.map(({ id }) => id)).toStrictEqual([
      "ful_current",
      "ful_legacy",
    ])
  })

  it("returns no pending fulfillments for a non-array boundary value", () => {
    expect(decodePendingFulfillments({ data: fulfillment }, 25)).toStrictEqual(
      [],
    )
  })
})
