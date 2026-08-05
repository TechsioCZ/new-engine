import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { omitKeys } from "@techsio/std/object"
import { useEffect, useSyncExternalStore } from "react"

import { assertStorefrontAddressValidation } from "../shared/address"
import {
  createCacheConfig,
  getPrefetchCacheOptions,
} from "../shared/cache-config"
import type { CacheConfig, CacheStrategy } from "../shared/cache-config"
import {
  cancelCartCaches,
  invalidateCartCaches,
  syncCartCaches,
} from "../shared/cart-cache-sync"
import { toErrorMessage } from "../shared/error-utils"
import type {
  MutationOptions,
  ReadQueryOptions,
  SuspenseQueryOptions,
} from "../shared/hook-types"
import { shouldSkipPrefetch } from "../shared/prefetch"
import type { PrefetchSkipMode } from "../shared/prefetch"
import type { QueryNamespace } from "../shared/query-keys"
import { applyRegion } from "../shared/region"
import { useRegionContext } from "../shared/region-context"
import type { StorageValueStore } from "../shared/storage-value-store"
import { createCartQueryKeys } from "./query-keys"
import type {
  AddLineItemInputBase,
  CartAddressAdapter,
  CartAddressInputBase,
  CartCreateInputBase,
  CartInputBase,
  CartLike,
  CartQueryKeys,
  CartService,
  RemoveLineItemInputBase,
  TransferCartInputBase,
  UpdateCartInputBase,
  UpdateLineItemInputBase,
  UseCartResult,
  UseSuspenseCartResult,
} from "./types"

interface CartTransientInput {
  cartId?: string
  autoCreate?: boolean
  autoUpdateRegion?: boolean
  enabled?: boolean
  variantId?: string
  quantity?: number
  useSameAddress?: boolean
  shippingAddress?: unknown
  billingAddress?: unknown
  salesChannelId?: string
}

type CartCreateTransientInput = CartTransientInput
type CartUpdateTransientInput = CartTransientInput

interface AddLineItemTransientInput {
  cartId?: string
  autoCreate?: boolean
  autoUpdateRegion?: boolean
  enabled?: boolean
  region_id?: string
  country_code?: string
  salesChannelId?: string
}

interface UpdateLineItemTransientInput {
  cartId?: string
  lineItemId?: string
  enabled?: boolean
  autoCreate?: boolean
  autoUpdateRegion?: boolean
}

const cartPayloadOmitKeys = [
  "cartId",
  "autoCreate",
  "autoUpdateRegion",
  "enabled",
  "variantId",
  "quantity",
  "useSameAddress",
  "shippingAddress",
  "billingAddress",
  "salesChannelId",
] as const

const addLineItemPayloadOmitKeys = [
  "cartId",
  "autoCreate",
  "autoUpdateRegion",
  "enabled",
  "region_id",
  "country_code",
  "salesChannelId",
] as const

const updateLineItemPayloadOmitKeys = [
  "cartId",
  "lineItemId",
  "enabled",
  "autoCreate",
  "autoUpdateRegion",
] as const

type NormalizedCartCreatePayload<TInput extends CartCreateInputBase> = Omit<
  TInput & CartCreateTransientInput,
  (typeof cartPayloadOmitKeys)[number]
> & {
  sales_channel_id?: string
}

type NormalizedCartUpdatePayload<TInput extends UpdateCartInputBase> = Omit<
  TInput & CartUpdateTransientInput,
  (typeof cartPayloadOmitKeys)[number]
> & {
  sales_channel_id?: string
}

type NormalizedAddLineItemPayload<TInput extends AddLineItemInputBase> = Omit<
  TInput & AddLineItemTransientInput,
  (typeof addLineItemPayloadOmitKeys)[number]
>

type NormalizedUpdateLineItemPayload<TInput extends UpdateLineItemInputBase> =
  Omit<
    TInput & UpdateLineItemTransientInput,
    (typeof updateLineItemPayloadOmitKeys)[number]
  >

const noopUnsubscribe = () => {
  // Intentionally empty unsubscribe callback.
}

const CART_ID_REQUIRED_ERROR = "Cart id is required"

interface ConditionalCartHookAdapter {
  adapt: <TTarget>(input: unknown, target?: (value: TTarget) => void) => TTarget
  resolve: <TArgs extends unknown[], TResult>(
    custom: ((...args: TArgs) => TResult) | undefined,
    fallback: (...args: TArgs) => unknown,
  ) => (...args: TArgs) => TResult
}

