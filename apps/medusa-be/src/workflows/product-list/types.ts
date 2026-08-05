import type {
  CreateCustomProductListDTO,
  CreateFavoriteProductListDTO,
  ProductListMetadata,
  UpdateCustomProductListDTO,
  UpdateProductListItemDTO,
} from "../../modules/product-list/service"

export interface ProductListRecord {
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

export interface ProductListItemRecord {
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

export interface CreateProductListItemWorkflowInput {
  customer_id: string
  list_id: string
  product_id: string
  variant_id?: string
  quantity?: number
  note?: string | null
  sort_order?: number
  metadata?: ProductListMetadata | null
}

export interface ChangeProductListItemQuantityWorkflowInput {
  customer_id: string
  item_id: string
  quantity: number
}

export interface IncrementProductListItemWorkflowInput {
  customer_id: string
  item_id: string
  quantity: number
}

export interface UpdateProductListItemWorkflowInput {
  customer_id: string
  item_id: string
  data: UpdateProductListItemDTO
}

export interface DeleteProductListItemWorkflowInput {
  customer_id: string
  expected_list_id?: string
  item_id: string
}

export interface UpdateProductListWorkflowInput {
  customer_id: string
  list_id: string
  data: UpdateCustomProductListDTO
}

export interface DeleteProductListWorkflowInput {
  customer_id: string
  list_id: string
}

export interface CreateCartFromProductListWorkflowInput {
  country_code?: string
  customer_id: string
  email?: string
  list_id: string
  region_id?: string
  sales_channel_id?: string
}

export interface AddFavoriteProductListItemWorkflowInput {
  customer_id: string
  product_id: string
  variant_id?: string
  quantity?: number
  note?: string | null
  sort_order?: number
  metadata?: ProductListMetadata | null
}

export interface CreatedProductListResult {
  product_list: ProductListRecord
  created: boolean
}

export interface CreatedProductListItemResult {
  item: ProductListItemRecord
  created: boolean
}

export interface AddFavoriteProductListItemWorkflowResult {
  product_list: ProductListRecord
  item: ProductListItemRecord
}
