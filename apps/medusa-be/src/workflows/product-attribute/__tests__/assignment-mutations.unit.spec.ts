import { describe, expect, it } from "vitest"
import type {
  ProductAttributeAssignmentRecord,
  ProductAttributeDefinitionRecord,
  ProductAttributeOptionRecord,
} from "../../../utils/product-attributes"
import {
  planProductAttributeAssignmentMutations,
  prepareProductAttributeAssignmentCompensation,
  validateProductAttributeOperations,
} from "../steps/assignment-mutations"

const textDefinition: ProductAttributeDefinitionRecord = {
  id: "patdef_note",
  input_type: "text",
  is_public: false,
  key: "note",
  label: "Note",
}
const selectDefinition: ProductAttributeDefinitionRecord = {
  id: "patdef_warranty",
  input_type: "select",
  is_public: true,
  key: "warranty",
  label: "Warranty",
}
const option: ProductAttributeOptionRecord = {
  definition_id: selectDefinition.id,
  id: "patopt_two_years",
  key: "2-roky",
  label: "2 roky",
}
const INACTIVE_OPTION_ERROR = /not an active option/
const DUPLICATE_DEFINITION_ERROR = /occurs more than once/

describe("Product Attribute assignment validation", () => {
  it("accepts exactly one compatible value branch", () => {
    const operations = validateProductAttributeOperations({
      definitions: [textDefinition, selectDefinition],
      operations: [
        {
          action: "set",
          definition_id: textDefinition.id,
          text_value: "  Value  ",
        },
        {
          action: "set",
          definition_id: selectDefinition.id,
          option_id: option.id,
        },
      ],
      options: [option],
    })

    expect(operations[0]).toMatchObject({ text_value: "Value" })
    expect(operations[1]).toMatchObject({ option })
  })

  it("rejects an option owned by another definition", () => {
    expect(() =>
      validateProductAttributeOperations({
        definitions: [selectDefinition],
        operations: [
          {
            action: "set",
            definition_id: selectDefinition.id,
            option_id: option.id,
          },
        ],
        options: [{ ...option, definition_id: "patdef_other" }],
      })
    ).toThrow(INACTIVE_OPTION_ERROR)
  })

  it("rejects duplicate definition operations", () => {
    expect(() =>
      validateProductAttributeOperations({
        definitions: [textDefinition],
        operations: [
          {
            action: "set",
            definition_id: textDefinition.id,
            text_value: "one",
          },
          {
            action: "remove",
            definition_id: textDefinition.id,
          },
        ],
        options: [],
      })
    ).toThrow(DUPLICATE_DEFINITION_ERROR)
  })
})

describe("Product Attribute set/remove reconciliation", () => {
  it("reuses a soft-deleted assignment and prepares rollback state", () => {
    const previous: ProductAttributeAssignmentRecord = {
      definition_id: selectDefinition.id,
      deleted_at: new Date("2026-01-01"),
      id: "pat_existing",
      option_id: "patopt_old",
      product_id: "prod_1",
      text_value: null,
    }
    const operations = validateProductAttributeOperations({
      definitions: [selectDefinition],
      operations: [
        {
          action: "set",
          definition_id: selectDefinition.id,
          option_id: option.id,
        },
      ],
      options: [option],
    })
    const mutations = planProductAttributeAssignmentMutations({
      existingAssignments: [previous],
      operations,
    })

    expect(mutations).toEqual([
      {
        definition_id: selectDefinition.id,
        existing: previous,
        kind: "set",
        values: {
          option_id: option.id,
          text_value: null,
        },
      },
    ])
    expect(prepareProductAttributeAssignmentCompensation(mutations)).toEqual({
      created_ids: [],
      previous: [previous],
    })
  })

  it("treats removal of an already deleted assignment as a no-op", () => {
    const deleted: ProductAttributeAssignmentRecord = {
      definition_id: textDefinition.id,
      deleted_at: new Date("2026-01-01"),
      id: "pat_deleted",
      product_id: "prod_1",
      text_value: "old",
    }
    const operations = validateProductAttributeOperations({
      definitions: [textDefinition],
      operations: [
        {
          action: "remove",
          definition_id: textDefinition.id,
        },
      ],
      options: [],
    })
    const mutations = planProductAttributeAssignmentMutations({
      existingAssignments: [deleted],
      operations,
    })

    expect(prepareProductAttributeAssignmentCompensation(mutations)).toEqual({
      created_ids: [],
      previous: [],
    })
  })

  it.each([
    ["active first", false],
    ["deleted first", true],
  ])("prefers the active assignment when history is returned %s", (_label, deletedFirst) => {
    const active: ProductAttributeAssignmentRecord = {
      definition_id: textDefinition.id,
      deleted_at: null,
      id: "pat_active",
      product_id: "prod_1",
      text_value: "current",
    }
    const deleted: ProductAttributeAssignmentRecord = {
      definition_id: textDefinition.id,
      deleted_at: new Date("2026-01-01"),
      id: "pat_deleted",
      product_id: "prod_1",
      text_value: "old",
    }
    const operations = validateProductAttributeOperations({
      definitions: [textDefinition],
      operations: [
        {
          action: "remove",
          definition_id: textDefinition.id,
        },
      ],
      options: [],
    })
    const mutations = planProductAttributeAssignmentMutations({
      existingAssignments: deletedFirst ? [deleted, active] : [active, deleted],
      operations,
    })

    expect(mutations[0]?.existing).toBe(active)
  })
})
