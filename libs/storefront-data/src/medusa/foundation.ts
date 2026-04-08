import { createAuthQueryKeys } from "../auth/query-keys"
import type { AuthQueryKeys } from "../auth/types"
import { createCartQueryKeys } from "../cart/query-keys"
import type { CartQueryKeys } from "../cart/types"
import { createCatalogQueryKeys } from "../catalog/query-keys"
import type { CatalogQueryKeys } from "../catalog/types"
import { createCategoryQueryKeys } from "../categories/query-keys"
import type { CategoryQueryKeys } from "../categories/types"
import { createCheckoutQueryKeys } from "../checkout/query-keys"
import type { CheckoutQueryKeys } from "../checkout/types"
import { createCollectionQueryKeys } from "../collections/query-keys"
import type { CollectionQueryKeys } from "../collections/types"
import { createCustomerQueryKeys } from "../customers/query-keys"
import type { CustomerQueryKeys } from "../customers/types"
import { createOrderQueryKeys } from "../orders/query-keys"
import type { OrderQueryKeys } from "../orders/types"
import { createProductQueryKeys } from "../products/query-keys"
import type { ProductQueryKeys } from "../products/types"
import { createRegionQueryKeys } from "../regions/query-keys"
import type { RegionQueryKeys } from "../regions/types"
import { type CacheConfig, createCacheConfig } from "../shared/cache-config"
import type { QueryNamespace } from "../shared/query-keys"
import type {
  MedusaCatalogListInput,
} from "../catalog/medusa-service"
import type {
  MedusaCategoryDetailInput,
  MedusaCategoryListInput,
} from "../categories/medusa-service"
import type { MedusaCustomerListInput } from "../customers/medusa-service"
import type {
  MedusaOrderDetailInput,
  MedusaOrderListInput,
} from "../orders/medusa-service"
import type {
  MedusaProductDetailInput,
  MedusaProductListInput,
} from "../products/medusa-service"
import type {
  MedusaRegionDetailInput,
  MedusaRegionListInput,
} from "../regions/medusa-service"
import type {
  MedusaCollectionDetailInput,
  MedusaCollectionListInput,
} from "../collections/medusa-service"

export type MedusaStorefrontQueryKeys = {
  auth: AuthQueryKeys
  cart: CartQueryKeys
  checkout: CheckoutQueryKeys
  products: ProductQueryKeys<MedusaProductListInput, MedusaProductDetailInput>
  orders: OrderQueryKeys<MedusaOrderListInput, MedusaOrderDetailInput>
  customers: CustomerQueryKeys<MedusaCustomerListInput>
  regions: RegionQueryKeys<MedusaRegionListInput, MedusaRegionDetailInput>
  categories: CategoryQueryKeys<
    MedusaCategoryListInput,
    MedusaCategoryDetailInput
  >
  collections: CollectionQueryKeys<
    MedusaCollectionListInput,
    MedusaCollectionDetailInput
  >
  catalog: CatalogQueryKeys<MedusaCatalogListInput>
}

export type MedusaStorefrontFoundationConfig = {
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
}

export function createMedusaStorefrontQueryKeys(
  namespace: QueryNamespace
): MedusaStorefrontQueryKeys {
  return {
    auth: createAuthQueryKeys(namespace),
    cart: createCartQueryKeys(namespace),
    checkout: createCheckoutQueryKeys(namespace),
    products: createProductQueryKeys<
      MedusaProductListInput,
      MedusaProductDetailInput
    >(namespace),
    orders: createOrderQueryKeys<MedusaOrderListInput, MedusaOrderDetailInput>(
      namespace
    ),
    customers: createCustomerQueryKeys<MedusaCustomerListInput>(namespace),
    regions: createRegionQueryKeys<
      MedusaRegionListInput,
      MedusaRegionDetailInput
    >(namespace),
    categories: createCategoryQueryKeys<
      MedusaCategoryListInput,
      MedusaCategoryDetailInput
    >(namespace),
    collections: createCollectionQueryKeys<
      MedusaCollectionListInput,
      MedusaCollectionDetailInput
    >(namespace),
    catalog: createCatalogQueryKeys<MedusaCatalogListInput>(namespace),
  }
}

export function resolveMedusaStorefrontFoundation(
  config: MedusaStorefrontFoundationConfig
) {
  const namespace = config.queryKeyNamespace ?? "storefront-data"
  const cacheConfig = config.cacheConfig ?? createCacheConfig()

  return {
    namespace,
    cacheConfig,
    defaultQueryKeys: createMedusaStorefrontQueryKeys(namespace),
  }
}
