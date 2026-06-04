import type {
  CreateCustomProductListDTO,
  CreateFavoriteProductListDTO,
  ProductListMetadata,
} from "../../modules/product-list/service"

export type ProductListRecord = {
  id: string
  title: string
  handle: string
  type: string
  access_type?: string
  description?: string | null
  metadata?: ProductListMetadata | null
  items?: ProductListItemRecord[]
  created_at?: string | Date
  updated_at?: string | Date
}

export type ProductListItemRecord = {
  id: string
  quantity: number
  note?: string | null
  sort_order: number
  metadata?: ProductListMetadata | null
  list_id: string
  created_at?: string | Date
  updated_at?: string | Date
}

export type CreateCustomerProductListWorkflowInput =
  | {
      customer_id: string
      type: "favorite"
      data: CreateFavoriteProductListDTO
    }
  | {
      customer_id: string
      type: "custom"
      data: CreateCustomProductListDTO
    }

export type CreateProductListItemWorkflowInput = {
  customer_id: string
  list_id: string
  product_id: string
  variant_id?: string
  quantity?: number
  note?: string | null
  sort_order?: number
  metadata?: ProductListMetadata | null
}

export type IncrementProductListItemWorkflowInput = {
  customer_id: string
  item_id: string
  quantity: number
}

export type AddFavoriteProductListItemWorkflowInput = {
  customer_id: string
  product_id: string
  variant_id?: string
  note?: string | null
  sort_order?: number
  metadata?: ProductListMetadata | null
}

export type CreatedProductListResult = {
  product_list: ProductListRecord
  created: boolean
}

export type CreatedProductListItemResult = {
  item: ProductListItemRecord
  created: boolean
}

export type AddFavoriteProductListItemWorkflowResult = {
  product_list: ProductListRecord
  item: ProductListItemRecord
}
