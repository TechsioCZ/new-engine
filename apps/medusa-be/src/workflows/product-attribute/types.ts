import type { ProductAttributeInputType } from "../../modules/product-attribute/models/product-attribute"

export interface CreateProductAttributeDefinitionInput {
  input_type: ProductAttributeInputType
  is_public?: boolean
  key: string
  label: string
}

export interface UpdateProductAttributeDefinitionInput {
  id: string
  input_type?: ProductAttributeInputType
  is_public?: boolean
  label?: string
}

export interface ProductAttributeDefinitionIdsInput {
  ids: string[]
}

export interface CreateProductAttributeOptionInput {
  definition_id: string
  key: string
  label: string
}

export interface UpdateProductAttributeOptionInput {
  id: string
  label: string
}

export interface ProductAttributeOptionIdsInput {
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

export interface SetProductAttributesInput {
  operations: SetProductAttributeOperation[]
  product_id: string
}
