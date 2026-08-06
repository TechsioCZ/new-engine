import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"

import { createAuthHooks } from "../auth/hooks"
import type { AuthHooks, CreateAuthHooksConfig } from "../auth/hooks"
import { createMedusaAuthService } from "../auth/medusa-service"
import type {
  MedusaAuthCredentials,
  MedusaAuthServiceConfig,
  MedusaRegisterData,
  MedusaUpdateCustomerData,
} from "../auth/medusa-service"
import type { AuthQueryKeys, AuthService } from "../auth/types"
import { createCartHooks } from "../cart/hooks"
import type { CartHooks, CreateCartHooksConfig } from "../cart/hooks"
import { createMedusaCartService } from "../cart/medusa-service"
import type {
  MedusaCartAddItemParams,
  MedusaCartCreateParams,
  MedusaCartServiceConfig,
  MedusaCartUpdateItemParams,
  MedusaCartUpdateParams,
  MedusaCompleteCartResult,
} from "../cart/medusa-service"
import type {
  AddLineItemInputBase,
  CartCreateInputBase,
  CartQueryKeys,
  UpdateCartInputBase,
  UpdateLineItemInputBase,
} from "../cart/types"
import { createCatalogHooks } from "../catalog/hooks"
import type { CatalogHooks, CreateCatalogHooksConfig } from "../catalog/hooks"
import type {
  createMedusaCatalogService,
  MedusaCatalogListInput,
  MedusaCatalogServiceConfig,
} from "../catalog/medusa-service"
import type { CatalogFacets, CatalogQueryKeys } from "../catalog/types"
import { createCategoryHooks } from "../categories/hooks"
import type {
  CategoryHooks,
  CreateCategoryHooksConfig,
} from "../categories/hooks"
import type {
  createMedusaCategoryService,
  MedusaCategoryDetailInput,
  MedusaCategoryListInput,
  MedusaCategoryServiceConfig,
} from "../categories/medusa-service"
import type { CategoryQueryKeys } from "../categories/types"
import { createCheckoutHooks } from "../checkout/hooks"
import type {
  CheckoutHooks,
  CreateCheckoutHooksConfig,
} from "../checkout/hooks"
import { createMedusaCheckoutService } from "../checkout/medusa-service"
import type { MedusaCheckoutServiceConfig } from "../checkout/medusa-service"
import type { CheckoutQueryKeys } from "../checkout/types"
import { createCollectionHooks } from "../collections/hooks"
import type {
  CollectionHooks,
  CreateCollectionHooksConfig,
} from "../collections/hooks"
import type {
  createMedusaCollectionService,
  MedusaCollectionDetailInput,
  MedusaCollectionListInput,
  MedusaCollectionServiceConfig,
} from "../collections/medusa-service"
import type { CollectionQueryKeys } from "../collections/types"
import { createCustomerHooks } from "../customers/hooks"
import type {
  CreateCustomerHooksConfig,
  CustomerHooks,
} from "../customers/hooks"
import {
  createMedusaCustomerService,
  decodeMedusaCustomerAddressInput,
} from "../customers/medusa-service"
import type {
  MedusaCustomerAddressCreateInput,
  MedusaCustomerAddressUpdateInput,
  MedusaCustomerListInput,
  MedusaCustomerProfileUpdateInput,
} from "../customers/medusa-service"
import type {
  CustomerAddressAdapter,
  CustomerAddressCreateInputBase,
  CustomerAddressUpdateInputBase,
  CustomerQueryKeys,
  CustomerService,
} from "../customers/types"
import { createOrderHooks } from "../orders/hooks"
import type { CreateOrderHooksConfig, OrderHooks } from "../orders/hooks"
import type {
  MedusaOrderDetailHookInput,
  MedusaOrderDetailInput,
  MedusaOrderListHookInput,
  MedusaOrderListInput,
  MedusaOrderServiceConfig,
} from "../orders/medusa-service"
import type { OrderQueryKeys, OrderService } from "../orders/types"
import { createProductAttributeHooks } from "../product-attributes/hooks"
import type {
  CreateProductAttributeHooksConfig,
  ProductAttributeHooks,
} from "../product-attributes/hooks"
import type {
  MedusaProductAttributeServiceConfig,
  MedusaProductAttributesInput,
} from "../product-attributes/medusa-service"
import type {
  ProductAttribute,
  ProductAttributeQueryKeys,
  ProductAttributeService,
} from "../product-attributes/types"
import { createProductListHooks } from "../product-lists/hooks"
import type {
  CreateProductListHooksConfig,
  ProductListHooks,
} from "../product-lists/hooks"
import {
  createDefaultListParams,
  stripDetailInput,
  withCustomerScope,
} from "../product-lists/input-utils"
import type {
  MedusaProductListDetailHookInput,
  MedusaProductListDetailInput,
  MedusaProductListDetailKeyInput,
  MedusaProductListListHookInput,
  MedusaProductListListInput,
  MedusaProductListListKeyInput,
  MedusaProductListServiceConfig,
} from "../product-lists/medusa-service"
import type {
  ProductListBase,
  ProductListItemBase,
  ProductListQueryKeys,
  ProductListService,
} from "../product-lists/types"
import { createProductLocationAvailabilityHooks } from "../product-location-availability/hooks"
import type {
  CreateProductLocationAvailabilityHooksConfig,
  ProductLocationAvailabilityHooks,
} from "../product-location-availability/hooks"
import type {
  MedusaProductLocationAvailabilityInput,
  MedusaProductLocationAvailabilityServiceConfig,
} from "../product-location-availability/medusa-service"
import type {
  ProductLocationAvailabilityQueryKeys,
  ProductLocationAvailabilityResponse,
  ProductLocationAvailabilityService,
} from "../product-location-availability/types"
import { createProductHooks } from "../products/hooks"
import type { CreateProductHooksConfig, ProductHooks } from "../products/hooks"
import type {
  createMedusaProductService,
  MedusaProductDetailInput,
  MedusaProductListInput,
  MedusaProductServiceConfig,
} from "../products/medusa-service"
import type { ProductQueryKeys } from "../products/types"
import { createRegionHooks } from "../regions/hooks"
import type { CreateRegionHooksConfig, RegionHooks } from "../regions/hooks"
import type {
  createMedusaRegionService,
  MedusaRegionDetailInput,
  MedusaRegionListInput,
} from "../regions/medusa-service"
import type { RegionQueryKeys } from "../regions/types"
import { createProductReviewHooks } from "../reviews/hooks"
import type {
  CreateProductReviewHooksConfig,
  ProductReviewHooks,
} from "../reviews/hooks"
import type {
  MedusaProductReviewListInput,
  MedusaProductReviewServiceConfig,
} from "../reviews/medusa-service"
import type {
  ProductReviewQueryKeys,
  ProductReviewService,
  ReviewBase,
} from "../reviews/types"
import type { CacheConfig } from "../shared/cache-config"
import type { ActiveCartQueryKeyMatcher } from "../shared/cart-cache-sync"
import type { QueryNamespace } from "../shared/query-keys"
import { createMedusaCartFlow } from "./cart-flow"
import {
  createMedusaCheckoutFlow,
  decodeMedusaStoreCart,
} from "./checkout-flow"
import { resolveMedusaStorefrontFoundation } from "./foundation"
import type { MedusaStorefrontQueryKeys as MedusaStorefrontQueryKeysFromFoundation } from "./foundation"
import { createMedusaStorefrontServerReadPreset } from "./server-read"

