import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { useCallback, useEffect } from "react"
import { type CacheConfig, createCacheConfig } from "../shared/cache-config"
import type { ReadQueryOptions, SuspenseQueryOptions } from "../shared/hook-types"
import type { QueryNamespace } from "../shared/query-keys"
import type { RegionInfo } from "../shared/region"
import { useRegionContext } from "../shared/region-context"
import { createCartQueryKeys } from "./query-keys"
import type {
  AddLineItemInputBase,
  CartAddressInputBase,
  CartAddressValidationResult,
  CartCreateInputBase,
  CartInputBase,
  CartLike,
  CartQueryKeys,
  CartService,
  CartStorage,
  RemoveLineItemInputBase,
  TransferCartInputBase,
  UpdateCartInputBase,
  UpdateLineItemInputBase,
  UseCartResult,
  UseSuspenseCartResult,
} from "./types"

type CacheStrategy = keyof CacheConfig

const normalizeCartCreatePayload = <TInput extends CartCreateInputBase>(
  input: TInput
): TInput => {
  const {
    cartId: _cartId,
    autoCreate: _autoCreate,
    autoUpdateRegion: _autoUpdateRegion,
    enabled: _enabled,
    variantId: _variantId,
    quantity: _quantity,
    useSameAddress: _useSameAddress,
    shippingAddress: _shippingAddress,
    billingAddress: _billingAddress,
    salesChannelId,
    ...rest
  } = input as CartCreateInputBase & {
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

  if (salesChannelId) {
    return {
      ...rest,
      sales_channel_id: salesChannelId,
    } as unknown as TInput
  }

  return rest as TInput
}

const normalizeCartUpdatePayload = <TInput extends UpdateCartInputBase>(
  input: TInput
): TInput => {
  const {
    cartId: _cartId,
    autoCreate: _autoCreate,
    autoUpdateRegion: _autoUpdateRegion,
    enabled: _enabled,
    variantId: _variantId,
    quantity: _quantity,
    useSameAddress: _useSameAddress,
    shippingAddress: _shippingAddress,
    billingAddress: _billingAddress,
    salesChannelId,
    ...rest
  } = input as UpdateCartInputBase & {
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

  if (salesChannelId) {
    return {
      ...rest,
      sales_channel_id: salesChannelId,
    } as unknown as TInput
  }

  return rest as TInput
}

const normalizeAddLineItemPayload = <TInput extends AddLineItemInputBase>(
  input: TInput
): TInput => {
  const {
    cartId: _cartId,
    autoCreate: _autoCreate,
    autoUpdateRegion: _autoUpdateRegion,
    enabled: _enabled,
    region_id: _regionId,
    country_code: _countryCode,
    salesChannelId: _salesChannelId,
    ...rest
  } = input as AddLineItemInputBase & {
    cartId?: string
    autoCreate?: boolean
    autoUpdateRegion?: boolean
    enabled?: boolean
    region_id?: string
    country_code?: string
    salesChannelId?: string
  }

  return rest as TInput
}

const normalizeUpdateLineItemPayload = <TInput extends UpdateLineItemInputBase>(
  input: TInput
): TInput => {
  const {
    cartId: _cartId,
    lineItemId: _lineItemId,
    enabled: _enabled,
    autoCreate: _autoCreate,
    autoUpdateRegion: _autoUpdateRegion,
    ...rest
  } = input as UpdateLineItemInputBase & {
    cartId?: string
    lineItemId?: string
    enabled?: boolean
    autoCreate?: boolean
    autoUpdateRegion?: boolean
  }

  return rest as TInput
}

const applyRegion = <T extends RegionInfo>(
  input: T,
  region?: RegionInfo | null
): T => {
  if (!region) {
    return input
  }

  return {
    ...region,
    ...input,
  }
}

const getItemCount = (cart: CartLike | null): number => {
  if (!cart?.items?.length) {
    return 0
  }

  return cart.items.reduce((acc, item) => acc + (item.quantity ?? 0), 0)
}

const handleAddressValidation = (result: CartAddressValidationResult) => {
  if (!result) {
    return
  }
  if (result instanceof Error) {
    throw result
  }
  if (Array.isArray(result)) {
    throw new Error(result.filter(Boolean).join(", "))
  }
  if (typeof result === "string") {
    throw new Error(result)
  }
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
> = {
  service: CartService<
    TCart,
    TCreateParams,
    TUpdateParams,
    TAddParams,
    TUpdateItemParams,
    TCompleteResult
  >
  buildCreateParams?: (input: TCreateInput) => TCreateParams
  buildUpdateParams?: (input: TUpdateInput) => TUpdateParams
  buildAddParams?: (input: TAddInput) => TAddParams
  buildUpdateItemParams?: (input: TUpdateItemInput) => TUpdateItemParams
  queryKeys?: CartQueryKeys
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
  requireRegion?: boolean
  cartStorage?: CartStorage
  isNotFoundError?: (error: unknown) => boolean
  normalizeShippingAddressInput?: (input: TAddressInput) => TAddressInput
  normalizeBillingAddressInput?: (input: TAddressInput) => TAddressInput
  validateShippingAddressInput?: (
    input: TAddressInput
  ) => CartAddressValidationResult
  validateBillingAddressInput?: (
    input: TAddressInput
  ) => CartAddressValidationResult
  buildShippingAddress?: (input: TAddressInput) => TAddressPayload
  buildBillingAddress?: (input: TAddressInput) => TAddressPayload
  invalidateOnSuccess?: boolean
}

export type CartMutationOptions<TData, TVariables, TContext = unknown> = {
  onSuccess?: (
    data: TData,
    variables: TVariables,
    context: TContext | undefined
  ) => void
  onError?: (
    error: unknown,
    variables: TVariables,
    context: TContext | undefined
  ) => void
  onMutate?: (
    variables: TVariables
  ) => TContext | void | Promise<TContext | void>
  onSettled?: (
    data: TData | undefined,
    error: unknown | null,
    variables: TVariables,
    context: TContext | undefined
  ) => void
}

export function createCartHooks<
  TCart extends CartLike,
  TCreateInput extends CartCreateInputBase,
  TCreateParams = TCreateInput,
  TUpdateInput extends UpdateCartInputBase = UpdateCartInputBase,
  TUpdateParams = TUpdateInput,
  TAddInput extends AddLineItemInputBase = AddLineItemInputBase,
  TAddParams = TAddInput,
  TUpdateItemInput extends UpdateLineItemInputBase = UpdateLineItemInputBase,
  TUpdateItemParams = TUpdateItemInput,
  TCompleteResult = unknown,
  TAddressInput = Record<string, unknown>,
  TAddressPayload = Record<string, unknown>,
>({
  service,
  buildCreateParams,
  buildUpdateParams,
  buildAddParams,
  buildUpdateItemParams,
  queryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
  requireRegion = true,
  cartStorage,
  isNotFoundError,
  normalizeShippingAddressInput,
  normalizeBillingAddressInput,
  validateShippingAddressInput,
  validateBillingAddressInput,
  buildShippingAddress,
  buildBillingAddress,
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
>) {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys = queryKeys ?? createCartQueryKeys(queryKeyNamespace)
  const buildCreate =
    buildCreateParams ??
    ((input: TCreateInput) =>
      normalizeCartCreatePayload(input) as unknown as TCreateParams)
  const buildUpdate =
    buildUpdateParams ??
    ((input: TUpdateInput) =>
      normalizeCartUpdatePayload(input) as unknown as TUpdateParams)
  const buildAdd =
    buildAddParams ??
    ((input: TAddInput) =>
      normalizeAddLineItemPayload(input) as unknown as TAddParams)
  const buildUpdateItem =
    buildUpdateItemParams ??
    ((input: TUpdateItemInput) =>
      normalizeUpdateLineItemPayload(input) as unknown as TUpdateItemParams)
  const buildShipping =
    buildShippingAddress ??
    ((input: TAddressInput) => input as unknown as TAddressPayload)
  const buildBilling =
    buildBillingAddress ?? ((input: TAddressInput) => buildShipping(input))

  const resolveCartId = (inputCartId?: string | null): string | null =>
    inputCartId ?? cartStorage?.getCartId() ?? null

  const persistCartId = (cartId: string) => {
    cartStorage?.setCartId(cartId)
  }

  const clearCartId = () => {
    cartStorage?.clearCartId()
  }

  const invalidateCart = (
    queryClient: ReturnType<typeof useQueryClient>,
    cart: CartLike | null
  ) => {
    if (!invalidateOnSuccess || !cart?.id) {
      return
    }

    queryClient.invalidateQueries({
      queryKey: resolvedQueryKeys.active({
        cartId: cart.id,
        regionId: cart.region_id ?? null,
      }),
    })
  }

  type LoadCartOptions = {
    input: CartInputBase
    cartId: string | null
    canCreate: boolean
    autoUpdateRegion: boolean
    signal?: AbortSignal
  }

  const loadCart = async ({
    input,
    cartId,
    canCreate,
    autoUpdateRegion,
    signal,
  }: LoadCartOptions): Promise<TCart | null> => {
    if (!cartId) {
      if (!canCreate) {
        return null
      }
      const created = await service.createCart(
        buildCreate(input as TCreateInput)
      )
      persistCartId(created.id)
      return created
    }

    try {
      const cart = await service.retrieveCart(cartId, signal)

      if (!cart) {
        clearCartId()
        if (canCreate) {
          const created = await service.createCart(
            buildCreate(input as TCreateInput)
          )
          persistCartId(created.id)
          return created
        }
        return null
      }

      if (
        autoUpdateRegion &&
        input.region_id &&
        cart.region_id &&
        cart.region_id !== input.region_id &&
        service.updateCart
      ) {
        const updated = await service.updateCart(
          cartId,
          buildUpdate({
            ...(input as TUpdateInput),
            region_id: input.region_id,
          })
        )
        return updated
      }

      return cart
    } catch (error) {
      if (isNotFoundError?.(error)) {
        clearCartId()
        if (canCreate) {
          const created = await service.createCart(
            buildCreate(input as TCreateInput)
          )
          persistCartId(created.id)
          return created
        }
        return null
      }
      throw error
    }
  }

  const syncCartCache = (
    queryClient: ReturnType<typeof useQueryClient>,
    queryKeys: CartQueryKeys,
    cart: CartLike | null,
    cartId: string | null,
    regionId: string | null
  ) => {
    if (!cart?.id) {
      return
    }
    const nextRegionId = cart.region_id ?? regionId ?? null
    const nextKey = queryKeys.active({
      cartId: cart.id,
      regionId: nextRegionId,
    })
    queryClient.setQueryData(nextKey, cart)
    if (cartId !== cart.id) {
      const previousKey = queryKeys.active({
        cartId,
        regionId,
      })
      queryClient.removeQueries({ queryKey: previousKey, exact: true })
    }
  }

  function useCart(
    input: CartInputBase,
    options?: { queryOptions?: ReadQueryOptions<TCart | null> }
  ): UseCartResult<TCart> {
    const queryClient = useQueryClient()
    const contextRegion = useRegionContext()
    const resolvedInput = applyRegion(input, contextRegion ?? undefined)
    const cartId = resolveCartId(resolvedInput.cartId)
    const autoCreate = resolvedInput.autoCreate ?? true
    const autoUpdateRegion = resolvedInput.autoUpdateRegion ?? true
    const canCreate =
      autoCreate && (!requireRegion || Boolean(resolvedInput.region_id))
    const enabled = resolvedInput.enabled ?? (Boolean(cartId) || canCreate)

    const query = useQuery({
      queryKey: resolvedQueryKeys.active({
        cartId,
        regionId: resolvedInput.region_id ?? null,
      }),
      queryFn: ({ signal }) =>
        loadCart({
          input: resolvedInput,
          cartId,
          canCreate,
          autoUpdateRegion,
          signal,
        }),
      enabled,
      ...resolvedCacheConfig.realtime,
      ...(options?.queryOptions ?? {}),
    })
    const { data, isLoading, isFetching, isSuccess, error } = query

    const cart = data ?? null
    const itemCount = getItemCount(cart)

    useEffect(() => {
      syncCartCache(
        queryClient,
        resolvedQueryKeys,
        cart,
        cartId,
        resolvedInput.region_id ?? null
      )
    }, [cart, cartId, queryClient, resolvedInput.region_id, resolvedQueryKeys])

    return {
      cart,
      isLoading,
      isFetching,
      isSuccess,
      error:
        error instanceof Error ? error.message : error ? String(error) : null,
      itemCount,
      isEmpty: itemCount === 0,
      hasItems: itemCount > 0,
      query,
    }
  }

  function useSuspenseCart(
    input: CartInputBase,
    options?: { queryOptions?: SuspenseQueryOptions<TCart | null> }
  ): UseSuspenseCartResult<TCart> {
    const queryClient = useQueryClient()
    const contextRegion = useRegionContext()
    const resolvedInput = applyRegion(input, contextRegion ?? undefined)
    const cartId = resolveCartId(resolvedInput.cartId)
    const autoCreate = resolvedInput.autoCreate ?? true
    const autoUpdateRegion = resolvedInput.autoUpdateRegion ?? true
    const canCreate =
      autoCreate && (!requireRegion || Boolean(resolvedInput.region_id))

    const query = useSuspenseQuery({
      queryKey: resolvedQueryKeys.active({
        cartId,
        regionId: resolvedInput.region_id ?? null,
      }),
      queryFn: ({ signal }) =>
        loadCart({
          input: resolvedInput,
          cartId,
          canCreate,
          autoUpdateRegion,
          signal,
        }),
      ...resolvedCacheConfig.realtime,
      ...(options?.queryOptions ?? {}),
    })
    const { data, isFetching } = query

    const cart = data ?? null
    const itemCount = getItemCount(cart)

    useEffect(() => {
      syncCartCache(
        queryClient,
        resolvedQueryKeys,
        cart,
        cartId,
        resolvedInput.region_id ?? null
      )
    }, [cart, cartId, queryClient, resolvedInput.region_id, resolvedQueryKeys])

    return {
      cart,
      isLoading: false,
      isFetching,
      isSuccess: true,
      error: null,
      itemCount,
      isEmpty: itemCount === 0,
      hasItems: itemCount > 0,
      query,
    }
  }

  function useCreateCart(options?: CartMutationOptions<TCart, TCreateInput>) {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: (input: TCreateInput) =>
        service.createCart(buildCreate(input)),
      onMutate: options?.onMutate,
      onSuccess: (cart, variables, context) => {
        persistCartId(cart.id)
        queryClient.setQueryData(
          resolvedQueryKeys.active({
            cartId: cart.id,
            regionId: cart.region_id ?? null,
          }),
          cart
        )
        invalidateCart(queryClient, cart)
        options?.onSuccess?.(cart, variables, context)
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
    })
  }

  function useUpdateCart(options?: CartMutationOptions<TCart, TUpdateInput>) {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: (input: TUpdateInput) => {
        if (!service.updateCart) {
          throw new Error("updateCart service is not configured")
        }
        const cartId = resolveCartId(input.cartId)
        if (!cartId) {
          throw new Error("Cart id is required")
        }
        return service.updateCart(cartId, buildUpdate(input))
      },
      onMutate: options?.onMutate,
      onSuccess: (cart, variables, context) => {
        queryClient.setQueryData(
          resolvedQueryKeys.active({
            cartId: cart.id,
            regionId: cart.region_id ?? null,
          }),
          cart
        )
        invalidateCart(queryClient, cart)
        options?.onSuccess?.(cart, variables, context)
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
    })
  }

  function useUpdateCartAddress(
    options?: CartMutationOptions<TCart, CartAddressInputBase<TAddressInput>>
  ) {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: (input: CartAddressInputBase<TAddressInput>) => {
        if (!service.updateCart) {
          throw new Error("updateCart service is not configured")
        }
        const cartId = resolveCartId(input.cartId)
        if (!cartId) {
          throw new Error("Cart id is required")
        }
        const {
          shippingAddress,
          billingAddress,
          useSameAddress,
          ...restInput
        } = input as CartAddressInputBase<TAddressInput> & {
          shippingAddress: TAddressInput
          billingAddress?: TAddressInput
          useSameAddress?: boolean
        }
        const normalizedShipping = normalizeShippingAddressInput
          ? normalizeShippingAddressInput(shippingAddress)
          : shippingAddress
        handleAddressValidation(
          validateShippingAddressInput?.(normalizedShipping)
        )
        const resolvedBillingInput =
          useSameAddress || !billingAddress
            ? normalizedShipping
            : normalizeBillingAddressInput
              ? normalizeBillingAddressInput(billingAddress)
              : billingAddress
        if (resolvedBillingInput) {
          handleAddressValidation(
            validateBillingAddressInput?.(resolvedBillingInput)
          )
        }
        const updateInput = {
          ...(restInput as unknown as TUpdateInput),
          shipping_address: buildShipping(normalizedShipping),
          billing_address: resolvedBillingInput
            ? buildBilling(resolvedBillingInput)
            : undefined,
        } as TUpdateInput & {
          shipping_address?: TAddressPayload
          billing_address?: TAddressPayload
        }
        return service.updateCart(cartId, buildUpdate(updateInput))
      },
      onMutate: options?.onMutate,
      onSuccess: (cart, variables, context) => {
        queryClient.setQueryData(
          resolvedQueryKeys.active({
            cartId: cart.id,
            regionId: cart.region_id ?? null,
          }),
          cart
        )
        invalidateCart(queryClient, cart)
        options?.onSuccess?.(cart, variables, context)
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
    })
  }

  function useAddLineItem(options?: CartMutationOptions<TCart, TAddInput>) {
    const contextRegion = useRegionContext()
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: async (input: TAddInput) => {
        if (!service.addLineItem) {
          throw new Error("addLineItem service is not configured")
        }

        const resolvedInput = applyRegion(input, contextRegion ?? undefined)
        let cartId = resolveCartId(resolvedInput.cartId)
        const autoCreate = resolvedInput.autoCreate ?? true
        const canCreate =
          autoCreate && (!requireRegion || Boolean(resolvedInput.region_id))

        if (!cartId) {
          if (!canCreate) {
            throw new Error("Cart id is required")
          }
          const created = await service.createCart(
            buildCreate(resolvedInput as unknown as TCreateInput)
          )
          persistCartId(created.id)
          cartId = created.id
          queryClient.setQueryData(
            resolvedQueryKeys.active({
              cartId: created.id,
              regionId: created.region_id ?? null,
            }),
            created
          )
        }

        const updated = await service.addLineItem(
          cartId,
          buildAdd(resolvedInput)
        )
        persistCartId(updated.id)
        return updated
      },
      onMutate: options?.onMutate,
      onSuccess: (cart, variables, context) => {
        queryClient.setQueryData(
          resolvedQueryKeys.active({
            cartId: cart.id,
            regionId: cart.region_id ?? null,
          }),
          cart
        )
        invalidateCart(queryClient, cart)
        options?.onSuccess?.(cart, variables, context)
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
    })
  }

  function useUpdateLineItem(
    options?: CartMutationOptions<TCart, TUpdateItemInput>
  ) {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: (input: TUpdateItemInput) => {
        if (!service.updateLineItem) {
          throw new Error("updateLineItem service is not configured")
        }
        const cartId = resolveCartId(input.cartId)
        if (!cartId) {
          throw new Error("Cart id is required")
        }
        return service.updateLineItem(
          cartId,
          input.lineItemId,
          buildUpdateItem(input)
        )
      },
      onMutate: options?.onMutate,
      onSuccess: (cart, variables, context) => {
        queryClient.setQueryData(
          resolvedQueryKeys.active({
            cartId: cart.id,
            regionId: cart.region_id ?? null,
          }),
          cart
        )
        invalidateCart(queryClient, cart)
        options?.onSuccess?.(cart, variables, context)
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
    })
  }

  function useRemoveLineItem(
    options?: CartMutationOptions<TCart, RemoveLineItemInputBase>
  ) {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: (input: RemoveLineItemInputBase) => {
        if (!service.removeLineItem) {
          throw new Error("removeLineItem service is not configured")
        }
        const cartId = resolveCartId(input.cartId)
        if (!cartId) {
          throw new Error("Cart id is required")
        }
        return service.removeLineItem(cartId, input.lineItemId)
      },
      onMutate: options?.onMutate,
      onSuccess: (cart, variables, context) => {
        queryClient.setQueryData(
          resolvedQueryKeys.active({
            cartId: cart.id,
            regionId: cart.region_id ?? null,
          }),
          cart
        )
        invalidateCart(queryClient, cart)
        options?.onSuccess?.(cart, variables, context)
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
    })
  }

  function useTransferCart(
    options?: CartMutationOptions<TCart, TransferCartInputBase>
  ) {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: (input: TransferCartInputBase) => {
        if (!service.transferCart) {
          throw new Error("transferCart service is not configured")
        }
        const cartId = resolveCartId(input.cartId)
        if (!cartId) {
          throw new Error("Cart id is required")
        }
        return service.transferCart(cartId)
      },
      onMutate: options?.onMutate,
      onSuccess: (cart, variables, context) => {
        queryClient.setQueryData(
          resolvedQueryKeys.active({
            cartId: cart.id,
            regionId: cart.region_id ?? null,
          }),
          cart
        )
        invalidateCart(queryClient, cart)
        options?.onSuccess?.(cart, variables, context)
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
    })
  }

  function useCompleteCart(
    options?: CartMutationOptions<TCompleteResult, { cartId?: string }> & {
      clearCartOnSuccess?: boolean
    }
  ) {
    return useMutation({
      mutationFn: (input: { cartId?: string }) => {
        if (!service.completeCart) {
          throw new Error("completeCart service is not configured")
        }
        const cartId = resolveCartId(input.cartId)
        if (!cartId) {
          throw new Error("Cart id is required")
        }
        return service.completeCart(cartId)
      },
      onMutate: options?.onMutate,
      onSuccess: (data, variables, context) => {
        if (options?.clearCartOnSuccess === true) {
          clearCartId()
        }
        options?.onSuccess?.(data, variables, context)
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
    })
  }

  function usePrefetchCart(options?: {
    cacheStrategy?: CacheStrategy
    skipIfCached?: boolean
  }) {
    const queryClient = useQueryClient()
    const contextRegion = useRegionContext()
    const cacheStrategy = options?.cacheStrategy ?? "realtime"
    const skipIfCached = options?.skipIfCached ?? true

    const prefetchCart = useCallback(
      async (input: CartInputBase) => {
        const resolvedInput = applyRegion(input, contextRegion ?? undefined)
        const cartId = resolveCartId(resolvedInput.cartId)
        const autoCreate = resolvedInput.autoCreate ?? true
        const canCreate =
          autoCreate && (!requireRegion || Boolean(resolvedInput.region_id))

        const queryKey = resolvedQueryKeys.active({
          cartId,
          regionId: resolvedInput.region_id ?? null,
        })

        if (skipIfCached && queryClient.getQueryData(queryKey)) {
          return
        }

        await queryClient.prefetchQuery({
          queryKey,
          queryFn: ({ signal }) =>
            loadCart({
              input: resolvedInput,
              cartId,
              canCreate,
              autoUpdateRegion: resolvedInput.autoUpdateRegion ?? true,
              signal,
            }),
          ...resolvedCacheConfig[cacheStrategy],
        })
      },
      [cacheStrategy, queryClient, contextRegion, skipIfCached]
    )

    return { prefetchCart }
  }

  return {
    useCart,
    useSuspenseCart,
    useCreateCart,
    useUpdateCart,
    useUpdateCartAddress,
    useAddLineItem,
    useUpdateLineItem,
    useRemoveLineItem,
    useTransferCart,
    useCompleteCart,
    usePrefetchCart,
  }
}

