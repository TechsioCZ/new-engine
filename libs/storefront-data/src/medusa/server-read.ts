import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import type { CreateCatalogHooksConfig } from "../catalog/hooks"
import {
  createMedusaCatalogService,
  type MedusaCatalogListInput,
  type MedusaCatalogServiceConfig,
} from "../catalog/medusa-service"
import {
  type CatalogQueryOptionsFactory,
  createCatalogQueryOptionsFactory,
} from "../catalog/query-options"
import type { CatalogFacets, CatalogQueryKeys } from "../catalog/types"
import type { CreateCategoryHooksConfig } from "../categories/hooks"
import {
  createMedusaCategoryService,
  type MedusaCategoryDetailInput,
  type MedusaCategoryListInput,
  type MedusaCategoryServiceConfig,
} from "../categories/medusa-service"
import {
  type CategoryQueryOptionsFactory,
  createCategoryQueryOptionsFactory,
} from "../categories/query-options"
import type { CategoryQueryKeys } from "../categories/types"
import type { CreateCollectionHooksConfig } from "../collections/hooks"
import {
  createMedusaCollectionService,
  type MedusaCollectionDetailInput,
  type MedusaCollectionListInput,
  type MedusaCollectionServiceConfig,
} from "../collections/medusa-service"
import {
  type CollectionQueryOptionsFactory,
  createCollectionQueryOptionsFactory,
} from "../collections/query-options"
import type { CollectionQueryKeys } from "../collections/types"
import type { CreateOrderHooksConfig } from "../orders/hooks"
import {
  createMedusaOrderService,
  type MedusaOrderDetailHookInput,
  type MedusaOrderDetailInput,
  type MedusaOrderListHookInput,
  type MedusaOrderListInput,
  type MedusaOrderServiceConfig,
} from "../orders/medusa-service"
import {
  createOrderQueryOptionsFactory,
  type OrderQueryOptionsFactory,
} from "../orders/query-options"
import type { OrderQueryKeys, OrderService } from "../orders/types"
import {
  createMedusaProductListService,
  type MedusaProductListDetailHookInput,
  type MedusaProductListDetailInput,
  type MedusaProductListDetailKeyInput,
  type MedusaProductListListHookInput,
  type MedusaProductListListInput,
  type MedusaProductListListKeyInput,
  type MedusaProductListServiceConfig,
} from "../product-lists/medusa-service"
import {
  type CreateProductListQueryOptionsFactoryConfig,
  createProductListQueryOptionsFactory,
  type ProductListQueryOptionsFactory,
} from "../product-lists/query-options"
import type {
  ProductListBase,
  ProductListItemBase,
  ProductListQueryKeys,
  ProductListService,
} from "../product-lists/types"
import type { CreateProductHooksConfig } from "../products/hooks"
import {
  createMedusaProductService,
  type MedusaProductDetailInput,
  type MedusaProductListInput,
  type MedusaProductServiceConfig,
} from "../products/medusa-service"
import {
  createProductQueryOptionsFactory,
  type ProductQueryOptionsFactory,
} from "../products/query-options"
import type { ProductQueryKeys } from "../products/types"
import type { CreateRegionHooksConfig } from "../regions/hooks"
import {
  createMedusaRegionService,
  type MedusaRegionDetailInput,
  type MedusaRegionListInput,
} from "../regions/medusa-service"
import {
  createRegionQueryOptionsFactory,
  type RegionQueryOptionsFactory,
} from "../regions/query-options"
import type { RegionQueryKeys } from "../regions/types"
import type { CacheConfig } from "../shared/cache-config"
import type { QueryNamespace } from "../shared/query-keys"
import {
  createMedusaStorefrontQueryKeys as createMedusaStorefrontQueryKeysFromFoundation,
  resolveMedusaStorefrontFoundation,
} from "./foundation"

type OmitFactoryConfig<TConfig> = Omit<
  TConfig,
  "service" | "queryKeys" | "queryKeyNamespace" | "cacheConfig"
>

type MedusaProductServerReadHooksConfig<TProduct> = Pick<
  OmitFactoryConfig<
    CreateProductHooksConfig<
      TProduct,
      MedusaProductListInput,
      MedusaProductListInput,
      MedusaProductDetailInput,
      MedusaProductDetailInput
    >
  >,
  "buildListParams" | "buildDetailParams"
