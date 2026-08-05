import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"

import type { CreateCatalogHooksConfig } from "../catalog/hooks"
import { createMedusaCatalogService } from "../catalog/medusa-service"
import type {
  MedusaCatalogListInput,
  MedusaCatalogServiceConfig,
} from "../catalog/medusa-service"
import { createCatalogQueryOptionsFactory } from "../catalog/query-options"
import type { CatalogQueryOptionsFactory } from "../catalog/query-options"
import type { CatalogFacets, CatalogQueryKeys } from "../catalog/types"
import type { CreateCategoryHooksConfig } from "../categories/hooks"
import { createMedusaCategoryService } from "../categories/medusa-service"
import type {
  MedusaCategoryDetailInput,
  MedusaCategoryListInput,
  MedusaCategoryServiceConfig,
} from "../categories/medusa-service"
import { createCategoryQueryOptionsFactory } from "../categories/query-options"
import type { CategoryQueryOptionsFactory } from "../categories/query-options"
import type { CategoryQueryKeys } from "../categories/types"
import type { CreateCollectionHooksConfig } from "../collections/hooks"
import { createMedusaCollectionService } from "../collections/medusa-service"
import type {
  MedusaCollectionDetailInput,
  MedusaCollectionListInput,
  MedusaCollectionServiceConfig,
} from "../collections/medusa-service"
import { createCollectionQueryOptionsFactory } from "../collections/query-options"
import type { CollectionQueryOptionsFactory } from "../collections/query-options"
import type { CollectionQueryKeys } from "../collections/types"
import type { CreateOrderHooksConfig } from "../orders/hooks"
import { createMedusaOrderService } from "../orders/medusa-service"
import type {
  MedusaOrderDetailHookInput,
  MedusaOrderDetailInput,
  MedusaOrderListHookInput,
  MedusaOrderListInput,
  MedusaOrderServiceConfig,
} from "../orders/medusa-service"
import { createOrderQueryOptionsFactory } from "../orders/query-options"
import type { OrderQueryOptionsFactory } from "../orders/query-options"
import type { OrderQueryKeys, OrderService } from "../orders/types"
import { createMedusaProductAttributeService } from "../product-attributes/medusa-service"
import type {
  MedusaProductAttributeServiceConfig,
  MedusaProductAttributesInput,
} from "../product-attributes/medusa-service"
import { createProductAttributeQueryOptionsFactory } from "../product-attributes/query-options"
import type {
  CreateProductAttributeQueryOptionsFactoryConfig,
  ProductAttributeQueryOptionsFactory,
} from "../product-attributes/query-options"
import type {
  ProductAttribute,
  ProductAttributeQueryKeys,
  ProductAttributeService,
} from "../product-attributes/types"
import { createMedusaProductListService } from "../product-lists/medusa-service"
import type {
  MedusaProductListDetailHookInput,
  MedusaProductListDetailInput,
  MedusaProductListDetailKeyInput,
  MedusaProductListListHookInput,
  MedusaProductListListInput,
  MedusaProductListListKeyInput,
  MedusaProductListServiceConfig,
} from "../product-lists/medusa-service"
import { createProductListQueryOptionsFactory } from "../product-lists/query-options"
import type {
  CreateProductListQueryOptionsFactoryConfig,
  ProductListQueryOptionsFactory,
} from "../product-lists/query-options"
import type {
  ProductListBase,
  ProductListItemBase,
  ProductListQueryKeys,
  ProductListService,
} from "../product-lists/types"
import { createMedusaProductLocationAvailabilityService } from "../product-location-availability/medusa-service"
import type {
  MedusaProductLocationAvailabilityInput,
  MedusaProductLocationAvailabilityServiceConfig,
} from "../product-location-availability/medusa-service"
import { createProductLocationAvailabilityQueryOptionsFactory } from "../product-location-availability/query-options"
import type { ProductLocationAvailabilityQueryOptionsFactory } from "../product-location-availability/query-options"
import type {
  ProductLocationAvailabilityQueryKeys,
  ProductLocationAvailabilityResponse,
  ProductLocationAvailabilityService,
} from "../product-location-availability/types"
import type { CreateProductHooksConfig } from "../products/hooks"
import { createMedusaProductService } from "../products/medusa-service"
import type {
  MedusaProductDetailInput,
  MedusaProductListInput,
  MedusaProductServiceConfig,
} from "../products/medusa-service"
import { createProductQueryOptionsFactory } from "../products/query-options"
import type { ProductQueryOptionsFactory } from "../products/query-options"
import type { ProductQueryKeys } from "../products/types"
import type { CreateRegionHooksConfig } from "../regions/hooks"
import { createMedusaRegionService } from "../regions/medusa-service"
import type {
  MedusaRegionDetailInput,
  MedusaRegionListInput,
} from "../regions/medusa-service"
import { createRegionQueryOptionsFactory } from "../regions/query-options"
import type { RegionQueryOptionsFactory } from "../regions/query-options"
import type { RegionQueryKeys } from "../regions/types"
import { createMedusaProductReviewService } from "../reviews/medusa-service"
import type {
  MedusaProductReviewListInput,
  MedusaProductReviewServiceConfig,
} from "../reviews/medusa-service"
import { createProductReviewQueryOptionsFactory } from "../reviews/query-options"
import type {
  CreateProductReviewQueryOptionsFactoryConfig,
  ProductReviewQueryOptionsFactory,
} from "../reviews/query-options"
import type {
  ProductReviewQueryKeys,
  ProductReviewService,
  ReviewBase,
} from "../reviews/types"
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
  | "buildListParams"
  | "buildDetailParams"
  | "buildListKeyParams"
  | "buildDetailKeyParams"
  | "defaultPageSize"