class ConditionalCartHookAdapterImpl implements ConditionalCartHookAdapter {
  readonly #owner = this

  adapt<TTarget>(input: unknown, _target?: (value: TTarget) => void): TTarget
  adapt(input: unknown): unknown {
    void this.#owner
    return input
  }

  resolve<TArgs extends unknown[], TResult>(
    custom: ((...args: TArgs) => TResult) | undefined,
    fallback: (...args: TArgs) => unknown,
  ): (...args: TArgs) => TResult
  resolve<TArgs extends unknown[], TResult>(
    custom: ((...args: TArgs) => TResult) | undefined,
    fallback: (...args: TArgs) => unknown,
  ): ((...args: TArgs) => TResult) | ((...args: TArgs) => unknown) {
    void this.#owner
    return custom ?? fallback
  }
}

const conditionalCartHookAdapter: ConditionalCartHookAdapter =
  new ConditionalCartHookAdapterImpl()

type ObservableStorageValueStore = StorageValueStore & {
  subscribe: NonNullable<StorageValueStore["subscribe"]>
  getSnapshot: NonNullable<StorageValueStore["getSnapshot"]>
}

const hasObservableCartStorage = (
  storage?: StorageValueStore,
): storage is ObservableStorageValueStore =>
  Boolean(storage?.subscribe && storage.getSnapshot)

const normalizeCartCreatePayload = <TInput extends CartCreateInputBase>(
  input: TInput,
): NormalizedCartCreatePayload<TInput> => {
  const normalizedInput = input as TInput & CartCreateTransientInput
  const payload = omitKeys(normalizedInput, cartPayloadOmitKeys)
  const { salesChannelId } = normalizedInput

  if (salesChannelId === undefined || salesChannelId.length === 0) {
    return payload
  }

  return {
    ...payload,
    sales_channel_id: salesChannelId,
  }
}

const normalizeCartUpdatePayload = <TInput extends UpdateCartInputBase>(
  input: TInput,
): NormalizedCartUpdatePayload<TInput> => {
  const normalizedInput = input as TInput & CartUpdateTransientInput
  const payload = omitKeys(normalizedInput, cartPayloadOmitKeys)
  const { salesChannelId } = normalizedInput

  if (salesChannelId === undefined || salesChannelId.length === 0) {
    return payload
  }

  return {
    ...payload,
    sales_channel_id: salesChannelId,
  }
}

const normalizeAddLineItemPayload = <TInput extends AddLineItemInputBase>(
  input: TInput,
): NormalizedAddLineItemPayload<TInput> =>
  omitKeys(
    input as TInput & AddLineItemTransientInput,
    addLineItemPayloadOmitKeys,
  )

const normalizeUpdateLineItemPayload = <TInput extends UpdateLineItemInputBase>(
  input: TInput,
): NormalizedUpdateLineItemPayload<TInput> =>
  omitKeys(
    input as TInput & UpdateLineItemTransientInput,
    updateLineItemPayloadOmitKeys,
  )

const getItemCount = (cart: CartLike | null): number => {
  const items = cart?.items
  if (items === undefined || items.length === 0) {
    return 0
  }

  return items.reduce((acc, item) => acc + (item.quantity ?? 0), 0)
}

type BuildCreateParamsOption<
  TCreateInput extends CartCreateInputBase,
  TCreateParams,
> = [NormalizedCartCreatePayload<TCreateInput>] extends [TCreateParams]
  ? { buildCreateParams?: (input: TCreateInput) => TCreateParams }
  : { buildCreateParams: (input: TCreateInput) => TCreateParams }

type BuildUpdateParamsOption<
  TUpdateInput extends UpdateCartInputBase,
  TUpdateParams,
> = [NormalizedCartUpdatePayload<TUpdateInput>] extends [TUpdateParams]
  ? { buildUpdateParams?: (input: TUpdateInput) => TUpdateParams }
  : { buildUpdateParams: (input: TUpdateInput) => TUpdateParams }

type BuildAddParamsOption<
  TAddInput extends AddLineItemInputBase,
  TAddParams,
> = [NormalizedAddLineItemPayload<TAddInput>] extends [TAddParams]
  ? { buildAddParams?: (input: TAddInput) => TAddParams }
  : { buildAddParams: (input: TAddInput) => TAddParams }

