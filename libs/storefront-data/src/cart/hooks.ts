import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { useCallback, useEffect } from "react"
import {
  type CacheConfig,
  createCacheConfig,
  getPrefetchCacheOptions,
} from "../shared/cache-config"
import type {
  MutationOptions,
  ReadQueryOptions,
  SuspenseQueryOptions,
} from "../shared/hook-types"
import { omitKeys } from "../shared/object-utils"
import { shouldSkipPrefetch, type PrefetchSkipMode } from "../shared/prefetch"
import type { QueryNamespace } from "../shared/query-keys"
import { applyRegion } from "../shared/region"
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

type CartTransientInput = {
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

type AddLineItemTransientInput = {
  cartId?: string
  autoCreate?: boolean
  autoUpdateRegion?: boolean
  enabled?: boolean
  region_id?: string
  country_code?: string
  salesChannelId?: string
}

type UpdateLineItemTransientInput = {
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

type NormalizedUpdateLineItemPayload<
  TInput extends UpdateLineItemInputBase,
> = Omit<
  TInput & UpdateLineItemTransientInput,
  (typeof updateLineItemPayloadOmitKeys)[number]
>

const normalizeCartCreatePayload = <TInput extends CartCreateInputBase>(
  input: TInput
): NormalizedCartCreatePayload<TInput> => {
  const normalizedInput = input as TInput & CartCreateTransientInput
  const payload = omitKeys(normalizedInput, cartPayloadOmitKeys)
  const salesChannelId = normalizedInput.salesChannelId

  if (!salesChannelId) {
    return payload
  }

  return {
    ...payload,
    sales_channel_id: salesChannelId,
  }
}

const normalizeCartUpdatePayload = <TInput extends UpdateCartInputBase>(
  input: TInput
): NormalizedCartUpdatePayload<TInput> => {
  const normalizedInput = input as TInput & CartUpdateTransientInput
  const payload = omitKeys(normalizedInput, cartPayloadOmitKeys)
  const salesChannelId = normalizedInput.salesChannelId

  if (!salesChannelId) {
    return payload
  }

  return {
    ...payload,
    sales_channel_id: salesChannelId,
  }
}

const normalizeAddLineItemPayload = <TInput extends AddLineItemInputBase>(
  input: TInput
): NormalizedAddLineItemPayload<TInput> =>
  omitKeys(
    input as TInput & AddLineItemTransientInput,
    addLineItemPayloadOmitKeys
  )

const normalizeUpdateLineItemPayload = <TInput extends UpdateLineItemInputBase>(
  input: TInput
): NormalizedUpdateLineItemPayload<TInput> =>
  omitKeys(
    input as TInput & UpdateLineItemTransientInput,
    updateLineItemPayloadOmitKeys
  )

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
> = [NormalizedUpdateLineItemPayload<TUpdateItemInput>] extends [TUpdateItemParams]
  ? { buildUpdateItemParams?: (input: TUpdateItemInput) => TUpdateItemParams }
  : { buildUpdateItemParams: (input: TUpdateItemInput) => TUpdateItemParams }

type CreateCartHooksBaseConfig<
  TCart extends CartLike,
  TCreateParams,
  TUpdateParams,
  TAddParams,
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

export type CartMutationOptions<TData, TVariables, TContext = unknown> =
  MutationOptions<TData, TVariables, TContext>

export function createCartHooks<
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
  // CreateCartHooksConfig conditional types require custom builders whenever
  // default normalized payloads are incompatible with custom param types.
  const buildCreate: ParamBuilder<TCreateInput, TCreateParams> =
    buildCreateParams ??
    ((input: TCreateInput) =>
      normalizeCartCreatePayload(input) as TCreateParams)
  const buildUpdate: ParamBuilder<TUpdateInput, TUpdateParams> =
    buildUpdateParams ??
    ((input: TUpdateInput) =>
      normalizeCartUpdatePayload(input) as TUpdateParams)
  const buildAdd: ParamBuilder<TAddInput, TAddParams> =
    buildAddParams ??
    ((input: TAddInput) => normalizeAddLineItemPayload(input) as TAddParams)
  const buildCreateInputFromAdd: ParamBuilder<TAddInput, TCreateInput> =
    buildCreateInputFromAddInput ??
    ((input: TAddInput) => input as TAddInput & TCreateInput)
  const buildUpdateItem: ParamBuilder<TUpdateItemInput, TUpdateItemParams> =
    buildUpdateItemParams ??
    ((input: TUpdateItemInput) =>
      normalizeUpdateLineItemPayload(input) as TUpdateItemParams)
  const buildShipping: ParamBuilder<TAddressInput, TAddressPayload> =
    buildShippingAddress ??
    ((input: TAddressInput) => input as TAddressInput & TAddressPayload)
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

  const requireUpdateCartService = () => {
    if (!service.updateCart) {
      throw new Error("updateCart service is not configured")
    }
    return service.updateCart
  }

  const requireCartId = (inputCartId?: string | null): string => {
    const cartId = resolveCartId(inputCartId)
    if (!cartId) {
      throw new Error("Cart id is required")
    }
    return cartId
  }

  const resolveBillingAddressInput = (
    useSameAddress: boolean | undefined,
    billingAddress: TAddressInput | undefined,
    normalizedShipping: TAddressInput
  ): TAddressInput | undefined => {
    if (useSameAddress || !billingAddress) {
      return normalizedShipping
    }
    return normalizeBillingAddressInput
      ? normalizeBillingAddressInput(billingAddress)
      : billingAddress
  }

  const resolveAddressMutationInput = (
    input: CartAddressInputBase<TAddressInput>
  ) => {
    const {
      shippingAddress,
      billingAddress,
      useSameAddress,
      ...restInput
    } = input as AddressMutationInput<TAddressInput>
    const normalizedShipping = normalizeShippingAddressInput
      ? normalizeShippingAddressInput(shippingAddress)
      : shippingAddress
    const resolvedBillingInput = resolveBillingAddressInput(
      useSameAddress,
      billingAddress,
      normalizedShipping
    )

    return {
      restInput,
      normalizedShipping,
      resolvedBillingInput,
    }
  }

  const validateAddressInputs = (
    shippingInput: TAddressInput,
    billingInput: TAddressInput | undefined
  ) => {
    handleAddressValidation(validateShippingAddressInput?.(shippingInput))
    if (!billingInput) {
      return
    }
    handleAddressValidation(validateBillingAddressInput?.(billingInput))
  }

  const buildAddressUpdateInput = (
    restInput: Omit<AddressMutationInput<TAddressInput>, "shippingAddress" | "billingAddress" | "useSameAddress">,
    normalizedShipping: TAddressInput,
    resolvedBillingInput: TAddressInput | undefined
  ) =>
    ({
      ...(restInput as TUpdateInput),
      shipping_address: buildShipping(normalizedShipping),
      billing_address: resolvedBillingInput
        ? buildBilling(resolvedBillingInput)
        : undefined,
    }) as TUpdateInput & {
      shipping_address?: TAddressPayload
      billing_address?: TAddressPayload
    }

  const invalidateCart = (
    queryClient: ReturnType<typeof useQueryClient>,
    cart: CartLike | null
  ) => {
    const cartId = cart?.id
    if (!invalidateOnSuccess || !cartId) {
      return
    }

    queryClient.invalidateQueries({
      queryKey: resolvedQueryKeys.active({
        cartId,
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

  const createCartFromInput = async (input: CartInputBase): Promise<TCart> => {
    const created = await service.createCart(buildCreate(input as TCreateInput))
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
    const createIfAllowed = async (): Promise<TCart | null> => {
      if (!canCreate) {
        return null
      }
      return createCartFromInput(input)
    }

    const resolveRegionUpdate = async (cart: TCart): Promise<TCart> => {
      if (
        !autoUpdateRegion ||
        !input.region_id ||
        !cart.region_id ||
        cart.region_id === input.region_id ||
        !service.updateCart
      ) {
        return cart
      }

      return service.updateCart(
        cart.id,
        buildUpdate({
          ...(input as TUpdateInput),
          region_id: input.region_id,
        })
      )
    }

    if (!cartId) {
      return createIfAllowed()
    }

    try {
      const cart = await service.retrieveCart(cartId, signal)

      if (!cart) {
        clearCartId()
        return createIfAllowed()
      }

      return resolveRegionUpdate(cart)
    } catch (error) {
      if (!isNotFoundError?.(error)) {
        throw error
      }

      clearCartId()
      return createIfAllowed()
    }
  }

  const syncCartCache = (
    queryClient: ReturnType<typeof useQueryClient>,
    cart: CartLike | null,
    previousCartId: string | null,
    previousRegionId: string | null
  ) => {
    if (!cart?.id) {
      return
    }
    const nextRegionId = cart.region_id ?? previousRegionId ?? null
    const nextKey = resolvedQueryKeys.active({
      cartId: cart.id,
      regionId: nextRegionId,
    })
    queryClient.setQueryData(nextKey, cart)
    if (previousCartId !== cart.id) {
      const previousKey = resolvedQueryKeys.active({
        cartId: previousCartId,
        regionId: previousRegionId,
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
        cart,
        cartId,
        resolvedInput.region_id ?? null
      )
    }, [cart, cartId, queryClient, resolvedInput.region_id])

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
        cart,
        cartId,
        resolvedInput.region_id ?? null
      )
    }, [cart, cartId, queryClient, resolvedInput.region_id])

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
        const updateCartService = requireUpdateCartService()
        const cartId = requireCartId(input.cartId)
        const { restInput, normalizedShipping, resolvedBillingInput } =
          resolveAddressMutationInput(input)

        validateAddressInputs(normalizedShipping, resolvedBillingInput)

        const updateInput = buildAddressUpdateInput(
          restInput,
          normalizedShipping,
          resolvedBillingInput
        )

        return updateCartService(cartId, buildUpdate(updateInput))
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
            buildCreate(buildCreateInputFromAdd(resolvedInput))
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
    skipMode?: PrefetchSkipMode
  }) {
    const queryClient = useQueryClient()
    const contextRegion = useRegionContext()
    const cacheStrategy = options?.cacheStrategy ?? "realtime"
    const skipIfCached = options?.skipIfCached ?? true
    const skipMode = options?.skipMode ?? "fresh"
    const prefetchCacheOptions = getPrefetchCacheOptions(
      resolvedCacheConfig,
      cacheStrategy
    )

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

        if (
          shouldSkipPrefetch({
            queryClient,
            queryKey,
            cacheOptions: prefetchCacheOptions,
            skipIfCached,
            skipMode,
          })
        ) {
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
          ...prefetchCacheOptions,
        })
      },
      [contextRegion, prefetchCacheOptions, queryClient, skipIfCached, skipMode]
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