>

type MedusaProductReviewServerReadHooksConfig = Pick<
  OmitFactoryConfig<
    CreateProductReviewQueryOptionsFactoryConfig<
      ReviewBase,
      MedusaProductReviewListInput,
      MedusaProductReviewListInput
    >
  >,
  "buildListParams" | "defaultPageSize"
>

type MedusaProductAttributeServerReadHooksConfig = Pick<
  OmitFactoryConfig<
    CreateProductAttributeQueryOptionsFactoryConfig<
      ProductAttribute,
      MedusaProductAttributesInput,
      MedusaProductAttributesInput
    >
  >,
  "buildDetailParams"
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

interface MedusaStorefrontReadQueryKeys {
  products: ProductQueryKeys<MedusaProductListInput, MedusaProductDetailInput>
  productLists: ProductListQueryKeys<
    MedusaProductListListKeyInput,
    MedusaProductListDetailKeyInput
  >
  productAttributes: ProductAttributeQueryKeys<MedusaProductAttributesInput>
  productLocationAvailability: ProductLocationAvailabilityQueryKeys<MedusaProductLocationAvailabilityInput>
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
  reviews: ProductReviewQueryKeys<MedusaProductReviewListInput>
}

type MedusaOrderReadService = OrderService<
  HttpTypes.StoreOrder,
  MedusaOrderListInput,
  MedusaOrderDetailInput
>

type MedusaProductListReadService = ProductListService<
  ProductListBase,
  ProductListItemBase,
  HttpTypes.StoreCart,
  MedusaProductListListInput,
  MedusaProductListDetailInput
>

type MedusaProductReviewReadService = ProductReviewService<
  ReviewBase,
  MedusaProductReviewListInput
>

type MedusaProductAttributeReadService = ProductAttributeService<
  ProductAttribute,
  MedusaProductAttributesInput
>

type MedusaProductLocationAvailabilityReadService =
  ProductLocationAvailabilityService<
    ProductLocationAvailabilityResponse,
    MedusaProductLocationAvailabilityInput
  >

export interface CreateMedusaStorefrontServerReadPresetConfig<
  TProduct = HttpTypes.StoreProduct,
  TCategory = HttpTypes.StoreProductCategory,
  TCollection = HttpTypes.StoreCollection,
  TCatalogProduct = HttpTypes.StoreProduct,
  TCatalogFacets = CatalogFacets,