type OmitFactoryConfig<TConfig> = Omit<
  TConfig,
  "service" | "queryKeys" | "queryKeyNamespace" | "cacheConfig"
>

type MedusaAuthHooksConfig = OmitFactoryConfig<
  CreateAuthHooksConfig<
    HttpTypes.StoreCustomer,
    MedusaAuthCredentials,
    MedusaRegisterData,
    MedusaUpdateCustomerData,
    unknown,
    string,
    string
  >
>

type MedusaAuthService = AuthService<
  HttpTypes.StoreCustomer,
  MedusaAuthCredentials,
  MedusaRegisterData,
  MedusaUpdateCustomerData,
  unknown,
  string,
  string
>

type MedusaCartHooksConfig<TAddressInput, TAddressPayload> = Omit<
  OmitFactoryConfig<
    CreateCartHooksConfig<
      HttpTypes.StoreCart,
      CartCreateInputBase,
      MedusaCartCreateParams,
      UpdateCartInputBase,
      MedusaCartUpdateParams,
      AddLineItemInputBase,
      MedusaCartAddItemParams,
      UpdateLineItemInputBase,
      MedusaCartUpdateItemParams,
      MedusaCompleteCartResult,
      TAddressInput,
      TAddressPayload
    >
  >,
  "buildAddParams"
> & {
  /**
   * Optional in preset config: Medusa default mapper is provided internally.
   */
  buildAddParams?: (input: AddLineItemInputBase) => MedusaCartAddItemParams
}

interface MedusaCartFlowConfig {
  isActiveCartQueryKey?: ActiveCartQueryKeyMatcher
}

type MedusaCheckoutHooksConfig = Omit<
  OmitFactoryConfig<
    CreateCheckoutHooksConfig<
      HttpTypes.StoreCart,
      HttpTypes.StoreCartShippingOption,
      HttpTypes.StorePaymentProvider,
      HttpTypes.StorePaymentCollection,
      HttpTypes.StoreCompleteCartResponse
    >
  >,
  "cartQueryKeys" | "decodeCart"
>

type MedusaProductHooksConfig<TProduct> = OmitFactoryConfig<
  CreateProductHooksConfig<
    TProduct,
    MedusaProductListInput,
    MedusaProductListInput,
    MedusaProductDetailInput,
    MedusaProductDetailInput
  >
>

type MedusaProductListHookBuilderConfig = Pick<
  CreateProductListHooksConfig<
    ProductListBase,
    ProductListItemBase,
    HttpTypes.StoreCart,
    MedusaProductListListHookInput,
    MedusaProductListListInput,
    MedusaProductListDetailHookInput,
    MedusaProductListDetailInput,
    MedusaProductListListKeyInput,
    MedusaProductListDetailKeyInput
  >,
  | "buildListParams"
  | "buildDetailParams"
  | "buildListKeyParams"
  | "buildDetailKeyParams"
>

type MedusaProductListHooksConfig = Omit<
  OmitFactoryConfig<
    CreateProductListHooksConfig<
      ProductListBase,
      ProductListItemBase,
      HttpTypes.StoreCart,
      MedusaProductListListHookInput,
      MedusaProductListListInput,
      MedusaProductListDetailHookInput,
      MedusaProductListDetailInput,
      MedusaProductListListKeyInput,
      MedusaProductListDetailKeyInput
    >
  >,
  | "cartQueryKeys"
  | "cartStorage"
  | "isActiveCartQueryKey"
  | keyof MedusaProductListHookBuilderConfig
> &
  Partial<MedusaProductListHookBuilderConfig>

type MedusaProductReviewHooksConfig = OmitFactoryConfig<
  CreateProductReviewHooksConfig<
    ReviewBase,
    MedusaProductReviewListInput,
    MedusaProductReviewListInput
  >
>