type BuildCreateInputFromAddInputOption<
  TAddInput extends AddLineItemInputBase,
  TCreateInput extends CartCreateInputBase,
> = [TAddInput] extends [TCreateInput]
  ? { buildCreateInputFromAddInput?: (input: TAddInput) => TCreateInput }
  : { buildCreateInputFromAddInput: (input: TAddInput) => TCreateInput }

type BuildUpdateItemParamsOption<
  TUpdateItemInput extends UpdateLineItemInputBase,
  TUpdateItemParams,
> = [NormalizedUpdateLineItemPayload<TUpdateItemInput>] extends [
  TUpdateItemParams,
]
  ? { buildUpdateItemParams?: (input: TUpdateItemInput) => TUpdateItemParams }
  : { buildUpdateItemParams: (input: TUpdateItemInput) => TUpdateItemParams }

interface CreateCartHooksBaseConfig<
  TCart extends CartLike,
  TCreateParams,
  TUpdateParams,
  TAddParams,
  TUpdateItemParams,
  TCompleteResult,
  TAddressInput,
  TAddressPayload,
> {
  service: CartService<
    TCart,
    TCreateParams,
    TUpdateParams,
    TAddParams,
    TUpdateItemParams,
    TCompleteResult
  >
  queryKeys?: CartQueryKeys
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
  requireRegion?: boolean
  cartStorage?: StorageValueStore
  isNotFoundError?: (error: unknown) => boolean
  addressAdapter?: CartAddressAdapter<TAddressInput, TAddressPayload>
  invalidateOnSuccess?: boolean
}

type ParamBuilder<TInput, TParams> = (input: TInput) => TParams
type AddressMutationInput<TAddressInput> =
  CartAddressInputBase<TAddressInput> & {
    shippingAddress: TAddressInput
    billingAddress?: TAddressInput
    useSameAddress?: boolean
  }

export type CreateCartHooksConfig<
  TCart extends CartLike,
  TCreateInput extends CartCreateInputBase,
  TCreateParams,
  TUpdateInput extends UpdateCartInputBase,
  TUpdateParams,
  TAddInput extends AddLineItemInputBase,
  TAddParams,
  TUpdateItemInput extends UpdateLineItemInputBase,
  TUpdateItemParams,
  TCompleteResult,
  TAddressInput,
  TAddressPayload,
> = CreateCartHooksBaseConfig<
  TCart,
  TCreateParams,
  TUpdateParams,
  TAddParams,
  TUpdateItemParams,
  TCompleteResult,
  TAddressInput,
  TAddressPayload
> &
  BuildCreateParamsOption<TCreateInput, TCreateParams> &
  BuildUpdateParamsOption<TUpdateInput, TUpdateParams> &
  BuildAddParamsOption<TAddInput, TAddParams> &
  BuildCreateInputFromAddInputOption<TAddInput, TCreateInput> &
  BuildUpdateItemParamsOption<TUpdateItemInput, TUpdateItemParams>

export type CartMutationOptions<
  TData,
  TVariables,
  TContext = unknown,
> = MutationOptions<TData, TVariables, TContext>

export const createCartHooks = <
  TCart extends CartLike,
  TCreateInput extends CartCreateInputBase,
  TCreateParams = NormalizedCartCreatePayload<TCreateInput>,
  TUpdateInput extends UpdateCartInputBase = UpdateCartInputBase,
  TUpdateParams = NormalizedCartUpdatePayload<TUpdateInput>,
  TAddInput extends AddLineItemInputBase = AddLineItemInputBase,
  TAddParams = NormalizedAddLineItemPayload<TAddInput>,
  TUpdateItemInput extends UpdateLineItemInputBase = UpdateLineItemInputBase,
  TUpdateItemParams = NormalizedUpdateLineItemPayload<TUpdateItemInput>,
  TCompleteResult = unknown,
  TAddressInput = Record<string, unknown>,
  TAddressPayload = Record<string, unknown>,