> {
  sdk: Medusa
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
  products?: {
    serviceConfig?:
      | MedusaProductServiceConfig<
          TProduct,
          MedusaProductListInput,
          MedusaProductDetailInput
        >
      | undefined
    hooks?: MedusaProductServerReadHooksConfig<TProduct> | undefined
    queryKeys?: ProductQueryKeys<
      MedusaProductListInput,
      MedusaProductDetailInput
    >
  }
  productLists?: {
    service?: MedusaProductListReadService | undefined
    serviceConfig?:
      | MedusaProductListServiceConfig<
          ProductListBase,
          ProductListItemBase,
          HttpTypes.StoreCart
        >
      | undefined
    hooks?: MedusaProductListServerReadHooksConfig | undefined
    queryKeys?: ProductListQueryKeys<
      MedusaProductListListKeyInput,
      MedusaProductListDetailKeyInput
    >
  }
  productAttributes?: {
    service?: MedusaProductAttributeReadService | undefined
    serviceConfig?: MedusaProductAttributeServiceConfig | undefined
    hooks?: MedusaProductAttributeServerReadHooksConfig | undefined
    queryKeys?: ProductAttributeQueryKeys<MedusaProductAttributesInput>
  }
  productLocationAvailability?: {
    service?: MedusaProductLocationAvailabilityReadService | undefined
    serviceConfig?: MedusaProductLocationAvailabilityServiceConfig | undefined
    queryKeys?: ProductLocationAvailabilityQueryKeys<MedusaProductLocationAvailabilityInput>
  }
  orders?: {
    service?: MedusaOrderReadService | undefined
    serviceConfig?: MedusaOrderServiceConfig | undefined
    hooks?: MedusaOrderServerReadHooksConfig | undefined
    queryKeys?: OrderQueryKeys<MedusaOrderListInput, MedusaOrderDetailInput>
  }
  regions?: {
    hooks?: MedusaRegionServerReadHooksConfig | undefined
    queryKeys?: RegionQueryKeys<MedusaRegionListInput, MedusaRegionDetailInput>
  }
  categories?: {
    serviceConfig?:
      | MedusaCategoryServiceConfig<
          TCategory,
          MedusaCategoryListInput,
          MedusaCategoryDetailInput
        >
      | undefined
    hooks?: MedusaCategoryServerReadHooksConfig<TCategory> | undefined
    queryKeys?: CategoryQueryKeys<
      MedusaCategoryListInput,
      MedusaCategoryDetailInput
    >
  }
  collections?: {
    serviceConfig?:
      | MedusaCollectionServiceConfig<
          TCollection,
          MedusaCollectionListInput,
          MedusaCollectionDetailInput
        >
      | undefined
    hooks?: MedusaCollectionServerReadHooksConfig<TCollection> | undefined
    queryKeys?: CollectionQueryKeys<
      MedusaCollectionListInput,
      MedusaCollectionDetailInput
    >
  }
  catalog?: {
    serviceConfig?:
      | MedusaCatalogServiceConfig<
          TCatalogProduct,
          MedusaCatalogListInput,
          TCatalogFacets
        >
      | undefined
    hooks?:
      | MedusaCatalogServerReadHooksConfig<TCatalogProduct, TCatalogFacets>
      | undefined
    queryKeys?: CatalogQueryKeys<MedusaCatalogListInput>
  }
  reviews?: {
    service?: MedusaProductReviewReadService | undefined
    serviceConfig?: MedusaProductReviewServiceConfig<ReviewBase> | undefined
    hooks?: MedusaProductReviewServerReadHooksConfig | undefined
    queryKeys?: ProductReviewQueryKeys<MedusaProductReviewListInput>
  }
}

interface MedusaStorefrontReadServices<
  TProduct,
  TCategory,
  TCollection,
  TCatalogProduct,
  TCatalogFacets,
> {
  products: ReturnType<
    typeof createMedusaProductService<
      TProduct,
      MedusaProductListInput,
      MedusaProductDetailInput
    >
  >
  productLists: MedusaProductListReadService
  productAttributes: MedusaProductAttributeReadService
  productLocationAvailability: MedusaProductLocationAvailabilityReadService
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
  reviews: MedusaProductReviewReadService
}

interface MedusaStorefrontReadQueries<
  TProduct,
  TCategory,
  TCollection,
  TCatalogProduct,
  TCatalogFacets,
> {
  products: ProductQueryOptionsFactory<
    TProduct,
    MedusaProductListInput,
    MedusaProductDetailInput
  >
  productLists: ProductListQueryOptionsFactory<
    ProductListBase,
    MedusaProductListListHookInput,
    MedusaProductListDetailHookInput
  >
  productAttributes: ProductAttributeQueryOptionsFactory<
    ProductAttribute,
    MedusaProductAttributesInput
  >
  productLocationAvailability: ProductLocationAvailabilityQueryOptionsFactory<
    ProductLocationAvailabilityResponse,
    MedusaProductLocationAvailabilityInput
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
  reviews: ProductReviewQueryOptionsFactory<
    ReviewBase,
    MedusaProductReviewListInput
  >
}

export interface MedusaStorefrontServerReadPresetResult<
  TProduct,
  TCategory,
  TCollection,
  TCatalogProduct,
  TCatalogFacets,
> {
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

// flat declarative preset assembly — the score comes from per-section config `??` fallbacks, not branching logic.
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
  >,
): MedusaStorefrontServerReadPresetResult<
  TProduct,
  TCategory,
  TCollection,
  TCatalogProduct,
  TCatalogFacets