type MedusaProductAttributeHooksConfig = OmitFactoryConfig<
  CreateProductAttributeHooksConfig<
    ProductAttribute,
    MedusaProductAttributesInput,
    MedusaProductAttributesInput
  >
>

type MedusaProductLocationAvailabilityHooksConfig = OmitFactoryConfig<
  CreateProductLocationAvailabilityHooksConfig<
    ProductLocationAvailabilityResponse,
    MedusaProductLocationAvailabilityInput,
    MedusaProductLocationAvailabilityInput
  >
>

type MedusaOrderHooksConfig = OmitFactoryConfig<
  CreateOrderHooksConfig<
    HttpTypes.StoreOrder,
    MedusaOrderListHookInput,
    MedusaOrderListInput,
    MedusaOrderDetailHookInput,
    MedusaOrderDetailInput
  >
>

type MedusaOrderService = OrderService<
  HttpTypes.StoreOrder,
  MedusaOrderListInput,
  MedusaOrderDetailInput
>

type MedusaProductListService = ProductListService<
  ProductListBase,
  ProductListItemBase,
  HttpTypes.StoreCart,
  MedusaProductListListInput,
  MedusaProductListDetailInput
>

type MedusaProductReviewService = ProductReviewService<
  ReviewBase,
  MedusaProductReviewListInput
>

type MedusaProductAttributeService = ProductAttributeService<
  ProductAttribute,
  MedusaProductAttributesInput
>

type MedusaProductLocationAvailabilityService =
  ProductLocationAvailabilityService<
    ProductLocationAvailabilityResponse,
    MedusaProductLocationAvailabilityInput
  >

type MedusaCustomerAddressUpdateHookInput = MedusaCustomerAddressUpdateInput & {
  addressId?: string
}

type MedusaCustomerHooksConfig<
  TCreateInput extends CustomerAddressCreateInputBase,
  TUpdateInput extends CustomerAddressUpdateInputBase,
> = Omit<
  OmitFactoryConfig<
    CreateCustomerHooksConfig<
      HttpTypes.StoreCustomer,
      HttpTypes.StoreCustomerAddress,
      MedusaCustomerListInput,
      MedusaCustomerListInput,
      TCreateInput,
      MedusaCustomerAddressCreateInput,
      TUpdateInput,
      MedusaCustomerAddressUpdateInput,
      MedusaCustomerProfileUpdateInput,
      MedusaCustomerProfileUpdateInput
    >
  >,
  "addressAdapter" | "buildListParams" | "buildUpdateCustomerParams"
> & {
  addressAdapter?: CustomerAddressAdapter<
    TCreateInput,
    MedusaCustomerAddressCreateInput,
    TUpdateInput,
    MedusaCustomerAddressUpdateInput
  >
  buildListParams?: (input: MedusaCustomerListInput) => MedusaCustomerListInput
  buildUpdateCustomerParams?: (
    input: MedusaCustomerProfileUpdateInput,
  ) => MedusaCustomerProfileUpdateInput
}

type MedusaCustomerService = CustomerService<
  HttpTypes.StoreCustomer,
  HttpTypes.StoreCustomerAddress,
  MedusaCustomerListInput,
  MedusaCustomerAddressCreateInput,
  MedusaCustomerAddressUpdateInput,
  MedusaCustomerProfileUpdateInput
>

type MedusaRegionHooksConfig = OmitFactoryConfig<
  CreateRegionHooksConfig<
    HttpTypes.StoreRegion,
    MedusaRegionListInput,
    MedusaRegionListInput,
    MedusaRegionDetailInput,
    MedusaRegionDetailInput
  >
>

type MedusaCategoryHooksConfig<TCategory> = OmitFactoryConfig<
  CreateCategoryHooksConfig<
    TCategory,
    MedusaCategoryListInput,
    MedusaCategoryListInput,
    MedusaCategoryDetailInput,
    MedusaCategoryDetailInput
  >
>

type MedusaCollectionHooksConfig<TCollection> = OmitFactoryConfig<
  CreateCollectionHooksConfig<
    TCollection,
    MedusaCollectionListInput,
    MedusaCollectionListInput,
    MedusaCollectionDetailInput,
    MedusaCollectionDetailInput
  >
>

type MedusaCatalogHooksConfig<TProduct, TFacets> = Omit<
  CreateCatalogHooksConfig<
    TProduct,
    MedusaCatalogListInput,
    MedusaCatalogListInput,
    TFacets
  >,
  | "service"
  | "queryKeys"
  | "queryKeyNamespace"
  | "cacheConfig"
  | "fallbackFacets"
>

type IsExactly<TLeft, TRight> = [TLeft] extends [TRight]
  ? [TRight] extends [TLeft]
    ? true
    : false
  : false

interface MedusaCatalogPresetConfig<TProduct, TFacets> {
  serviceConfig?: MedusaCatalogServiceConfig<
    TProduct,
    MedusaCatalogListInput,
    TFacets
  >
  hooks?: MedusaCatalogHooksConfig<TProduct, TFacets>
  queryKeys?: CatalogQueryKeys<MedusaCatalogListInput>
}

type MedusaCatalogPresetOption<TProduct, TFacets> =
  IsExactly<TFacets, CatalogFacets> extends true
    ? {
        catalog?: MedusaCatalogPresetConfig<TProduct, TFacets> & {
          fallbackFacets?: TFacets
        }
      }
    : {
        catalog: MedusaCatalogPresetConfig<TProduct, TFacets> & {
          fallbackFacets: TFacets
        }
      }

