import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import { createAuthHooks, type CreateAuthHooksConfig } from "../auth/hooks"
import {
  createMedusaAuthService,
  type MedusaAuthCredentials,
  type MedusaAuthServiceConfig,
  type MedusaRegisterData,
  type MedusaUpdateCustomerData,
} from "../auth/medusa-service"
import { createAuthQueryKeys } from "../auth/query-keys"
import type { AuthQueryKeys, AuthService } from "../auth/types"
import { createCartHooks, type CreateCartHooksConfig } from "../cart/hooks"
import {
  createMedusaCartService,
  type MedusaCartAddItemParams,
  type MedusaCartCreateParams,
  type MedusaCartServiceConfig,
  type MedusaCartUpdateItemParams,
  type MedusaCartUpdateParams,
  type MedusaCompleteCartResult,
} from "../cart/medusa-service"
import { createCartQueryKeys } from "../cart/query-keys"
import type {
  AddLineItemInputBase,
  CartCreateInputBase,
  CartQueryKeys,
  UpdateCartInputBase,
  UpdateLineItemInputBase,
} from "../cart/types"
import { createCatalogHooks, type CreateCatalogHooksConfig } from "../catalog/hooks"
import {
  createMedusaCatalogService,
  type MedusaCatalogListInput,
  type MedusaCatalogServiceConfig,
} from "../catalog/medusa-service"
import { createCatalogQueryKeys } from "../catalog/query-keys"
import type { CatalogFacets, CatalogQueryKeys } from "../catalog/types"
import {
  createCategoryHooks,
  type CreateCategoryHooksConfig,
} from "../categories/hooks"
import {
  createMedusaCategoryService,
  type MedusaCategoryDetailInput,
  type MedusaCategoryListInput,
  type MedusaCategoryServiceConfig,
} from "../categories/medusa-service"
import { createCategoryQueryKeys } from "../categories/query-keys"
import type { CategoryQueryKeys } from "../categories/types"
import { createCheckoutHooks, type CreateCheckoutHooksConfig } from "../checkout/hooks"
import {
  createMedusaCheckoutService,
  type MedusaCheckoutServiceConfig,
} from "../checkout/medusa-service"
import { createCheckoutQueryKeys } from "../checkout/query-keys"
import type { CheckoutQueryKeys } from "../checkout/types"
import {
  createCollectionHooks,
  type CreateCollectionHooksConfig,
} from "../collections/hooks"
import {
  createMedusaCollectionService,
  type MedusaCollectionDetailInput,
  type MedusaCollectionListInput,
  type MedusaCollectionServiceConfig,
} from "../collections/medusa-service"
import { createCollectionQueryKeys } from "../collections/query-keys"
import type { CollectionQueryKeys } from "../collections/types"
import {
  createCustomerHooks,
  type CreateCustomerHooksConfig,
} from "../customers/hooks"
import {
  createMedusaCustomerService,
  type MedusaCustomerAddressCreateInput,
  type MedusaCustomerAddressUpdateInput,
  type MedusaCustomerListInput,
  type MedusaCustomerProfileUpdateInput,
} from "../customers/medusa-service"
import { createCustomerQueryKeys } from "../customers/query-keys"
import type {
  CustomerAddressCreateInputBase,
  CustomerAddressUpdateInputBase,
  CustomerQueryKeys,
  CustomerService,
} from "../customers/types"
import { createOrderHooks, type CreateOrderHooksConfig } from "../orders/hooks"
import {
  createMedusaOrderService,
  type MedusaOrderDetailHookInput,
  type MedusaOrderDetailInput,
  type MedusaOrderListHookInput,
  type MedusaOrderListInput,
  type MedusaOrderServiceConfig,
} from "../orders/medusa-service"
import { createOrderQueryKeys } from "../orders/query-keys"
import type { OrderQueryKeys, OrderService } from "../orders/types"
import { createProductHooks, type CreateProductHooksConfig } from "../products/hooks"
import {
  createMedusaProductService,
  type MedusaProductDetailInput,
  type MedusaProductListInput,
  type MedusaProductServiceConfig,
} from "../products/medusa-service"
import { createProductQueryKeys } from "../products/query-keys"
import type { ProductQueryKeys } from "../products/types"
import { createRegionHooks, type CreateRegionHooksConfig } from "../regions/hooks"
import {
  createMedusaRegionService,
  type MedusaRegionDetailInput,
  type MedusaRegionListInput,
} from "../regions/medusa-service"
import { createRegionQueryKeys } from "../regions/query-keys"
import type { RegionQueryKeys } from "../regions/types"
import { createCacheConfig, type CacheConfig } from "../shared/cache-config"
import type { QueryNamespace } from "../shared/query-keys"

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

type MedusaCartHooksConfig<
  TAddressInput,
  TAddressPayload,
> = Omit<
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

type MedusaCheckoutHooksConfig = OmitFactoryConfig<
  CreateCheckoutHooksConfig<
    HttpTypes.StoreCart,
    HttpTypes.StoreCartShippingOption,
    HttpTypes.StorePaymentProvider,
    HttpTypes.StorePaymentCollection,
    HttpTypes.StoreCompleteCartResponse
  >
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

