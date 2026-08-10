/**
 * Source-controlled Medusa graph ownership.
 *
 * The CLI emits the same entry-point augmentation under ignored `.medusa/types`,
 * but authored checks must remain sound before generation. The deep module target
 * is the declaration consumed by both framework Query exports and remote-query
 * helpers; augmenting a public re-export would not reach those peer instances.
 */
import type {
  ApiKeyDTO,
  CustomerDTO,
  FulfillmentDTO,
  InventoryItemDTO,
  OrderChangeDTO,
  OrderDTO,
  PaymentCollectionDTO,
  PriceDTO,
  PriceListDTO,
  ProductCategoryDTO,
  ProductCollectionDTO,
  ProductDTO,
  ProductVariantDTO,
  SalesChannelDTO,
  StoreDTO,
} from "@medusajs/framework/types"

import type { QueryCompany } from "./company/query"
import type { QueryQuote } from "./quote/query"

type QueryOrder = OrderDTO & {
  customer?: CustomerDTO | null
  fulfillments?: (FulfillmentDTO | null)[] | null
  payment_collections?: (PaymentCollectionDTO | null)[] | null
}

type QueryPrice = Omit<PriceDTO, "price_set"> & {
  price_list_id?: PriceListDTO["id"] | null
  price_set?:
    | (NonNullable<PriceDTO["price_set"]> & {
        variant?: ProductVariantDTO | null
      })
    | null
}

interface ProductSalesChannelLink {
  product_id: ProductDTO["id"]
  sales_channel_id: SalesChannelDTO["id"]
}

interface PublishableApiKeySalesChannelLink {
  publishable_key_id: ApiKeyDTO["id"]
  sales_channel_id: SalesChannelDTO["id"]
}

declare module "@medusajs/types/dist/modules-sdk/remote-query-entry-points" {
  interface RemoteQueryEntryPoints {
    companies: QueryCompany
    inventory_item: InventoryItemDTO
    order: QueryOrder
    order_change: OrderChangeDTO
    price: QueryPrice
    product: ProductDTO
    product_category: ProductCategoryDTO
    product_collection: ProductCollectionDTO
    product_sales_channel: ProductSalesChannelLink
    product_variant: ProductVariantDTO
    publishable_api_key_sales_channel: PublishableApiKeySalesChannelLink
    quote: QueryQuote
    store: StoreDTO
  }
}