> {
  const { namespace, cacheConfig, defaultQueryKeys } =
    resolveMedusaStorefrontFoundation(config)

  const queryKeys: MedusaStorefrontReadQueryKeys = {
    catalog: config.catalog?.queryKeys ?? defaultQueryKeys.catalog,
    categories: config.categories?.queryKeys ?? defaultQueryKeys.categories,
    collections: config.collections?.queryKeys ?? defaultQueryKeys.collections,
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
  }

  const services: MedusaStorefrontReadServices<
    TProduct,
    TCategory,
    TCollection,
    TCatalogProduct,
    TCatalogFacets
  > = {
    catalog: createMedusaCatalogService<
      TCatalogProduct,
      MedusaCatalogListInput,
      TCatalogFacets
    >(config.sdk, config.catalog?.serviceConfig),
    categories: createMedusaCategoryService<TCategory, MedusaCategoryListInput>(
      config.sdk,
      config.categories?.serviceConfig,
    ),
    collections: createMedusaCollectionService<
      TCollection,
      MedusaCollectionListInput
    >(config.sdk, config.collections?.serviceConfig),
    orders:
      config.orders?.service ??
      createMedusaOrderService(config.sdk, config.orders?.serviceConfig),
    productAttributes:
      config.productAttributes?.service ??
      createMedusaProductAttributeService(
        config.sdk,
        config.productAttributes?.serviceConfig,
      ),
    productLists:
      config.productLists?.service ??
      createMedusaProductListService(
        config.sdk,
        config.productLists?.serviceConfig,
      ),
    productLocationAvailability:
      config.productLocationAvailability?.service ??
      createMedusaProductLocationAvailabilityService(
        config.sdk,
        config.productLocationAvailability?.serviceConfig,
      ),
    products: createMedusaProductService<TProduct, MedusaProductListInput>(
      config.sdk,
      config.products?.serviceConfig,
    ),
    regions: createMedusaRegionService(config.sdk),
    reviews:
      config.reviews?.service ??
      createMedusaProductReviewService(
        config.sdk,
        config.reviews?.serviceConfig,
      ),
  }

  const queries: MedusaStorefrontReadQueries<
    TProduct,
    TCategory,
    TCollection,
    TCatalogProduct,
    TCatalogFacets
  > = {
    catalog: createCatalogQueryOptionsFactory({
      service: services.catalog,
      queryKeys: queryKeys.catalog,
      queryKeyNamespace: namespace,
      cacheConfig,
      ...config.catalog?.hooks,
    }),
    categories: createCategoryQueryOptionsFactory({
      service: services.categories,
      queryKeys: queryKeys.categories,
      queryKeyNamespace: namespace,
      cacheConfig,
      ...config.categories?.hooks,
    }),
    collections: createCollectionQueryOptionsFactory({
      service: services.collections,
      queryKeys: queryKeys.collections,
      queryKeyNamespace: namespace,
      cacheConfig,
      ...config.collections?.hooks,
    }),
    orders: createOrderQueryOptionsFactory({
      service: services.orders,
      queryKeys: queryKeys.orders,
      queryKeyNamespace: namespace,
      cacheConfig,
      ...config.orders?.hooks,
    }),
    productAttributes: createProductAttributeQueryOptionsFactory({
      service: services.productAttributes,
      queryKeys: queryKeys.productAttributes,
      queryKeyNamespace: namespace,
      cacheConfig,
      ...config.productAttributes?.hooks,
    }),
    productLists: createProductListQueryOptionsFactory({
      service: services.productLists,
      queryKeys: queryKeys.productLists,
      queryKeyNamespace: namespace,
      cacheConfig,
      ...config.productLists?.hooks,
    }),
    productLocationAvailability:
      createProductLocationAvailabilityQueryOptionsFactory({
        service: services.productLocationAvailability,
        queryKeys: queryKeys.productLocationAvailability,
        queryKeyNamespace: namespace,
        cacheConfig,
      }),
    products: createProductQueryOptionsFactory({
      service: services.products,
      queryKeys: queryKeys.products,
      queryKeyNamespace: namespace,
      cacheConfig,
      ...config.products?.hooks,
    }),
    regions: createRegionQueryOptionsFactory({
      service: services.regions,
      queryKeys: queryKeys.regions,
      queryKeyNamespace: namespace,
      cacheConfig,
      ...config.regions?.hooks,
    }),
    reviews: createProductReviewQueryOptionsFactory({
      service: services.reviews,
      queryKeys: queryKeys.reviews,
      queryKeyNamespace: namespace,
      cacheConfig,
      ...config.reviews?.hooks,
    }),
  }

  return {
    cacheConfig,
    namespace,
    queries,
    queryKeys,
    services,
  }
}