>

type MedusaOrderServerReadHooksConfig = Pick<
  OmitFactoryConfig<
    CreateOrderHooksConfig<
      HttpTypes.StoreOrder,
      MedusaOrderListHookInput,
      MedusaOrderListInput,
      MedusaOrderDetailHookInput,
      MedusaOrderDetailInput
    >
  >,
  "buildListParams" | "buildDetailParams"
>

type MedusaProductListServerReadHooksConfig = Pick<
  OmitFactoryConfig<
    CreateProductListQueryOptionsFactoryConfig<
      ProductListBase<ProductListItemBase>,
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
  | "buildListParams"
  | "buildDetailParams"
  | "buildListKeyParams"
  | "buildDetailKeyParams"
  | "defaultPageSize"
>

type MedusaRegionServerReadHooksConfig = Pick<
  OmitFactoryConfig<
    CreateRegionHooksConfig<
      HttpTypes.StoreRegion,
      MedusaRegionListInput,
      MedusaRegionListInput,
      MedusaRegionDetailInput,
      MedusaRegionDetailInput
    >
  >,
  "buildListParams" | "buildDetailParams"
>

type MedusaCategoryServerReadHooksConfig<TCategory> = Pick<
  OmitFactoryConfig<
    CreateCategoryHooksConfig<
      TCategory,
      MedusaCategoryListInput,
      MedusaCategoryListInput,
      MedusaCategoryDetailInput,
      MedusaCategoryDetailInput
    >
  >,
  "buildListParams" | "buildDetailParams"
>

type MedusaCollectionServerReadHooksConfig<TCollection> = Pick<
  OmitFactoryConfig<
    CreateCollectionHooksConfig<
      TCollection,
      MedusaCollectionListInput,
      MedusaCollectionListInput,
      MedusaCollectionDetailInput,
      MedusaCollectionDetailInput
    >
  >,
  "buildListParams" | "buildDetailParams"
>

type MedusaCatalogServerReadHooksConfig<TProduct, TFacets> = Pick<
  Omit<
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
  >,
  "buildListParams"
>