interface CreateMedusaStorefrontPresetConfigBase<
  TProduct = HttpTypes.StoreProduct,
  TCategory = HttpTypes.StoreProductCategory,
  TCollection = HttpTypes.StoreCollection,
  TCartAddressInput = Record<string, unknown>,
  TCartAddressPayload = Record<string, unknown>,
  TCustomerAddressCreateInput extends CustomerAddressCreateInputBase =
    MedusaCustomerAddressCreateInput,
  TCustomerAddressUpdateInput extends CustomerAddressUpdateInputBase =
    MedusaCustomerAddressUpdateHookInput,
> {
  sdk: Medusa
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
  auth?: {
    service?: MedusaAuthService
    serviceConfig?: MedusaAuthServiceConfig
    hooks?: MedusaAuthHooksConfig
    queryKeys?: AuthQueryKeys
  }
  cart?: {
    serviceConfig?: MedusaCartServiceConfig
    hooks?: MedusaCartHooksConfig<TCartAddressInput, TCartAddressPayload>
    queryKeys?: CartQueryKeys
    flow?: MedusaCartFlowConfig
  }
  checkout?: {
    serviceConfig?: MedusaCheckoutServiceConfig
    hooks?: MedusaCheckoutHooksConfig
    queryKeys?: CheckoutQueryKeys
  }
  products?: {
    serviceConfig?: MedusaProductServiceConfig<
      TProduct,
      MedusaProductListInput,
      MedusaProductDetailInput
    >
    hooks?: MedusaProductHooksConfig<TProduct>
    queryKeys?: ProductQueryKeys<
      MedusaProductListInput,
      MedusaProductDetailInput
    >
  }
  productLists?: {
    service?: MedusaProductListService
    serviceConfig?: MedusaProductListServiceConfig<
      ProductListBase,
      ProductListItemBase,
      HttpTypes.StoreCart
    >
    hooks?: MedusaProductListHooksConfig
    queryKeys?: ProductListQueryKeys<
      MedusaProductListListKeyInput,
      MedusaProductListDetailKeyInput
    >
  }
  productAttributes?: {
    service?: MedusaProductAttributeService
    serviceConfig?: MedusaProductAttributeServiceConfig
    hooks?: MedusaProductAttributeHooksConfig
    queryKeys?: ProductAttributeQueryKeys<MedusaProductAttributesInput>
  }
  productLocationAvailability?: {
    service?: MedusaProductLocationAvailabilityService
    serviceConfig?: MedusaProductLocationAvailabilityServiceConfig
    hooks?: MedusaProductLocationAvailabilityHooksConfig
    queryKeys?: ProductLocationAvailabilityQueryKeys<MedusaProductLocationAvailabilityInput>
  }
  reviews?: {
    service?: MedusaProductReviewService
    serviceConfig?: MedusaProductReviewServiceConfig<ReviewBase>
    hooks?: MedusaProductReviewHooksConfig
    queryKeys?: ProductReviewQueryKeys<MedusaProductReviewListInput>
  }
  orders?: {
    service?: MedusaOrderService
    serviceConfig?: MedusaOrderServiceConfig
    hooks?: MedusaOrderHooksConfig
    queryKeys?: OrderQueryKeys<MedusaOrderListInput, MedusaOrderDetailInput>
  }
  customers?: {
    service?: MedusaCustomerService
    hooks?: MedusaCustomerHooksConfig<
      TCustomerAddressCreateInput,
      TCustomerAddressUpdateInput
    >
    queryKeys?: CustomerQueryKeys<MedusaCustomerListInput>
  }
  regions?: {
    hooks?: MedusaRegionHooksConfig
    queryKeys?: RegionQueryKeys<MedusaRegionListInput, MedusaRegionDetailInput>
  }
  categories?: {
    serviceConfig?: MedusaCategoryServiceConfig<
      TCategory,
      MedusaCategoryListInput,
      MedusaCategoryDetailInput
    >
    hooks?: MedusaCategoryHooksConfig<TCategory>
    queryKeys?: CategoryQueryKeys<
      MedusaCategoryListInput,
      MedusaCategoryDetailInput
    >
  }
  collections?: {
    serviceConfig?: MedusaCollectionServiceConfig<
      TCollection,
      MedusaCollectionListInput,
      MedusaCollectionDetailInput
    >
    hooks?: MedusaCollectionHooksConfig<TCollection>
    queryKeys?: CollectionQueryKeys<
      MedusaCollectionListInput,
      MedusaCollectionDetailInput
    >
  }
}

export type CreateMedusaStorefrontPresetConfig<
  TProduct = HttpTypes.StoreProduct,
  TCategory = HttpTypes.StoreProductCategory,
  TCollection = HttpTypes.StoreCollection,
  TCatalogProduct = HttpTypes.StoreProduct,
  TCatalogFacets = CatalogFacets,
  TCartAddressInput = Record<string, unknown>,
  TCartAddressPayload = Record<string, unknown>,
  TCustomerAddressCreateInput extends CustomerAddressCreateInputBase =
    MedusaCustomerAddressCreateInput,
  TCustomerAddressUpdateInput extends CustomerAddressUpdateInputBase =
    MedusaCustomerAddressUpdateHookInput,
> = CreateMedusaStorefrontPresetConfigBase<
  TProduct,
  TCategory,
  TCollection,
  TCartAddressInput,
  TCartAddressPayload,
  TCustomerAddressCreateInput,
  TCustomerAddressUpdateInput
> &
  MedusaCatalogPresetOption<TCatalogProduct, TCatalogFacets>

interface MedusaStorefrontServices<
  TProduct,
  TCategory,
  TCollection,
  TCatalogProduct,
  TCatalogFacets,
