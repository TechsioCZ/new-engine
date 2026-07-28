import type { ProductAttributeInputType } from "../../modules/product-attribute/models/product-attribute-definition"

export type CreateProductAttributeDefinitionInput = {
  input_type: ProductAttributeInputType
  is_public?: boolean
  key: string
  label: string
}

export type UpdateProductAttributeDefinitionInput = {
  id: string
  input_type?: ProductAttributeInputType
  is_public?: boolean
  label?: string
}

export type ProductAttributeDefinitionIdsInput = {
  ids: string[]
}

export type CreateProductAttributeOptionInput = {
  definition_id: string
  key: string
  label: string
}

export type UpdateProductAttributeOptionInput = {
  id: string
  label: string
}

export type ProductAttributeOptionIdsInput = {
  ids: string[]
}

export type SetProductAttributeOperation =
  | {
      action: "remove"
      definition_id: string
    }
  | {
      action: "set"
      definition_id: string
      option_id: string
      text_value?: never
    }
  | {
      action: "set"
      definition_id: string
      option_id?: never
      text_value: string
    }

export type SetProductAttributesInput = {
  operations: SetProductAttributeOperation[]
  product_id: string
}
