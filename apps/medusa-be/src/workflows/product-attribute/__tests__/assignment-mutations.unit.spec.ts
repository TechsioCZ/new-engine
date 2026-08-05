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

const FIXED_DATE = new Date("2026-01-01")

const buildDefinition = (
  values: Pick<
    ProductAttributeDefinitionRecord,
    "id" | "input_type" | "is_public" | "key" | "label"
  >,
): ProductAttributeDefinitionRecord => ({
  assignments: [],
  created_at: FIXED_DATE,
  deleted_at: null,
  options: [],
  updated_at: FIXED_DATE,
  ...values,
})

const buildOption = (
  values: Pick<
    ProductAttributeOptionRecord,
    "definition" | "definition_id" | "id" | "key" | "label"
  >,
): ProductAttributeOptionRecord => ({
  assignments: [],
  created_at: FIXED_DATE,
  deleted_at: null,
  updated_at: FIXED_DATE,
  ...values,
})

const buildAssignment = ({
  option: relatedOption,
  ...values
}: Pick<
  ProductAttributeAssignmentRecord,
  | "definition"
  | "definition_id"
  | "deleted_at"
  | "id"
  | "option_id"
  | "product_id"
  | "text_value"
> & {
  option?: ProductAttributeOptionRecord
}): ProductAttributeAssignmentRecord => ({
  created_at: FIXED_DATE,
  option:
    relatedOption ??
    buildOption({
      definition: values.definition,
      definition_id: values.definition_id,
      id: values.option_id ?? "patopt_unlinked",
      key: "unlinked",
      label: "Unlinked",
    }),
  updated_at: FIXED_DATE,
  ...values,
})

const textDefinition = buildDefinition({
  id: "patdef_note",
  input_type: "text",
  is_public: false,
  key: "note",
  label: "Note",
})
const selectDefinition = buildDefinition({
  id: "patdef_warranty",
  input_type: "select",
  is_public: true,
  key: "warranty",
  label: "Warranty",
})
const option = buildOption({
  definition: selectDefinition,
  definition_id: selectDefinition.id,
  id: "patopt_two_years",
  key: "2-roky",
  label: "2 roky",
})
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
      }),
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
      }),
    ).toThrow(DUPLICATE_DEFINITION_ERROR)
  })
})

describe("Product Attribute set/remove reconciliation", () => {
  it("reuses a soft-deleted assignment and prepares rollback state", () => {
    const previous = buildAssignment({
      definition: selectDefinition,
      definition_id: selectDefinition.id,
      deleted_at: FIXED_DATE,
      id: "pat_existing",
      option_id: "patopt_old",
      product_id: "prod_1",
      text_value: null,
    })
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

    expect(mutations).toStrictEqual([
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
    expect(
      prepareProductAttributeAssignmentCompensation(mutations),
    ).toStrictEqual({
      created_ids: [],
      previous: [previous],
    })
  })

  it("treats removal of an already deleted assignment as a no-op", () => {
    const deleted = buildAssignment({
      definition: textDefinition,
      definition_id: textDefinition.id,
      deleted_at: FIXED_DATE,
      id: "pat_deleted",
      option_id: null,
      product_id: "prod_1",
      text_value: "old",
    })
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

    expect(
      prepareProductAttributeAssignmentCompensation(mutations),
    ).toStrictEqual({
      created_ids: [],
      previous: [],
    })
  })

  it.each([
    ["active first", false],
    ["deleted first", true],
  ])(
    "prefers the active assignment when history is returned %s",
    (_label, deletedFirst) => {
      const active = buildAssignment({
        definition: textDefinition,
        definition_id: textDefinition.id,
        deleted_at: null,
        id: "pat_active",
        option_id: null,
        product_id: "prod_1",
        text_value: "current",
      })
      const deleted = buildAssignment({
        definition: textDefinition,
        definition_id: textDefinition.id,
        deleted_at: FIXED_DATE,
        id: "pat_deleted",
        option_id: null,
        product_id: "prod_1",
        text_value: "old",
      })
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
        existingAssignments: deletedFirst
          ? [deleted, active]
          : [active, deleted],
        operations,
      })

      expect(mutations[0]?.existing).toBe(active)
    },
  )
})