> {
  auth: MedusaAuthService
  cart: ReturnType<typeof createMedusaCartService>
  checkout: ReturnType<typeof createMedusaCheckoutService>
  products: ReturnType<
    typeof createMedusaProductService<
      TProduct,
      MedusaProductListInput,
      MedusaProductDetailInput
    >
  >
  productLists: MedusaProductListService
  productAttributes: MedusaProductAttributeService
  productLocationAvailability: MedusaProductLocationAvailabilityService
  reviews: MedusaProductReviewService
  orders: MedusaOrderService
  customers: MedusaCustomerService
  regions: ReturnType<typeof createMedusaRegionService>
  categories: ReturnType<
    typeof createMedusaCategoryService<
      TCategory,
      MedusaCategoryListInput,
      MedusaCategoryDetailInput
    >
  >
  collections: ReturnType<
    typeof createMedusaCollectionService<
      TCollection,
      MedusaCollectionListInput,
      MedusaCollectionDetailInput
    >
  >
  catalog: ReturnType<
    typeof createMedusaCatalogService<
      TCatalogProduct,
      MedusaCatalogListInput,
      TCatalogFacets
    >
  >
}

interface MedusaStorefrontHooks<
  TProduct,
  TCategory,
  TCollection,
  TCatalogProduct,
  TCatalogFacets,
  TCartAddressInput,
  TCartAddressPayload,
  TCustomerAddressCreateInput extends CustomerAddressCreateInputBase,
  TCustomerAddressUpdateInput extends CustomerAddressUpdateInputBase,
> {
  auth: AuthHooks<
    HttpTypes.StoreCustomer,
    MedusaAuthCredentials,
    MedusaRegisterData,
    MedusaUpdateCustomerData,
    unknown,
    string,
    string
  >
  cart: CartHooks<
    HttpTypes.StoreCart,
    CartCreateInputBase,
    MedusaCartCreateParams,
    UpdateCartInputBase,
    MedusaCartUpdateParams,
    AddLineItemInputBase,
    MedusaCartAddItemParams,
    UpdateLineItemInputBase,
    MedusaCartUpdateItemParams,
    MedusaCompleteCartResult,
    TCartAddressInput,
    TCartAddressPayload
  >
  checkout: CheckoutHooks<
    HttpTypes.StoreCart,
    HttpTypes.StoreCartShippingOption,
    HttpTypes.StorePaymentProvider,
    HttpTypes.StorePaymentCollection,
    HttpTypes.StoreCompleteCartResponse
  >
  products: ProductHooks<
    TProduct,
    MedusaProductListInput,
    MedusaProductDetailInput
  >
  productLists: ProductListHooks<
    ProductListBase,
    ProductListItemBase,
    HttpTypes.StoreCart,
    MedusaProductListListHookInput,
    MedusaProductListDetailHookInput
  >
  productAttributes: ProductAttributeHooks<
    ProductAttribute,
    MedusaProductAttributesInput
  >
  productLocationAvailability: ProductLocationAvailabilityHooks<
    ProductLocationAvailabilityResponse,
    MedusaProductLocationAvailabilityInput
  >
  reviews: ProductReviewHooks<
    ReviewBase,
    MedusaProductReviewListInput,
    MedusaProductReviewListInput
  >
  orders: OrderHooks<
    HttpTypes.StoreOrder,
    MedusaOrderListHookInput,
    MedusaOrderDetailHookInput
  >
  customers: CustomerHooks<
    HttpTypes.StoreCustomer,
    HttpTypes.StoreCustomerAddress,
    MedusaCustomerListInput,
    MedusaCustomerListInput,
    TCustomerAddressCreateInput,
    MedusaCustomerAddressCreateInput,
    TCustomerAddressUpdateInput,
    MedusaCustomerAddressUpdateInput,
    MedusaCustomerProfileUpdateInput,
    MedusaCustomerProfileUpdateInput
  >
  regions: RegionHooks<
    HttpTypes.StoreRegion,
    MedusaRegionListInput,
    MedusaRegionListInput,
    MedusaRegionDetailInput,
    MedusaRegionDetailInput
  >
  categories: CategoryHooks<
    TCategory,
    MedusaCategoryListInput,
    MedusaCategoryListInput,
    MedusaCategoryDetailInput,
    MedusaCategoryDetailInput
  >
  collections: CollectionHooks<
    TCollection,
    MedusaCollectionListInput,
    MedusaCollectionListInput,
    MedusaCollectionDetailInput,
    MedusaCollectionDetailInput
  >
  catalog: CatalogHooks<
    TCatalogProduct,
    MedusaCatalogListInput,
    MedusaCatalogListInput,
    TCatalogFacets
  >
}

interface MedusaStorefrontPresetResult<
  TProduct,
  TCategory,
  TCollection,
  TCatalogProduct,
  TCatalogFacets,
  TCartAddressInput,
  TCartAddressPayload,
  TCustomerAddressCreateInput extends CustomerAddressCreateInputBase,
  TCustomerAddressUpdateInput extends CustomerAddressUpdateInputBase,
> {
  namespace: QueryNamespace
  cacheConfig: CacheConfig
  queryKeys: MedusaStorefrontQueryKeys
  services: MedusaStorefrontServices<
    TProduct,
    TCategory,
    TCollection,
    TCatalogProduct,
    TCatalogFacets
  >
  hooks: MedusaStorefrontHooks<
    TProduct,
    TCategory,
    TCollection,
    TCatalogProduct,
    TCatalogFacets,
    TCartAddressInput,
    TCartAddressPayload,
    TCustomerAddressCreateInput,
    TCustomerAddressUpdateInput
  >
  flows: {
    cart: ReturnType<typeof createMedusaCartFlow>
    checkout: ReturnType<typeof createMedusaCheckoutFlow>
  }
}