type MedusaStorefrontReadQueryKeys = {
  products: ProductQueryKeys<MedusaProductListInput, MedusaProductDetailInput>
  productLists: ProductListQueryKeys<
    MedusaProductListListKeyInput,
    MedusaProductListDetailKeyInput
  >
  orders: OrderQueryKeys<MedusaOrderListInput, MedusaOrderDetailInput>
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

type MedusaOrderReadService = OrderService<
  HttpTypes.StoreOrder,
  MedusaOrderListInput,
  MedusaOrderDetailInput
>

type MedusaProductListReadService = ProductListService<
  ProductListBase<ProductListItemBase>,
  ProductListItemBase,
  HttpTypes.StoreCart,
  MedusaProductListListInput,
  MedusaProductListDetailInput
>

export type CreateMedusaStorefrontServerReadPresetConfig<
  TProduct = HttpTypes.StoreProduct,
  TCategory = HttpTypes.StoreProductCategory,
  TCollection = HttpTypes.StoreCollection,
  TCatalogProduct = HttpTypes.StoreProduct,
  TCatalogFacets = CatalogFacets,
> = {
  sdk: Medusa
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
  products?: {
    serviceConfig?: MedusaProductServiceConfig<
      TProduct,
      MedusaProductListInput,
      MedusaProductDetailInput
    >
    hooks?: MedusaProductServerReadHooksConfig<TProduct>
    queryKeys?: ProductQueryKeys<
      MedusaProductListInput,
      MedusaProductDetailInput
    >
  }
  productLists?: {
    service?: MedusaProductListReadService
    serviceConfig?: MedusaProductListServiceConfig<
      ProductListBase<ProductListItemBase>,
      ProductListItemBase,
      HttpTypes.StoreCart
    >
    hooks?: MedusaProductListServerReadHooksConfig
    queryKeys?: ProductListQueryKeys<
      MedusaProductListListKeyInput,
      MedusaProductListDetailKeyInput
    >
  }
  orders?: {
    service?: MedusaOrderReadService
    serviceConfig?: MedusaOrderServiceConfig
    hooks?: MedusaOrderServerReadHooksConfig
    queryKeys?: OrderQueryKeys<MedusaOrderListInput, MedusaOrderDetailInput>
  }
  regions?: {
    hooks?: MedusaRegionServerReadHooksConfig
    queryKeys?: RegionQueryKeys<MedusaRegionListInput, MedusaRegionDetailInput>
  }
  categories?: {
    serviceConfig?: MedusaCategoryServiceConfig<
      TCategory,
      MedusaCategoryListInput,
      MedusaCategoryDetailInput
    >
    hooks?: MedusaCategoryServerReadHooksConfig<TCategory>
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
    hooks?: MedusaCollectionServerReadHooksConfig<TCollection>
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
    hooks?: MedusaCatalogServerReadHooksConfig<TCatalogProduct, TCatalogFacets>
    queryKeys?: CatalogQueryKeys<MedusaCatalogListInput>
  }
}

type MedusaStorefrontReadServices<
  TProduct,
  TCategory,
  TCollection,
  TCatalogProduct,
  TCatalogFacets,
> = {
  products: ReturnType<
    typeof createMedusaProductService<
      TProduct,
      MedusaProductListInput,
      MedusaProductDetailInput
    >
  >
  productLists: MedusaProductListReadService
  orders: MedusaOrderReadService
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

type MedusaStorefrontReadQueries<
  TProduct,
  TCategory,
  TCollection,
  TCatalogProduct,
  TCatalogFacets,
> = {
  products: ProductQueryOptionsFactory<
    TProduct,
    MedusaProductListInput,
    MedusaProductDetailInput
  >
  productLists: ProductListQueryOptionsFactory<
    ProductListBase<ProductListItemBase>,
    MedusaProductListListHookInput,
    MedusaProductListDetailHookInput
  >
  orders: OrderQueryOptionsFactory<
    HttpTypes.StoreOrder,
    MedusaOrderListHookInput,
    MedusaOrderDetailHookInput
  >
  regions: RegionQueryOptionsFactory<
    HttpTypes.StoreRegion,
    MedusaRegionListInput,
    MedusaRegionDetailInput
  >
  categories: CategoryQueryOptionsFactory<
    TCategory,
    MedusaCategoryListInput,
    MedusaCategoryDetailInput
  >
  collections: CollectionQueryOptionsFactory<
    TCollection,
    MedusaCollectionListInput,
    MedusaCollectionDetailInput
  >
  catalog: CatalogQueryOptionsFactory<
    TCatalogProduct,
    MedusaCatalogListInput,
    TCatalogFacets
  >
}

export type MedusaStorefrontServerReadPresetResult<
  TProduct,
  TCategory,
  TCollection,
  TCatalogProduct,
  TCatalogFacets,
> = {
  namespace: QueryNamespace
  cacheConfig: CacheConfig
  queryKeys: MedusaStorefrontReadQueryKeys
  services: MedusaStorefrontReadServices<
    TProduct,
    TCategory,
    TCollection,
    TCatalogProduct,
    TCatalogFacets
  >
  queries: MedusaStorefrontReadQueries<
    TProduct,
    TCategory,
    TCollection,
    TCatalogProduct,
    TCatalogFacets
  >
}

export const createMedusaStorefrontQueryKeys =
  createMedusaStorefrontQueryKeysFromFoundation

function createMedusaStorefrontServerReadQueryKeys<
  TProduct,
  TCategory,
  TCollection,
  TCatalogProduct,
  TCatalogFacets,
>(
  config: CreateMedusaStorefrontServerReadPresetConfig<
    TProduct,
    TCategory,
    TCollection,
    TCatalogProduct,
    TCatalogFacets
  >,
  defaultQueryKeys: MedusaStorefrontReadQueryKeys
): MedusaStorefrontReadQueryKeys {
  return {
    products: config.products?.queryKeys ?? defaultQueryKeys.products,
    productLists:
      config.productLists?.queryKeys ?? defaultQueryKeys.productLists,
    orders: config.orders?.queryKeys ?? defaultQueryKeys.orders,
    regions: config.regions?.queryKeys ?? defaultQueryKeys.regions,
    categories: config.categories?.queryKeys ?? defaultQueryKeys.categories,
    collections: config.collections?.queryKeys ?? defaultQueryKeys.collections,
    catalog: config.catalog?.queryKeys ?? defaultQueryKeys.catalog,
  }
}

function createMedusaStorefrontServerReadServices<
  TProduct,
  TCategory,
  TCollection,
  TCatalogProduct,
  TCatalogFacets,
>(
  config: CreateMedusaStorefrontServerReadPresetConfig<
    TProduct,
    TCategory,
    TCollection,
    TCatalogProduct,
    TCatalogFacets
  >
): MedusaStorefrontReadServices<
  TProduct,
  TCategory,
  TCollection,
  TCatalogProduct,
  TCatalogFacets
> {
  return {
    products: createMedusaProductService<
      TProduct,
      MedusaProductListInput,
      MedusaProductDetailInput
    >(config.sdk, config.products?.serviceConfig),
    productLists:
      config.productLists?.service ??
      createMedusaProductListService(
        config.sdk,
        config.productLists?.serviceConfig
      ),
    orders:
      config.orders?.service ??
      createMedusaOrderService(config.sdk, config.orders?.serviceConfig),
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
}

export function createMedusaStorefrontServerReadPreset<
  TProduct = HttpTypes.StoreProduct,
  TCategory = HttpTypes.StoreProductCategory,
  TCollection = HttpTypes.StoreCollection,
  TCatalogProduct = HttpTypes.StoreProduct,
  TCatalogFacets = CatalogFacets,
>(
  config: CreateMedusaStorefrontServerReadPresetConfig<
    TProduct,
    TCategory,
    TCollection,
    TCatalogProduct,
    TCatalogFacets
  >
): MedusaStorefrontServerReadPresetResult<
  TProduct,
  TCategory,
  TCollection,
  TCatalogProduct,
  TCatalogFacets
> {
  const { namespace, cacheConfig, defaultQueryKeys } =
    resolveMedusaStorefrontFoundation(config)

  const queryKeys = createMedusaStorefrontServerReadQueryKeys(
    config,
    defaultQueryKeys
  )
  const services = createMedusaStorefrontServerReadServices(config)

  const queries: MedusaStorefrontReadQueries<
    TProduct,
    TCategory,
    TCollection,
    TCatalogProduct,
    TCatalogFacets
  > = {
    products: createProductQueryOptionsFactory({
      service: services.products,
      queryKeys: queryKeys.products,
      queryKeyNamespace: namespace,
      cacheConfig,
      ...(config.products?.hooks ?? {}),
    }),
    productLists: createProductListQueryOptionsFactory({
      service: services.productLists,
      queryKeys: queryKeys.productLists,
      queryKeyNamespace: namespace,
      cacheConfig,
      ...(config.productLists?.hooks ?? {}),
    }),
    orders: createOrderQueryOptionsFactory({
      service: services.orders,
      queryKeys: queryKeys.orders,
      queryKeyNamespace: namespace,
      cacheConfig,
      ...(config.orders?.hooks ?? {}),
    }),
    regions: createRegionQueryOptionsFactory({
      service: services.regions,
      queryKeys: queryKeys.regions,
      queryKeyNamespace: namespace,
      cacheConfig,
      ...(config.regions?.hooks ?? {}),
    }),
    categories: createCategoryQueryOptionsFactory({
      service: services.categories,
      queryKeys: queryKeys.categories,
      queryKeyNamespace: namespace,
      cacheConfig,
      ...(config.categories?.hooks ?? {}),
    }),
    collections: createCollectionQueryOptionsFactory({
      service: services.collections,
      queryKeys: queryKeys.collections,
      queryKeyNamespace: namespace,
      cacheConfig,
      ...(config.collections?.hooks ?? {}),
    }),
    catalog: createCatalogQueryOptionsFactory({
      service: services.catalog,
      queryKeys: queryKeys.catalog,
      queryKeyNamespace: namespace,
      cacheConfig,
      ...(config.catalog?.hooks ?? {}),
    }),
  }

  return {
    namespace,
    cacheConfig,
    queryKeys,
    services,
    queries,
  }
}
