import { describe, expect, it, vi } from "vitest"

import { toBrandResponse } from "../utils"

vi.mock("../../../../links/product-brand", () => ({
  ProductBrandLink: {},
}))

describe("toBrandResponse", () => {
  it("omits soft-deleted attribute rows without discarding active values whose type is deleted", () => {
    const response = toBrandResponse({
      attributes: [
        {
          attributeType: {
            id: "bat_country",
            name: "Country",
          },
          deleted_at: new Date("2026-07-20T00:00:00.000Z"),
          id: "ba_deleted",
          value: "CZ",
        },
        {
          attributeType: {
            deleted_at: new Date("2026-07-19T00:00:00.000Z"),
            id: "bat_legacy",
            name: "Legacy",
          },
          id: "ba_legacy",
          value: "Keep me",
        },
        {
          attributeType: {
            id: "bat_founded",
            name: "Founded",
          },
          id: "ba_founded",
          value: "2020",
        },
      ],
      handle: "example",
      id: "brand_example",
      title: "Example",
    })

    expect(response.attributes).toEqual([
      {
        attribute_type_deleted_at: new Date("2026-07-19T00:00:00.000Z"),
        attribute_type_id: "bat_legacy",
        id: "ba_legacy",
        name: "Legacy",
        value: "Keep me",
      },
      {
        attribute_type_deleted_at: null,
        attribute_type_id: "bat_founded",
        id: "ba_founded",
        name: "Founded",
        value: "2020",
      },
    ])
  })
})
