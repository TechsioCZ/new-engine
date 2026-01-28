import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createCacheConfig, type CacheConfig } from "../shared/cache-config"
import type { QueryNamespace } from "../shared/query-keys"
import type { RegionInfo } from "../shared/region"
import { createCartQueryKeys } from "./query-keys"
import type {
  AddLineItemInputBase,
  CartAddressInputBase,
  CartAddressValidationResult,
  CartCreateInputBase,
  CartLike,
  CartQueryKeys,
  CartService,
  CartStorage,
  CartInputBase,
  RemoveLineItemInputBase,
  TransferCartInputBase,
  UpdateCartInputBase,
  UpdateLineItemInputBase,
  UseCartResult,
  UseSuspenseCartResult,
} from "./types"

type CacheStrategy = keyof CacheConfig

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
  resolveRegion?: () => RegionInfo | null
  resolveRegionSuspense?: () => RegionInfo
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
}

export type CartMutationOptions<TData, TVariables> = {
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: unknown) => void
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
  resolveRegion,
  resolveRegionSuspense,
  cartStorage,
  isNotFoundError,
  normalizeShippingAddressInput,
  normalizeBillingAddressInput,
  validateShippingAddressInput,
  validateBillingAddressInput,
  buildShippingAddress,
  buildBillingAddress,
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
  const resolvedQueryKeys =
    queryKeys ?? createCartQueryKeys(queryKeyNamespace)
  const buildCreate =
    buildCreateParams ??
    ((input: TCreateInput) => input as unknown as TCreateParams)
  const buildUpdate =
    buildUpdateParams ??
    ((input: TUpdateInput) => input as unknown as TUpdateParams)
  const buildAdd =
    buildAddParams ??
    ((input: TAddInput) => input as unknown as TAddParams)
  const buildUpdateItem =
    buildUpdateItemParams ??
    ((input: TUpdateItemInput) => input as unknown as TUpdateItemParams)
  const buildShipping =
    buildShippingAddress ??
    ((input: TAddressInput) => input as unknown as TAddressPayload)
  const buildBilling =
    buildBillingAddress ?? ((input: TAddressInput) => buildShipping(input))

  const resolveCartId = (inputCartId?: string | null): string | null => {
    return inputCartId ?? cartStorage?.getCartId() ?? null
  }

  const persistCartId = (cartId: string) => {
    cartStorage?.setCartId(cartId)
  }

  const clearCartId = () => {
    cartStorage?.clearCartId()
  }

  const loadCart = async (
    input: CartInputBase,
    cartId: string | null,
    canCreate: boolean,
    autoUpdateRegion: boolean,
    signal?: AbortSignal
  ): Promise<TCart | null> => {
    if (!cartId) {
      if (!canCreate) {
        return null
      }
      const created = await service.createCart(buildCreate(input as TCreateInput))
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

  function useCart(input: CartInputBase): UseCartResult<TCart> {
    const region = resolveRegion ? resolveRegion() : null
    const resolvedInput = applyRegion(input, region ?? undefined)
    const cartId = resolveCartId(resolvedInput.cartId)
    const autoCreate = resolvedInput.autoCreate ?? true
    const autoUpdateRegion = resolvedInput.autoUpdateRegion ?? true
    const canCreate =
      autoCreate && (!requireRegion || Boolean(resolvedInput.region_id))
    const enabled = resolvedInput.enabled ?? (Boolean(cartId) || canCreate)

    const { data, isLoading, isFetching, isSuccess, error } = useQuery({
      queryKey: resolvedQueryKeys.active({
        cartId,
        regionId: resolvedInput.region_id ?? null,
      }),
      queryFn: ({ signal }) =>
        loadCart(resolvedInput, cartId, canCreate, autoUpdateRegion, signal),
      enabled,
      ...resolvedCacheConfig.realtime,
    })

    const cart = data ?? null
    const itemCount = getItemCount(cart)

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
    }
  }

  function useSuspenseCart(input: CartInputBase): UseSuspenseCartResult<TCart> {
    const region = resolveRegionSuspense
      ? resolveRegionSuspense()
      : resolveRegion?.()
    const resolvedInput = applyRegion(input, region ?? undefined)
    const cartId = resolveCartId(resolvedInput.cartId)
    const autoCreate = resolvedInput.autoCreate ?? true
    const autoUpdateRegion = resolvedInput.autoUpdateRegion ?? true
    const canCreate =
      autoCreate && (!requireRegion || Boolean(resolvedInput.region_id))

    const { data, isFetching } = useSuspenseQuery({
      queryKey: resolvedQueryKeys.active({
        cartId,
        regionId: resolvedInput.region_id ?? null,
      }),
      queryFn: ({ signal }) =>
        loadCart(resolvedInput, cartId, canCreate, autoUpdateRegion, signal),
      ...resolvedCacheConfig.realtime,
    })

    const cart = data ?? null
    const itemCount = getItemCount(cart)

    return {
      cart,
      isFetching,
      itemCount,
      isEmpty: itemCount === 0,
      hasItems: itemCount > 0,
    }
  }

  function useCreateCart(options?: CartMutationOptions<TCart, TCreateInput>) {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: (input: TCreateInput) =>
        service.createCart(buildCreate(input)),
      onSuccess: (cart, variables) => {
        persistCartId(cart.id)
        queryClient.setQueryData(
          resolvedQueryKeys.active({
            cartId: cart.id,
            regionId: cart.region_id ?? null,
          }),
          cart
        )
        options?.onSuccess?.(cart, variables)
      },
      onError: (error) => {
        options?.onError?.(error)
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
      onSuccess: (cart, variables) => {
        queryClient.setQueryData(
          resolvedQueryKeys.active({
            cartId: cart.id,
            regionId: cart.region_id ?? null,
          }),
          cart
        )
        options?.onSuccess?.(cart, variables)
      },
      onError: (error) => {
        options?.onError?.(error)
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
      onSuccess: (cart, variables) => {
        queryClient.setQueryData(
          resolvedQueryKeys.active({
            cartId: cart.id,
            regionId: cart.region_id ?? null,
          }),
          cart
        )
        options?.onSuccess?.(cart, variables)
      },
      onError: (error) => {
        options?.onError?.(error)
      },
    })
  }

  function useAddLineItem(options?: CartMutationOptions<TCart, TAddInput>) {
    const region = resolveRegion ? resolveRegion() : null
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: async (input: TAddInput) => {
        if (!service.addLineItem) {
          throw new Error("addLineItem service is not configured")
        }

        const resolvedInput = applyRegion(input, region ?? undefined)
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
      onSuccess: (cart, variables) => {
        queryClient.setQueryData(
          resolvedQueryKeys.active({
            cartId: cart.id,
            regionId: cart.region_id ?? null,
          }),
          cart
        )
        options?.onSuccess?.(cart, variables)
      },
      onError: (error) => {
        options?.onError?.(error)
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
      onSuccess: (cart, variables) => {
        queryClient.setQueryData(
          resolvedQueryKeys.active({
            cartId: cart.id,
            regionId: cart.region_id ?? null,
          }),
          cart
        )
        options?.onSuccess?.(cart, variables)
      },
      onError: (error) => {
        options?.onError?.(error)
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
      onSuccess: (cart, variables) => {
        queryClient.setQueryData(
          resolvedQueryKeys.active({
            cartId: cart.id,
            regionId: cart.region_id ?? null,
          }),
          cart
        )
        options?.onSuccess?.(cart, variables)
      },
      onError: (error) => {
        options?.onError?.(error)
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
      onSuccess: (cart, variables) => {
        queryClient.setQueryData(
          resolvedQueryKeys.active({
            cartId: cart.id,
            regionId: cart.region_id ?? null,
          }),
          cart
        )
        options?.onSuccess?.(cart, variables)
      },
      onError: (error) => {
        options?.onError?.(error)
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
      onSuccess: (data, variables) => {
        if (options?.clearCartOnSuccess === true) {
          clearCartId()
        }
        options?.onSuccess?.(data, variables)
      },
      onError: (error) => {
        options?.onError?.(error)
      },
    })
  }

  function usePrefetchCart(options?: {
    cacheStrategy?: CacheStrategy
    skipIfCached?: boolean
  }) {
    const queryClient = useQueryClient()
    const region = resolveRegion ? resolveRegion() : null
    const cacheStrategy = options?.cacheStrategy ?? "realtime"
    const skipIfCached = options?.skipIfCached ?? true

    const prefetchCart = async (input: CartInputBase) => {
      const resolvedInput = applyRegion(input, region ?? undefined)
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
          loadCart(
            resolvedInput,
            cartId,
            canCreate,
            resolvedInput.autoUpdateRegion ?? true,
            signal
          ),
        ...resolvedCacheConfig[cacheStrategy],
      })
    }

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