type MedusaCustomerAddressUpdateHookInput =
  MedusaCustomerAddressUpdateInput & {
    addressId?: string
  }

type MedusaCustomerHooksConfig<
  TCreateInput extends CustomerAddressCreateInputBase,
  TUpdateInput extends CustomerAddressUpdateInputBase,
> = OmitFactoryConfig<
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
>

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
  "service" | "queryKeys" | "queryKeyNamespace" | "cacheConfig" | "fallbackFacets"
>

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

export type CreateMedusaStorefrontPresetConfig<
  TProduct = HttpTypes.StoreProduct,
  TCategory = HttpTypes.StoreProductCategory,
  TCollection = HttpTypes.StoreCollection,
  TCatalogProduct = HttpTypes.StoreProduct,
  TCatalogFacets = CatalogFacets,
  TCartAddressInput = Record<string, unknown>,
  TCartAddressPayload = Record<string, unknown>,
  TCustomerAddressCreateInput extends CustomerAddressCreateInputBase = MedusaCustomerAddressCreateInput,
  TCustomerAddressUpdateInput extends CustomerAddressUpdateInputBase = MedusaCustomerAddressUpdateHookInput,
> = {
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
    queryKeys?: ProductQueryKeys<MedusaProductListInput, MedusaProductDetailInput>
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
  catalog?: {
    serviceConfig?: MedusaCatalogServiceConfig<
      TCatalogProduct,
      MedusaCatalogListInput,
      TCatalogFacets
    >
    hooks?: MedusaCatalogHooksConfig<TCatalogProduct, TCatalogFacets>
    queryKeys?: CatalogQueryKeys<MedusaCatalogListInput>
    fallbackFacets?: TCatalogFacets
  }
}

const createDefaultCatalogFacets = (): CatalogFacets => ({
  status: [],
  form: [],
  brand: [],
  ingredient: [],
  price: {
    min: null,
    max: null,
  },
})

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
    regions: createRegionQueryKeys<MedusaRegionListInput, MedusaRegionDetailInput>(
      namespace
    ),
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

/**
 * Create a complete Medusa storefront data preset with shared namespace/cache config.
 *
 * This factory intentionally wires query keys/services/hooks for every domain in one
 * place so applications can keep only thin customer-specific override modules.
 */
