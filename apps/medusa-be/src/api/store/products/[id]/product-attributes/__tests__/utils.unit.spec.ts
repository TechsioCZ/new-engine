import { describe, expect, it } from "vitest"

import type {
  ProductAttributeAssignmentRecord,
  ProductAttributeDefinitionRecord,
  ProductAttributeOptionRecord,
} from "../../../../../../utils/product-attributes"
import type { TranslatedProductAttributeAssignment } from "../utils"
import {
  paginatePublicStoreProductAttributes,
  toPublicStoreProductAttributes,
} from "../utils"

const RECORD_TIMESTAMP = new Date("2026-01-01T00:00:00.000Z")
const RECORD_TIMESTAMPS = {
  created_at: RECORD_TIMESTAMP,
  deleted_at: null,
  updated_at: RECORD_TIMESTAMP,
}

const createDefinition = (
  overrides: Pick<
    ProductAttributeDefinitionRecord,
    "id" | "input_type" | "is_public" | "key" | "label"
  >
): ProductAttributeDefinitionRecord => ({
  ...RECORD_TIMESTAMPS,
  ...overrides,
  assignments: [],
  options: [],
})

const createOption = (
  overrides: Pick<ProductAttributeOptionRecord, "id" | "key" | "label"> & {
    definition: ProductAttributeDefinitionRecord
  }
): ProductAttributeOptionRecord => ({
  ...RECORD_TIMESTAMPS,
  ...overrides,
  assignments: [],
  definition_id: overrides.definition.id,
})

const createAssignment = (
  overrides: Pick<ProductAttributeAssignmentRecord, "id" | "product_id"> & {
    definition: ProductAttributeDefinitionRecord
    option?: ProductAttributeOptionRecord | null
    option_id?: string | null
    text_value?: string | null
  }
): TranslatedProductAttributeAssignment => {
  const {
    definition,
    option = null,
    option_id = option?.id ?? null,
    text_value = null,
    ...rest
  } = overrides

  return {
    ...RECORD_TIMESTAMPS,
    ...rest,
    definition,
    definition_id: definition.id,
    option,
    option_id,
    text_value,
  }
}

describe("Store Product Attributes visibility", () => {
  it("returns only public definitions and strips select text values", () => {
    const warrantyDefinition = createDefinition({
      id: "patdef_warranty",
      input_type: "select",
      is_public: true,
      key: "warranty",
      label: "Warranty",
    })

    expect(
      toPublicStoreProductAttributes([
        createAssignment({
          definition: warrantyDefinition,
          id: "pat_1",
          option: createOption({
            definition: warrantyDefinition,
            id: "patopt_2",
            key: "2-roky",
            label: "2 roky",
          }),
          product_id: "prod_1",
          text_value: "must-not-leak",
        }),
        createAssignment({
          definition: createDefinition({
            id: "patdef_supplier",
            input_type: "select",
            is_public: false,
            key: "supplier",
            label: "Supplier",
          }),
          id: "pat_2",
          product_id: "prod_1",
        }),
      ])
    ).toStrictEqual([
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

  it("omits a select assignment when the active option is unavailable", () => {
    expect(
      toPublicStoreProductAttributes([
        createAssignment({
          definition: createDefinition({
            id: "patdef_warranty",
            input_type: "select",
            is_public: true,
            key: "warranty",
            label: "Warranty",
          }),
          id: "pat_1",
          option: null,
          option_id: "patopt_deleted",
          product_id: "prod_1",
        }),
      ])
    ).toStrictEqual([])
  })

  it("paginates with private and inactive assignments omitted", () => {
    const result = paginatePublicStoreProductAttributes(
      [
        createAssignment({
          definition: createDefinition({
            id: "private",
            input_type: "text",
            is_public: false,
            key: "private",
            label: "Private",
          }),
          id: "private-assignment",
          product_id: "prod_1",
          text_value: "hidden",
        }),
        createAssignment({
          definition: createDefinition({
            id: "second",
            input_type: "text",
            is_public: true,
            key: "z-second",
            label: "Second",
          }),
          id: "second-assignment",
          product_id: "prod_1",
          text_value: "second",
        }),
        createAssignment({
          definition: createDefinition({
            id: "first",
            input_type: "text",
            is_public: true,
            key: "a-first",
            label: "First",
          }),
          id: "first-assignment",
          product_id: "prod_1",
          text_value: "first",
        }),
      ],
      { limit: 1, offset: 1 }
    )

    expect(result.count).toBe(2)
    expect(result.product_attributes.map(({ id }) => id)).toStrictEqual([
      "second-assignment",
    ])
  })
})