const createDefaultCatalogFacets = (): CatalogFacets => ({
  brand: [],
  form: [],
  ingredient: [],
  price: {
    max: null,
    min: null,
  },
  status: [],
})

const buildMedusaAddLineItemParams = (
  input: AddLineItemInputBase,
): MedusaCartAddItemParams => ({
  quantity: input.quantity ?? 1,
  variant_id: input.variantId,
  ...(input.metadata ? { metadata: input.metadata } : {}),
})

export { createMedusaStorefrontQueryKeys } from "./foundation"

export type MedusaStorefrontQueryKeys = MedusaStorefrontQueryKeysFromFoundation

/**
 * Create a complete Medusa storefront data preset with shared namespace/cache config.
 *
 * This factory intentionally wires query keys/services/hooks for every domain in one
 * place so applications can keep only thin customer-specific override modules.
 */
export const createMedusaStorefrontPreset = <
  TProduct = HttpTypes.StoreProduct,
  TCategory = HttpTypes.StoreProductCategory,
  TCollection = HttpTypes.StoreCollection,
  TCatalogProduct = HttpTypes.StoreProduct,
  TCatalogFacets = CatalogFacets,
  TCartAddressInput = Record<string, unknown>,
  TCartAddressPayload = Record<string, unknown>,
  TCustomerAddressCreateInput extends CustomerAddressCreateInputBase =
    MedusaCustomerAddressCreateInput,
  TCustomerAddressUpdateInput extends CustomerAddressUpdateInputBase =
    MedusaCustomerAddressUpdateHookInput,
>(
  config: CreateMedusaStorefrontPresetConfig<
    TProduct,
    TCategory,
    TCollection,
    TCatalogProduct,
    TCatalogFacets,
    TCartAddressInput,
    TCartAddressPayload,
    TCustomerAddressCreateInput,
    TCustomerAddressUpdateInput
  >,
): MedusaStorefrontPresetResult<
  TProduct,
  TCategory,
  TCollection,
  TCatalogProduct,
  TCatalogFacets | CatalogFacets,
  TCartAddressInput,
  TCartAddressPayload,
  TCustomerAddressCreateInput,
  TCustomerAddressUpdateInput