export function createMedusaStorefrontPreset<
  TProduct = HttpTypes.StoreProduct,
  TCategory = HttpTypes.StoreProductCategory,
  TCollection = HttpTypes.StoreCollection,
  TCatalogProduct = HttpTypes.StoreProduct,
  TCatalogFacets = CatalogFacets,
  TCartAddressInput = Record<string, unknown>,
  TCartAddressPayload = Record<string, unknown>,
  TCustomerAddressCreateInput extends CustomerAddressCreateInputBase = MedusaCustomerAddressCreateInput,
  TCustomerAddressUpdateInput extends CustomerAddressUpdateInputBase = MedusaCustomerAddressUpdateHookInput,
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
  >
) {
  const namespace = config.queryKeyNamespace ?? "storefront-data"
  const resolvedCacheConfig = config.cacheConfig ?? createCacheConfig()
  const defaultQueryKeys = createMedusaStorefrontQueryKeys(namespace)

  const queryKeys = {
    auth: config.auth?.queryKeys ?? defaultQueryKeys.auth,
    cart: config.cart?.queryKeys ?? defaultQueryKeys.cart,
    checkout: config.checkout?.queryKeys ?? defaultQueryKeys.checkout,
    products: config.products?.queryKeys ?? defaultQueryKeys.products,
    orders: config.orders?.queryKeys ?? defaultQueryKeys.orders,
    customers: config.customers?.queryKeys ?? defaultQueryKeys.customers,
    regions: config.regions?.queryKeys ?? defaultQueryKeys.regions,
    categories: config.categories?.queryKeys ?? defaultQueryKeys.categories,
    collections: config.collections?.queryKeys ?? defaultQueryKeys.collections,
    catalog: config.catalog?.queryKeys ?? defaultQueryKeys.catalog,
  }

  const services = {
    auth:
      config.auth?.service ??
      createMedusaAuthService(config.sdk, config.auth?.serviceConfig),
    cart: createMedusaCartService(config.sdk, config.cart?.serviceConfig),
    checkout: createMedusaCheckoutService(config.sdk, config.checkout?.serviceConfig),
    products: createMedusaProductService<
      TProduct,
      MedusaProductListInput,
      MedusaProductDetailInput
    >(config.sdk, config.products?.serviceConfig),
    orders:
      config.orders?.service ??
      createMedusaOrderService(config.sdk, config.orders?.serviceConfig),
    customers:
      config.customers?.service ?? createMedusaCustomerService(config.sdk),
    regions: createMedusaRegionService(config.sdk),
    categories: createMedusaCategoryService<
      TCategory,
      MedusaCategoryListInput,
      MedusaCategoryDetailInput
    >(config.sdk, config.categories?.serviceConfig),
    collections: createMedusaCollectionService<
      TCollection,
      MedusaCollectionListInput,
      MedusaCollectionDetailInput
    >(config.sdk, config.collections?.serviceConfig),
    catalog: createMedusaCatalogService<
      TCatalogProduct,
      MedusaCatalogListInput,
      TCatalogFacets
    >(config.sdk, config.catalog?.serviceConfig),
  }

  const authHookOverrides = config.auth?.hooks
  const authInvalidationOverrides = authHookOverrides?.invalidateOnAuthChange
  const presetAuthInvalidateKeys = [
    queryKeys.customers.all(),
    queryKeys.orders.all(),
  ]
  const presetAuthRemoveOnLogoutKeys = [
    queryKeys.customers.all(),
    queryKeys.orders.all(),
  ]
  const resolvedAuthInvalidateOnAuthChange = {
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
  const cartHookOverrides = config.cart?.hooks
  const checkoutHookOverrides = config.checkout?.hooks
  const customerHookOverrides = config.customers?.hooks
  const fallbackCatalogFacets =
    config.catalog?.fallbackFacets ??
    (createDefaultCatalogFacets() as unknown as TCatalogFacets)
  const buildMedusaAddLineItemParams = (
    input: AddLineItemInputBase
  ): MedusaCartAddItemParams => ({
    variant_id: input.variantId,
    quantity: input.quantity ?? 1,
    ...(input.metadata ? { metadata: input.metadata } : {}),
  })

  const hooks = {
    auth: createAuthHooks({
      ...(authHookOverrides ?? {}),
      service: services.auth,
      queryKeys: queryKeys.auth,
      queryKeyNamespace: namespace,
      cacheConfig: resolvedCacheConfig,
      invalidateOnAuthChange: resolvedAuthInvalidateOnAuthChange,
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
      ...(cartHookOverrides ?? {}),
      service: services.cart,
      queryKeys: queryKeys.cart,
      buildAddParams:
        cartHookOverrides?.buildAddParams ?? buildMedusaAddLineItemParams,
      queryKeyNamespace: namespace,
      cacheConfig: resolvedCacheConfig,
    }),
    checkout: createCheckoutHooks({
      ...(checkoutHookOverrides ?? {}),
      service: services.checkout,
      queryKeys: queryKeys.checkout,
      cartQueryKeys: checkoutHookOverrides?.cartQueryKeys ?? queryKeys.cart,
      queryKeyNamespace: namespace,
      cacheConfig: resolvedCacheConfig,
    }),
    products: createProductHooks<
      TProduct,
      MedusaProductListInput,
      MedusaProductListInput,
      MedusaProductDetailInput,
      MedusaProductDetailInput
    >({
      ...(config.products?.hooks ?? {}),
      service: services.products,
      queryKeys: queryKeys.products,
      queryKeyNamespace: namespace,
      cacheConfig: resolvedCacheConfig,
    }),
    orders: createOrderHooks<
      HttpTypes.StoreOrder,
      MedusaOrderListHookInput,
      MedusaOrderListInput,
      MedusaOrderDetailHookInput,
      MedusaOrderDetailInput
    >({
      ...(config.orders?.hooks ?? {}),
      service: services.orders,
      queryKeys: queryKeys.orders,
      queryKeyNamespace: namespace,
      cacheConfig: resolvedCacheConfig,
    }),
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
      ...(customerHookOverrides ?? {}),
      service: services.customers,
      queryKeys: queryKeys.customers,
      authQueryKeys: customerHookOverrides?.authQueryKeys ?? queryKeys.auth,
      queryKeyNamespace: namespace,
      cacheConfig: resolvedCacheConfig,
    }),
    regions: createRegionHooks({
      ...(config.regions?.hooks ?? {}),
      service: services.regions,
      queryKeys: queryKeys.regions,
      queryKeyNamespace: namespace,
      cacheConfig: resolvedCacheConfig,
    }),
    categories: createCategoryHooks({
      ...(config.categories?.hooks ?? {}),
      service: services.categories,
      queryKeys: queryKeys.categories,
      queryKeyNamespace: namespace,
      cacheConfig: resolvedCacheConfig,
    }),
    collections: createCollectionHooks({
      ...(config.collections?.hooks ?? {}),
      service: services.collections,
      queryKeys: queryKeys.collections,
      queryKeyNamespace: namespace,
      cacheConfig: resolvedCacheConfig,
    }),
    catalog: createCatalogHooks({
      ...(config.catalog?.hooks ?? {}),
      service: services.catalog,
      queryKeys: queryKeys.catalog,
      fallbackFacets: fallbackCatalogFacets,
      queryKeyNamespace: namespace,
      cacheConfig: resolvedCacheConfig,
    }),
  }

  return {
    namespace,
    cacheConfig: resolvedCacheConfig,
    queryKeys,
    services,
    hooks,
  }
}

export type MedusaStorefrontPreset = ReturnType<
  typeof createMedusaStorefrontPreset
>
