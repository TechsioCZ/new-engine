import { describe, expect, it } from "vitest"
import {
  paginatePublicStoreProductAttributes,
  toPublicStoreProductAttributes,
} from "../utils"

describe("Store Product Attributes visibility", () => {
  it("returns only public definitions and strips select text values", () => {
    expect(
      toPublicStoreProductAttributes([
        {
          definition: {
            id: "patdef_warranty",
            input_type: "select",
            is_public: true,
            key: "warranty",
            label: "Warranty",
          },
          definition_id: "patdef_warranty",
          id: "pat_1",
          option: {
            definition_id: "patdef_warranty",
            id: "patopt_2",
            key: "2-roky",
            label: "2 roky",
          },
          option_id: "patopt_2",
          product_id: "prod_1",
          text_value: "must-not-leak",
        },
        {
          definition: {
            id: "patdef_supplier",
            input_type: "select",
            is_public: false,
            key: "supplier",
            label: "Supplier",
          },
          definition_id: "patdef_supplier",
          id: "pat_2",
          product_id: "prod_1",
        },
      ])
    ).toEqual([
      {
        definition: {
          id: "patdef_warranty",
          input_type: "select",
          key: "warranty",
          label: "Warranty",
        },
        id: "pat_1",
        option: {
          id: "patopt_2",
          key: "2-roky",
          label: "2 roky",
        },
        text_value: null,
      },
    ])
  })

  it("omits a select assignment whose active option is unavailable", () => {
    expect(
      toPublicStoreProductAttributes([
        {
          definition: {
            id: "patdef_warranty",
            input_type: "select",
            is_public: true,
            key: "warranty",
            label: "Warranty",
          },
          definition_id: "patdef_warranty",
          id: "pat_1",
          option: null,
          option_id: "patopt_deleted",
          product_id: "prod_1",
        },
      ])
    ).toEqual([])
  })

  it("paginates after private and inactive assignments are omitted", () => {
    const result = paginatePublicStoreProductAttributes(
      [
        {
          definition: {
            id: "private",
            input_type: "text",
            is_public: false,
            key: "private",
            label: "Private",
          },
          definition_id: "private",
          id: "private-assignment",
          product_id: "prod_1",
          text_value: "hidden",
        },
        {
          definition: {
            id: "second",
            input_type: "text",
            is_public: true,
            key: "z-second",
            label: "Second",
          },
          definition_id: "second",
          id: "second-assignment",
          product_id: "prod_1",
          text_value: "second",
        },
        {
          definition: {
            id: "first",
            input_type: "text",
            is_public: true,
            key: "a-first",
            label: "First",
          },
          definition_id: "first",
          id: "first-assignment",
          product_id: "prod_1",
          text_value: "first",
        },
      ],
      { limit: 1, offset: 1 }
    )

    expect(result.count).toBe(2)
    expect(result.product_attributes.map(({ id }) => id)).toEqual([
      "second-assignment",
    ])
  })
})