> => {
  const {
    namespace,
    cacheConfig: resolvedCacheConfig,
    defaultQueryKeys,
  } = resolveMedusaStorefrontFoundation(config)

  const resolveCoreQueryKeys = () => ({
    auth: config.auth?.queryKeys ?? defaultQueryKeys.auth,
    cart: config.cart?.queryKeys ?? defaultQueryKeys.cart,
    catalog: config.catalog?.queryKeys ?? defaultQueryKeys.catalog,
    categories: config.categories?.queryKeys ?? defaultQueryKeys.categories,
    checkout: config.checkout?.queryKeys ?? defaultQueryKeys.checkout,
    collections: config.collections?.queryKeys ?? defaultQueryKeys.collections,
    customers: config.customers?.queryKeys ?? defaultQueryKeys.customers,
  })
  const resolveProductQueryKeys = () => ({
    orders: config.orders?.queryKeys ?? defaultQueryKeys.orders,
    productAttributes:
      config.productAttributes?.queryKeys ?? defaultQueryKeys.productAttributes,
    productLists:
      config.productLists?.queryKeys ?? defaultQueryKeys.productLists,
    productLocationAvailability:
      config.productLocationAvailability?.queryKeys ??
      defaultQueryKeys.productLocationAvailability,
    products: config.products?.queryKeys ?? defaultQueryKeys.products,
    regions: config.regions?.queryKeys ?? defaultQueryKeys.regions,
    reviews: config.reviews?.queryKeys ?? defaultQueryKeys.reviews,
  })
  const queryKeys = {
    ...resolveCoreQueryKeys(),
    ...resolveProductQueryKeys(),
  }

  const resolveServerReadCatalogConfig = () => ({
    catalog: {
      hooks: config.catalog?.hooks,
      queryKeys: queryKeys.catalog,
      serviceConfig: config.catalog?.serviceConfig,
    },
    categories: {
      hooks: config.categories?.hooks,
      queryKeys: queryKeys.categories,
      serviceConfig: config.categories?.serviceConfig,
    },
    collections: {
      hooks: config.collections?.hooks,
      queryKeys: queryKeys.collections,
      serviceConfig: config.collections?.serviceConfig,
    },
    orders: {
      hooks: config.orders?.hooks,
      queryKeys: queryKeys.orders,
      service: config.orders?.service,
      serviceConfig: config.orders?.serviceConfig,
    },
  })
  const resolveServerReadProductConfig = () => ({
    productAttributes: {
      hooks: config.productAttributes?.hooks,
      queryKeys: queryKeys.productAttributes,
      service: config.productAttributes?.service,
      serviceConfig: config.productAttributes?.serviceConfig,
    },
    productLists: {
      hooks: config.productLists?.hooks,
      queryKeys: queryKeys.productLists,
      service: config.productLists?.service,
      serviceConfig: config.productLists?.serviceConfig,
    },
    productLocationAvailability: {
      queryKeys: queryKeys.productLocationAvailability,
      service: config.productLocationAvailability?.service,
      serviceConfig: config.productLocationAvailability?.serviceConfig,
    },
    products: {
      hooks: config.products?.hooks,
      queryKeys: queryKeys.products,
      serviceConfig: config.products?.serviceConfig,
    },
    regions: {
      hooks: config.regions?.hooks,
      queryKeys: queryKeys.regions,
    },
    reviews: {
      hooks: config.reviews?.hooks,
      queryKeys: queryKeys.reviews,
      service: config.reviews?.service,
      serviceConfig: config.reviews?.serviceConfig,
    },
  })
  const serverRead = createMedusaStorefrontServerReadPreset<
    TProduct,
    TCategory,
    TCollection,
    TCatalogProduct,
    TCatalogFacets
  >({
    ...resolveServerReadCatalogConfig(),
    ...resolveServerReadProductConfig(),
    cacheConfig: resolvedCacheConfig,
    queryKeyNamespace: namespace,
    sdk: config.sdk,
  })

  const resolveServices = () => ({
    auth:
      config.auth?.service ??
      createMedusaAuthService(config.sdk, config.auth?.serviceConfig),
    cart: createMedusaCartService(config.sdk, config.cart?.serviceConfig),
    catalog: serverRead.services.catalog,
    categories: serverRead.services.categories,
    checkout: createMedusaCheckoutService(
      config.sdk,
      config.checkout?.serviceConfig,
    ),
    collections: serverRead.services.collections,
    customers:
      config.customers?.service ?? createMedusaCustomerService(config.sdk),
    orders: serverRead.services.orders,
    productAttributes: serverRead.services.productAttributes,
    productLists: serverRead.services.productLists,
    productLocationAvailability:
      serverRead.services.productLocationAvailability,
    products: serverRead.services.products,
    regions: serverRead.services.regions,
    reviews: serverRead.services.reviews,
  })
  const services = resolveServices()

  const authHookOverrides = config.auth?.hooks
  const authInvalidationOverrides = authHookOverrides?.invalidateOnAuthChange
  const cartHookOverrides = config.cart?.hooks
  const cartFlowOverrides = config.cart?.flow
  const checkoutHookOverrides = config.checkout?.hooks
  const customerHookOverrides = config.customers?.hooks
  const resolvedCheckoutActiveCartQueryKey =
    checkoutHookOverrides?.isActiveCartQueryKey ??
    cartFlowOverrides?.isActiveCartQueryKey

  const resolveAuthInvalidateOnAuthChange = () => {
    const presetAuthInvalidateKeys = [
      queryKeys.customers.all(),
      queryKeys.orders.all(),
      queryKeys.productLists.all(),
    ]
    const presetAuthRemoveOnLogoutKeys = [
      queryKeys.customers.all(),
      queryKeys.orders.all(),
      queryKeys.productLists.all(),
    ]
    return {
      includeDefaults: authInvalidationOverrides?.includeDefaults ?? false,
      invalidate: [
        ...presetAuthInvalidateKeys,
        ...(authInvalidationOverrides?.invalidate ?? []),
      ],
      removeOnLogout: [
        ...presetAuthRemoveOnLogoutKeys,
        ...(authInvalidationOverrides?.removeOnLogout ?? []),
      ],
    }
  }
  const resolvedAuthInvalidateOnAuthChange = resolveAuthInvalidateOnAuthChange()

  const fallbackCatalogFacets =
    config.catalog?.fallbackFacets ?? createDefaultCatalogFacets()
  // flat declarative hook assembly; each domain adds one independent object property.
  const createCoreHooks = () => ({
    auth: createAuthHooks({
      ...authHookOverrides,
      cacheConfig: resolvedCacheConfig,
      invalidateOnAuthChange: resolvedAuthInvalidateOnAuthChange,
      queryKeyNamespace: namespace,
      queryKeys: queryKeys.auth,
      service: services.auth,
    }),
    cart: createCartHooks<
      HttpTypes.StoreCart,
      CartCreateInputBase,
      MedusaCartCreateParams,
      UpdateCartInputBase,
      MedusaCartUpdateParams,
      AddLineItemInputBase,
      MedusaCartAddItemParams,
      UpdateLineItemInputBase,
      MedusaCartUpdateItemParams,
      MedusaCompleteCartResult,
      TCartAddressInput,
      TCartAddressPayload
    >({
      ...cartHookOverrides,
      buildAddParams:
        cartHookOverrides?.buildAddParams ?? buildMedusaAddLineItemParams,
      cacheConfig: resolvedCacheConfig,
      queryKeyNamespace: namespace,
      queryKeys: queryKeys.cart,
      service: services.cart,
    }),
    catalog: createCatalogHooks<
      TCatalogProduct,
      MedusaCatalogListInput,
      MedusaCatalogListInput,
      TCatalogFacets | CatalogFacets
    >({
      ...config.catalog?.hooks,
      cacheConfig: resolvedCacheConfig,
      fallbackFacets: fallbackCatalogFacets,
      queryKeyNamespace: namespace,
      queryKeys: queryKeys.catalog,
      service: services.catalog,
    }),
    categories: createCategoryHooks({
      ...config.categories?.hooks,
      cacheConfig: resolvedCacheConfig,
      queryKeyNamespace: namespace,
      queryKeys: queryKeys.categories,
      service: services.categories,
    }),
    checkout: createCheckoutHooks({
      ...checkoutHookOverrides,
      cacheConfig: resolvedCacheConfig,
      cartQueryKeys: queryKeys.cart,
      decodeCart: decodeMedusaStoreCart,
      isActiveCartQueryKey: resolvedCheckoutActiveCartQueryKey,
      queryKeyNamespace: namespace,
      queryKeys: queryKeys.checkout,
      service: services.checkout,
    }),
    collections: createCollectionHooks({
      ...config.collections?.hooks,
      cacheConfig: resolvedCacheConfig,
      queryKeyNamespace: namespace,
      queryKeys: queryKeys.collections,
      service: services.collections,
    }),
  })
  const createCustomerAndOrderHooks = () => ({
    customers: createCustomerHooks<
      HttpTypes.StoreCustomer,
      HttpTypes.StoreCustomerAddress,
      MedusaCustomerListInput,
      MedusaCustomerListInput,
      TCustomerAddressCreateInput,
      MedusaCustomerAddressCreateInput,
      TCustomerAddressUpdateInput,
      MedusaCustomerAddressUpdateInput,
      MedusaCustomerProfileUpdateInput,
      MedusaCustomerProfileUpdateInput
    >({
      ...customerHookOverrides,
      addressAdapter: {
        ...customerHookOverrides?.addressAdapter,
        toCreateParams:
          customerHookOverrides?.addressAdapter?.toCreateParams ??
          ((input) => decodeMedusaCustomerAddressInput(input)),
        toUpdateParams:
          customerHookOverrides?.addressAdapter?.toUpdateParams ??
          ((input) => decodeMedusaCustomerAddressInput(input)),
      },
      authQueryKeys: customerHookOverrides?.authQueryKeys ?? queryKeys.auth,
      buildListParams:
        customerHookOverrides?.buildListParams ?? ((input) => input),
      buildUpdateCustomerParams:
        customerHookOverrides?.buildUpdateCustomerParams ?? ((input) => input),
      cacheConfig: resolvedCacheConfig,
      queryKeyNamespace: namespace,
      queryKeys: queryKeys.customers,
      service: services.customers,
    }),
    orders: createOrderHooks<
      HttpTypes.StoreOrder,
      MedusaOrderListHookInput,
      MedusaOrderListInput,
      MedusaOrderDetailHookInput,
      MedusaOrderDetailInput
    >({
      ...config.orders?.hooks,
      cacheConfig: resolvedCacheConfig,
      queryKeyNamespace: namespace,
      queryKeys: queryKeys.orders,
      service: services.orders,
    }),
    productAttributes: createProductAttributeHooks({
      ...config.productAttributes?.hooks,
      cacheConfig: resolvedCacheConfig,
      queryKeyNamespace: namespace,
      queryKeys: queryKeys.productAttributes,
      service: services.productAttributes,
    }),
  })
  const createProductListHooksGroup = () => ({
    productLists: createProductListHooks<
      ProductListBase,
      ProductListItemBase,
      HttpTypes.StoreCart,
      MedusaProductListListHookInput,
      MedusaProductListListInput,
      MedusaProductListDetailHookInput,
      MedusaProductListDetailInput,
      MedusaProductListListKeyInput,
      MedusaProductListDetailKeyInput
    >({
      ...config.productLists?.hooks,
      buildDetailKeyParams:
        config.productLists?.hooks?.buildDetailKeyParams ??
        ((input, params) => withCustomerScope(params, input)),
      buildDetailParams:
        config.productLists?.hooks?.buildDetailParams ?? stripDetailInput,
      buildListKeyParams:
        config.productLists?.hooks?.buildListKeyParams ??
        ((input, params) => withCustomerScope(params, input)),
      buildListParams:
        config.productLists?.hooks?.buildListParams ??
        ((input) =>
          createDefaultListParams(
            input,
            config.productLists?.hooks?.defaultPageSize ?? 20,
          )),
      cacheConfig: resolvedCacheConfig,
      cartQueryKeys: queryKeys.cart,
      cartStorage: cartHookOverrides?.cartStorage,
      isActiveCartQueryKey: resolvedCheckoutActiveCartQueryKey,
      queryKeyNamespace: namespace,
      queryKeys: queryKeys.productLists,
      service: services.productLists,
    }),
  })
  const createProductHooksGroup = () => ({
    productLocationAvailability: createProductLocationAvailabilityHooks({
      ...config.productLocationAvailability?.hooks,
      cacheConfig: resolvedCacheConfig,
      queryKeyNamespace: namespace,
      queryKeys: queryKeys.productLocationAvailability,
      service: services.productLocationAvailability,
    }),
    products: createProductHooks<
      TProduct,
      MedusaProductListInput,
      MedusaProductListInput,
      MedusaProductDetailInput,
      MedusaProductDetailInput
    >({
      ...config.products?.hooks,
      cacheConfig: resolvedCacheConfig,
      queryKeyNamespace: namespace,
      queryKeys: queryKeys.products,
      service: services.products,
    }),
    regions: createRegionHooks({
      ...config.regions?.hooks,
      cacheConfig: resolvedCacheConfig,
      queryKeyNamespace: namespace,
      queryKeys: queryKeys.regions,
      service: services.regions,
    }),
    reviews: createProductReviewHooks<
      ReviewBase,
      MedusaProductReviewListInput,
      MedusaProductReviewListInput
    >({
      ...config.reviews?.hooks,
      cacheConfig: resolvedCacheConfig,
      queryKeyNamespace: namespace,
      queryKeys: queryKeys.reviews,
      service: services.reviews,
    }),
  })
  const hooks = {
    ...createCoreHooks(),
    ...createCustomerAndOrderHooks(),
    ...createProductListHooksGroup(),
    ...createProductHooksGroup(),
  }

  const storefront = {
    cacheConfig: resolvedCacheConfig,
    hooks,
    namespace,
    queryKeys,
    services,
  }

  const createFlows = () => ({
    cart: createMedusaCartFlow({
      cartStorage: cartHookOverrides?.cartStorage,
      isActiveCartQueryKey: cartFlowOverrides?.isActiveCartQueryKey,
      storefront,
    }),
    checkout: createMedusaCheckoutFlow({
      cartStorage: cartHookOverrides?.cartStorage,
      isActiveCartQueryKey: resolvedCheckoutActiveCartQueryKey,
      storefront,
    }),
  })
  const flows = createFlows()

  return {
    ...storefront,
    flows,
  }
}
