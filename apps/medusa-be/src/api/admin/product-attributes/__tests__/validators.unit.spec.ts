import { describe, expect, it } from "vitest"
import {
  AdminGetProductAttributeDefinitionsSchema,
  AdminGetProductAttributeOptionProductsSchema,
  AdminSetProductAttributesSchema,
} from "../validators"

describe("Product Attribute Admin request validation", () => {
  it("supports active, deleted, and all status filters", () => {
    expect(
      AdminGetProductAttributeDefinitionsSchema.parse({ status: "all" })
    ).toMatchObject({
      limit: 50,
      offset: 0,
      status: "all",
    })
  })

  it("rejects mixed text and option value branches", () => {
    expect(
      AdminSetProductAttributesSchema.safeParse({
        operations: [
          {
            action: "set",
            definition_id: "patdef_1",
            option_id: "patopt_1",
            text_value: "invalid",
          },
        ],
      }).success
    ).toBe(false)
  })

  it("bounds option Product usage pagination", () => {
    expect(AdminGetProductAttributeOptionProductsSchema.parse({})).toEqual({
      limit: 20,
      offset: 0,
    })
    expect(
      AdminGetProductAttributeOptionProductsSchema.safeParse({ limit: 101 })
        .success
    ).toBe(false)
  })
})