>({
  service,
  buildCreateParams,
  buildUpdateParams,
  buildAddParams,
  buildCreateInputFromAddInput,
  buildUpdateItemParams,
  queryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
  requireRegion = true,
  cartStorage,
  isNotFoundError,
  addressAdapter,
  invalidateOnSuccess = false,
}: CreateCartHooksConfig<
  TCart,
  TCreateInput,
  TCreateParams,
  TUpdateInput,
  TUpdateParams,
  TAddInput,
  TAddParams,
  TUpdateItemInput,
  TUpdateItemParams,
  TCompleteResult,
  TAddressInput,
  TAddressPayload
>) => {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys = queryKeys ?? createCartQueryKeys(queryKeyNamespace)
  // CreateCartHooksConfig conditional types require custom builders whenever
  // default normalized payloads are incompatible with custom param types.
  const buildCreate: ParamBuilder<TCreateInput, TCreateParams> =
    conditionalCartHookAdapter.resolve(
      buildCreateParams,
      normalizeCartCreatePayload,
    )
  const buildUpdate: ParamBuilder<TUpdateInput, TUpdateParams> =
    conditionalCartHookAdapter.resolve(
      buildUpdateParams,
      normalizeCartUpdatePayload,
    )
  const buildAdd: ParamBuilder<TAddInput, TAddParams> =
    conditionalCartHookAdapter.resolve(
      buildAddParams,
      normalizeAddLineItemPayload,
    )
  const buildCreateInputFromAdd: ParamBuilder<TAddInput, TCreateInput> =
    conditionalCartHookAdapter.resolve(
      buildCreateInputFromAddInput,
      (input: TAddInput) => input,
    )
  const buildUpdateItem: ParamBuilder<TUpdateItemInput, TUpdateItemParams> =
    conditionalCartHookAdapter.resolve(
      buildUpdateItemParams,
      normalizeUpdateLineItemPayload,
    )

  const normalizeAddressInput = (
    input: TAddressInput,
    scope: "shipping" | "billing",
  ): TAddressInput =>
    addressAdapter?.normalize
      ? addressAdapter.normalize(input, { scope })
      : input

  const validateAddressInput = (
    input: TAddressInput,
    scope: "shipping" | "billing",
  ) => {
    assertStorefrontAddressValidation(
      addressAdapter?.validate?.(input, { scope }),
    )
  }

  const buildAddressPayload = conditionalCartHookAdapter.resolve(
    addressAdapter?.toPayload,
    (input: TAddressInput) => input,
  )

  const readStoredCartId = (): string | null => {
    if (!cartStorage) {
      return null
    }

    return cartStorage.getSnapshot?.() ?? cartStorage.get()
  }

  const subscribeToStoredCart = (listener: () => void) => {
    if (!hasObservableCartStorage(cartStorage)) {
      return noopUnsubscribe
    }

    return cartStorage.subscribe(listener)
  }

  const getStoredCartServerSnapshot = (): string | null =>
    cartStorage?.getServerSnapshot?.() ?? null

  const useStoredCartId = (): string | null =>
    useSyncExternalStore(
      subscribeToStoredCart,
      readStoredCartId,
      getStoredCartServerSnapshot,
    )

  const resolveCartId = (inputCartId?: string | null): string | null =>
    inputCartId ?? readStoredCartId()

  const persistCartId = (cartId: string) => {
    cartStorage?.set(cartId)
  }

  const clearCartId = () => {
    cartStorage?.clear()
  }

  const callUpdateCart = async (cartId: string, params: TUpdateParams) => {
    const { updateCart } = service
    if (updateCart === undefined) {
      throw new Error("updateCart service is not configured")
    }
    return await updateCart(cartId, params)
  }

  const requireCartId = (inputCartId?: string | null): string => {
    const cartId = resolveCartId(inputCartId)
    if (cartId === null || cartId.length === 0) {
      throw new Error(CART_ID_REQUIRED_ERROR)
    }
    return cartId
  }

  const resolveBillingAddressInput = (
    billingAddress: TAddressInput | undefined,
    normalizedShipping: TAddressInput,
    useSameAddress = false,
  ): TAddressInput | undefined => {
    if (useSameAddress || billingAddress === undefined) {
      return normalizedShipping
    }
    return normalizeAddressInput(billingAddress, "billing")
  }

  const resolveAddressMutationInput = (
    input: CartAddressInputBase<TAddressInput>,
  ) => {
    const { shippingAddress, billingAddress, useSameAddress, ...restInput } =
      input
    const normalizedShipping = normalizeAddressInput(
      shippingAddress,
      "shipping",
    )
    const resolvedBillingInput = resolveBillingAddressInput(
      billingAddress,
      normalizedShipping,
      useSameAddress,
    )

    return {
      normalizedShipping,
      resolvedBillingInput,
      restInput,
    }
  }

  const validateAddressInputs = (
    shippingInput: TAddressInput,
    billingInput: TAddressInput | undefined,
  ) => {
    validateAddressInput(shippingInput, "shipping")
    if (billingInput === undefined) {
      return
    }
    validateAddressInput(billingInput, "billing")
  }

  const buildAddressUpdateInput = (
    restInput: Omit<
      AddressMutationInput<TAddressInput>,
      "shippingAddress" | "billingAddress" | "useSameAddress"
    >,
    normalizedShipping: TAddressInput,
    resolvedBillingInput: TAddressInput | undefined,
  ): TUpdateInput =>
    conditionalCartHookAdapter.adapt<TUpdateInput>({
      ...restInput,
      billing_address:
        resolvedBillingInput === undefined
          ? undefined
          : buildAddressPayload(resolvedBillingInput, { scope: "billing" }),
      shipping_address: buildAddressPayload(normalizedShipping, {
        scope: "shipping",
      }),
    })

  const invalidateCart = async (
    queryClient: ReturnType<typeof useQueryClient>,
    cart: CartLike | null,
  ): Promise<void> => {
    const cartId = cart?.id
    if (!invalidateOnSuccess || cartId === undefined || cartId.length === 0) {
      return
    }

    await invalidateCartCaches(queryClient, resolvedQueryKeys, cartId)
  }

  const syncMutationCart = async (
    queryClient: ReturnType<typeof useQueryClient>,
    cart: TCart,
  ) => {
    const cancellation = cancelCartCaches(
      queryClient,
      resolvedQueryKeys,
      cart.id,
    )
    syncCartCaches(queryClient, resolvedQueryKeys, cart)
    const invalidated = invalidateCart(queryClient, cart)
    await cancellation
    await invalidated
  }

  interface LoadCartOptions {
    input: CartInputBase
    cartId: string | null
    canCreate: boolean
    autoUpdateRegion: boolean
    signal?: AbortSignal
  }

  const createCartFromInput = async (input: CartInputBase): Promise<TCart> => {
    const created = await service.createCart(
      buildCreate(conditionalCartHookAdapter.adapt<TCreateInput>(input)),
    )
    persistCartId(created.id)
    return created
  }

  const loadCart = async ({
    input,
    cartId,
    canCreate,
    autoUpdateRegion,
    signal,
  }: LoadCartOptions): Promise<TCart | null> => {
    const resolvedCartId = cartId ?? resolveCartId(input.cartId)

    const createIfAllowed = async (): Promise<TCart | null> => {
      if (!canCreate) {
        return null
      }
      return await createCartFromInput(input)
    }

    const resolveRegionUpdate = async (cart: TCart): Promise<TCart> => {
      const inputRegionId = input.region_id
      const cartRegionId = cart.region_id
      const { updateCart } = service

      if (!autoUpdateRegion || updateCart === undefined) {
        return cart
      }
      if (inputRegionId === undefined || inputRegionId.length === 0) {
        return cart
      }
      if (
        cartRegionId === undefined ||
        cartRegionId === null ||
        cartRegionId.length === 0 ||
        cartRegionId === inputRegionId
      ) {
        return cart
      }

      return await updateCart(
        cart.id,
        buildUpdate(
          conditionalCartHookAdapter.adapt<TUpdateInput>({
            ...input,
            region_id: inputRegionId,
          }),
        ),
      )
    }

    if (resolvedCartId === null || resolvedCartId.length === 0) {
      return await createIfAllowed()
    }

    try {
      const cart = await service.retrieveCart(resolvedCartId, signal)

      if (!cart) {
        clearCartId()
        return await createIfAllowed()
      }

      return await resolveRegionUpdate(cart)
    } catch (error) {
      if (isNotFoundError?.(error) !== true) {
        throw error
      }

      clearCartId()
      return await createIfAllowed()
    }
  }

  const syncCartCache = (
    queryClient: ReturnType<typeof useQueryClient>,
    cart: CartLike | null,
    previousCartId: string | null,
    previousRegionId: string | null,
  ) => {
    if (cart === null || cart.id.length === 0) {
      return
    }

    const sourceKey = resolvedQueryKeys.active({
      cartId: previousCartId,
      regionId: previousRegionId,
    })
    // A restored inactive observer can resume with data older than its cache.
    // Only the raw value still owned by this query may fan out to cart aliases.
    if (queryClient.getQueryData(sourceKey) !== cart) {
      return
    }

    syncCartCaches(queryClient, resolvedQueryKeys, cart)

    if (previousCartId !== cart.id) {
      const previousKey = resolvedQueryKeys.active({
        cartId: previousCartId,
        regionId: previousRegionId,
      })
      queryClient.removeQueries({ exact: true, queryKey: previousKey })
    }
  }

  const useCart = (
    input: CartInputBase,
    options?: { queryOptions?: ReadQueryOptions<TCart | null> },
  ): UseCartResult<TCart> => {
    const queryClient = useQueryClient()
    const contextRegion = useRegionContext()
    const storedCartId = useStoredCartId()
    const resolvedInput = applyRegion(input, contextRegion ?? undefined)
    const cartId = resolvedInput.cartId ?? storedCartId
    const autoCreate = resolvedInput.autoCreate ?? true
    const autoUpdateRegion = resolvedInput.autoUpdateRegion ?? true
    const canCreate =
      autoCreate && (!requireRegion || Boolean(resolvedInput.region_id))
    const enabled = resolvedInput.enabled ?? (Boolean(cartId) || canCreate)

    const query = useQuery({
      enabled,
      queryFn: async ({ signal }) =>
        await loadCart({
          autoUpdateRegion,
          canCreate,
          cartId,
          input: resolvedInput,
          signal,
        }),
      queryKey: resolvedQueryKeys.active({
        cartId,
        regionId: resolvedInput.region_id ?? null,
      }),
      ...resolvedCacheConfig.realtime,
      ...options?.queryOptions,
    })
    const { data, isLoading, isFetching, isSuccess, error } = query

    const cart = data ?? null
    const itemCount = getItemCount(cart)

    useEffect(() => {
      syncCartCache(queryClient, cart, cartId, resolvedInput.region_id ?? null)
    }, [cart, cartId, queryClient, resolvedInput.region_id])

    return {
      cart,
      error: toErrorMessage(error),
      hasItems: itemCount > 0,
      isEmpty: itemCount === 0,
      isFetching,
      isLoading,
      isSuccess,
      itemCount,
      query,
    }
  }

  const useSuspenseCart = (
    input: CartInputBase,
    options?: { queryOptions?: SuspenseQueryOptions<TCart | null> },
  ): UseSuspenseCartResult<TCart> => {
    const queryClient = useQueryClient()
    const contextRegion = useRegionContext()
    const storedCartId = useStoredCartId()
    const resolvedInput = applyRegion(input, contextRegion ?? undefined)
    const cartId = resolvedInput.cartId ?? storedCartId
    const autoCreate = resolvedInput.autoCreate ?? true
    const autoUpdateRegion = resolvedInput.autoUpdateRegion ?? true
    const canCreate =
      autoCreate && (!requireRegion || Boolean(resolvedInput.region_id))

    const query = useSuspenseQuery({
      queryFn: async ({ signal }) =>
        await loadCart({
          autoUpdateRegion,
          canCreate,
          cartId,
          input: resolvedInput,
          signal,
        }),
      queryKey: resolvedQueryKeys.active({
        cartId,
        regionId: resolvedInput.region_id ?? null,
      }),
      ...resolvedCacheConfig.realtime,
      ...options?.queryOptions,
    })
    const { data, isFetching } = query

    const cart = data ?? null
    const itemCount = getItemCount(cart)

    useEffect(() => {
      syncCartCache(queryClient, cart, cartId, resolvedInput.region_id ?? null)
    }, [cart, cartId, queryClient, resolvedInput.region_id])

    return {
      cart,
      error: null,
      hasItems: itemCount > 0,
      isEmpty: itemCount === 0,
      isFetching,
      isLoading: false,
      isSuccess: true,
      itemCount,
      query,
    }
  }

  const useCreateCart = (
    options?: CartMutationOptions<TCart, TCreateInput>,
  ) => {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: async (input: TCreateInput) =>
        await service.createCart(buildCreate(input)),
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
      onSuccess: async (cart, variables, context) => {
        persistCartId(cart.id)
        await syncMutationCart(queryClient, cart)
        options?.onSuccess?.(cart, variables, context)
      },
    })
  }

  const useUpdateCart = (
    options?: CartMutationOptions<TCart, TUpdateInput>,
  ) => {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: async (input: TUpdateInput) => {
        if (service.updateCart === undefined) {
          throw new Error("updateCart service is not configured")
        }
        const cartId = resolveCartId(input.cartId)
        if (cartId === null || cartId.length === 0) {
          throw new Error(CART_ID_REQUIRED_ERROR)
        }
        return await service.updateCart(cartId, buildUpdate(input))
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
      onSuccess: async (cart, variables, context) => {
        await syncMutationCart(queryClient, cart)
        options?.onSuccess?.(cart, variables, context)
      },
    })
  }

  const useUpdateCartAddress = (
    options?: CartMutationOptions<TCart, CartAddressInputBase<TAddressInput>>,
  ) => {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: async (input: CartAddressInputBase<TAddressInput>) => {
        const cartId = requireCartId(input.cartId)
        const { restInput, normalizedShipping, resolvedBillingInput } =
          resolveAddressMutationInput(input)

        validateAddressInputs(normalizedShipping, resolvedBillingInput)

        const updateInput = buildAddressUpdateInput(
          restInput,
          normalizedShipping,
          resolvedBillingInput,
        )

        return await callUpdateCart(cartId, buildUpdate(updateInput))
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
      onSuccess: async (cart, variables, context) => {
        await syncMutationCart(queryClient, cart)
        options?.onSuccess?.(cart, variables, context)
      },
    })
  }

  const useAddLineItem = (options?: CartMutationOptions<TCart, TAddInput>) => {
    const contextRegion = useRegionContext()
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: async (input: TAddInput) => {
        if (service.addLineItem === undefined) {
          throw new Error("addLineItem service is not configured")
        }

        const resolvedInput = applyRegion(input, contextRegion ?? undefined)
        let cartId = resolveCartId(resolvedInput.cartId)
        const autoCreate = resolvedInput.autoCreate ?? true
        const canCreate =
          autoCreate && (!requireRegion || Boolean(resolvedInput.region_id))

        if (cartId === null || cartId.length === 0) {
          if (!canCreate) {
            throw new Error(CART_ID_REQUIRED_ERROR)
          }
          const created = await service.createCart(
            buildCreate(buildCreateInputFromAdd(resolvedInput)),
          )
          persistCartId(created.id)
          cartId = created.id
          syncCartCaches(queryClient, resolvedQueryKeys, created)
        }

        const updated = await service.addLineItem(
          cartId,
          buildAdd(resolvedInput),
        )
        persistCartId(updated.id)
        return updated
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
      onSuccess: async (cart, variables, context) => {
        await syncMutationCart(queryClient, cart)
        options?.onSuccess?.(cart, variables, context)
      },
    })
  }

  const useUpdateLineItem = (
    options?: CartMutationOptions<TCart, TUpdateItemInput>,
  ) => {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: async (input: TUpdateItemInput) => {
        if (service.updateLineItem === undefined) {
          throw new Error("updateLineItem service is not configured")
        }
        const cartId = resolveCartId(input.cartId)
        if (cartId === null || cartId.length === 0) {
          throw new Error(CART_ID_REQUIRED_ERROR)
        }
        return await service.updateLineItem(
          cartId,
          input.lineItemId,
          buildUpdateItem(input),
        )
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
      onSuccess: async (cart, variables, context) => {
        await syncMutationCart(queryClient, cart)
        options?.onSuccess?.(cart, variables, context)
      },
    })
  }

  const useRemoveLineItem = (
    options?: CartMutationOptions<TCart, RemoveLineItemInputBase>,
  ) => {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: async (input: RemoveLineItemInputBase) => {
        if (service.removeLineItem === undefined) {
          throw new Error("removeLineItem service is not configured")
        }
        const cartId = resolveCartId(input.cartId)
        if (cartId === null || cartId.length === 0) {
          throw new Error(CART_ID_REQUIRED_ERROR)
        }
        return await service.removeLineItem(cartId, input.lineItemId)
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
      onSuccess: async (cart, variables, context) => {
        await syncMutationCart(queryClient, cart)
        options?.onSuccess?.(cart, variables, context)
      },
    })
  }

  const useTransferCart = (
    options?: CartMutationOptions<TCart, TransferCartInputBase>,
  ) => {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: async (input: TransferCartInputBase) => {
        if (service.transferCart === undefined) {
          throw new Error("transferCart service is not configured")
        }
        const cartId = resolveCartId(input.cartId)
        if (cartId === null || cartId.length === 0) {
          throw new Error(CART_ID_REQUIRED_ERROR)
        }
        return await service.transferCart(cartId)
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
      onSuccess: async (cart, variables, context) => {
        await syncMutationCart(queryClient, cart)
        options?.onSuccess?.(cart, variables, context)
      },
    })
  }

  const useCompleteCart = (
    options?: CartMutationOptions<TCompleteResult, { cartId?: string }> & {
      clearCartOnSuccess?: boolean
    },
  ) =>
    useMutation({
      mutationFn: async (input: { cartId?: string }) => {
        if (service.completeCart === undefined) {
          throw new Error("completeCart service is not configured")
        }
        const cartId = resolveCartId(input.cartId)
        if (cartId === null || cartId.length === 0) {
          throw new Error(CART_ID_REQUIRED_ERROR)
        }
        return await service.completeCart(cartId)
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
      onSuccess: (data, variables, context) => {
        if (options?.clearCartOnSuccess === true) {
          clearCartId()
        }
        options?.onSuccess?.(data, variables, context)
      },
    })

  const usePrefetchCart = (options?: {
    cacheStrategy?: CacheStrategy
    skipIfCached?: boolean
    skipMode?: PrefetchSkipMode
  }) => {
    const queryClient = useQueryClient()
    const contextRegion = useRegionContext()
    const cacheStrategy = options?.cacheStrategy ?? "realtime"
    const skipIfCached = options?.skipIfCached ?? true
    const skipMode = options?.skipMode ?? "fresh"
    const prefetchCacheOptions = getPrefetchCacheOptions(
      resolvedCacheConfig,
      cacheStrategy,
    )

    const prefetchCart = async (input: CartInputBase) => {
      const resolvedInput = applyRegion(input, contextRegion ?? undefined)
      const cartId = resolveCartId(resolvedInput.cartId)
      const autoCreate = resolvedInput.autoCreate ?? true
      const canCreate =
        autoCreate && (!requireRegion || Boolean(resolvedInput.region_id))

      const queryKey = resolvedQueryKeys.active({
        cartId,
        regionId: resolvedInput.region_id ?? null,
      })

      if (
        shouldSkipPrefetch({
          cacheOptions: prefetchCacheOptions,
          queryClient,
          queryKey,
          skipIfCached,
          skipMode,
        })
      ) {
        return
      }

      await queryClient.prefetchQuery({
        queryFn: async ({ signal }) =>
          await loadCart({
            autoUpdateRegion: resolvedInput.autoUpdateRegion ?? true,
            canCreate,
            cartId,
            input: resolvedInput,
            signal,
          }),
        queryKey,
        ...prefetchCacheOptions,
      })
    }

    return { prefetchCart }
  }

  return {
    useAddLineItem,
    useCart,
    useCompleteCart,
    useCreateCart,
    usePrefetchCart,
    useRemoveLineItem,
    useSuspenseCart,
    useTransferCart,
    useUpdateCart,
    useUpdateCartAddress,
    useUpdateLineItem,
  }
}

export type CartHooks<
  TCart extends CartLike,
  TCreateInput extends CartCreateInputBase,
  TCreateParams = NormalizedCartCreatePayload<TCreateInput>,
  TUpdateInput extends UpdateCartInputBase = UpdateCartInputBase,
  TUpdateParams = NormalizedCartUpdatePayload<TUpdateInput>,
  TAddInput extends AddLineItemInputBase = AddLineItemInputBase,
  TAddParams = NormalizedAddLineItemPayload<TAddInput>,
  TUpdateItemInput extends UpdateLineItemInputBase = UpdateLineItemInputBase,
  TUpdateItemParams = NormalizedUpdateLineItemPayload<TUpdateItemInput>,
  TCompleteResult = unknown,
  TAddressInput = Record<string, unknown>,
  TAddressPayload = Record<string, unknown>,
> = ReturnType<
  typeof createCartHooks<
    TCart,
    TCreateInput,
    TCreateParams,
    TUpdateInput,
    TUpdateParams,
    TAddInput,
    TAddParams,
    TUpdateItemInput,
    TUpdateItemParams,
    TCompleteResult,
    TAddressInput,
    TAddressPayload
  >
>
