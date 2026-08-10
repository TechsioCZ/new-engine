import type { HttpTypes } from "@medusajs/framework/types"
import type { ClientHeaders, FetchError } from "@medusajs/js-sdk"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { UseMutationOptions, UseQueryOptions } from "@tanstack/react-query"
import { omitKeys } from "@techsio/std/object"

import type {
  AdminCreateQuoteMessage,
  AdminQuoteResponse,
  QuoteFilterParams,
  StoreQuoteResponse,
  StoreQuotesResponse,
} from "../../../types"
import { queryKeysFactory } from "../../lib/query-key-factory"
import { sdk } from "../../lib/sdk"
import { orderPreviewQueryKey } from "./order-preview"

export const quoteQueryKey = queryKeysFactory("quote")

type UpdateQuoteItemPayload = HttpTypes.AdminUpdateOrderEditItem & {
  unit_price?: number
}

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, FetchError, TData>,
  "queryFn" | "queryKey"
>

const fetchQuotes = async (
  filters: QuoteFilterParams,
  headers?: ClientHeaders,
) =>
  await sdk.client.fetch<StoreQuotesResponse>("/admin/quotes", {
    query: filters,
    ...(headers ? { headers } : {}),
  })

export const useQuotes = (
  quoteQuery: QuoteFilterParams,
  options?: QueryOptions<StoreQuotesResponse>,
) => {
  const query = useQuery({
    ...options,
    queryFn: async () => await fetchQuotes(quoteQuery),
    queryKey: quoteQueryKey.list(quoteQuery),
  })

  return { ...query.data, ...omitKeys(query, ["data"]) }
}

const fetchQuote = async (
  quoteId: string,
  filters?: QuoteFilterParams,
  headers?: ClientHeaders,
) =>
  await sdk.client.fetch<StoreQuoteResponse>(`/admin/quotes/${quoteId}`, {
    ...(filters ? { query: filters } : {}),
    ...(headers ? { headers } : {}),
  })

export const useQuote = (
  id: string,
  quoteQuery?: QuoteFilterParams,
  options?: QueryOptions<StoreQuoteResponse>,
) => {
  const query = useQuery({
    queryFn: async () => await fetchQuote(id, quoteQuery),
    queryKey: quoteQueryKey.detail(id, quoteQuery),
    ...options,
  })

  return { ...query.data, ...omitKeys(query, ["data"]) }
}

export const useAddItemsToQuote = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderEditPreviewResponse,
    FetchError,
    HttpTypes.AdminAddOrderEditItems
  >,
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: HttpTypes.AdminAddOrderEditItems) =>
      await sdk.admin.orderEdit.addItems(id, payload),
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: orderPreviewQueryKey.detail(id),
      })

      await options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdateQuoteItem = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderEditPreviewResponse,
    FetchError,
    UpdateQuoteItemPayload & { itemId: string }
  >,
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      itemId,
      ...payload
    }: UpdateQuoteItemPayload & { itemId: string }) =>
      await sdk.admin.orderEdit.updateOriginalItem(id, itemId, payload),
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: orderPreviewQueryKey.detail(id),
      })

      await options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useRemoveQuoteItem = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderEditPreviewResponse,
    FetchError,
    string
  >,
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (actionId: string) =>
      await sdk.admin.orderEdit.removeAddedItem(id, actionId),
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: orderPreviewQueryKey.detail(id),
      })
      await options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdateAddedQuoteItem = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderEditPreviewResponse,
    FetchError,
    UpdateQuoteItemPayload & { actionId: string }
  >,
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      actionId,
      ...payload
    }: UpdateQuoteItemPayload & { actionId: string }) =>
      await sdk.admin.orderEdit.updateAddedItem(id, actionId, payload),
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: orderPreviewQueryKey.detail(id),
      })

      await options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useConfirmQuote = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderEditPreviewResponse,
    FetchError
  >,
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => await sdk.admin.orderEdit.request(id),
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: orderPreviewQueryKey.details(),
      })

      await options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

const sendQuote = async (quoteId: string) =>
  await sdk.client.fetch<AdminQuoteResponse>(`/admin/quotes/${quoteId}/send`, {
    method: "POST",
  })

export const useSendQuote = (
  id: string,
  options?: UseMutationOptions<AdminQuoteResponse, FetchError>,
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => await sendQuote(id),
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: orderPreviewQueryKey.details(),
      })

      await queryClient.invalidateQueries({
        queryKey: quoteQueryKey.details(),
      })

      await queryClient.invalidateQueries({
        queryKey: quoteQueryKey.lists(),
      })

      await options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

const rejectQuote = async (quoteId: string) =>
  await sdk.client.fetch<AdminQuoteResponse>(
    `/admin/quotes/${quoteId}/reject`,
    {
      method: "POST",
    },
  )

export const useRejectQuote = (
  id: string,
  options?: UseMutationOptions<AdminQuoteResponse, FetchError>,
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => await rejectQuote(id),
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: orderPreviewQueryKey.details(),
      })

      await queryClient.invalidateQueries({
        queryKey: quoteQueryKey.details(),
      })

      await queryClient.invalidateQueries({
        queryKey: quoteQueryKey.lists(),
      })

      await options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

const createQuoteMessage = async (
  quoteId: string,
  body: AdminCreateQuoteMessage,
) =>
  await sdk.client.fetch<AdminQuoteResponse>(
    `/admin/quotes/${quoteId}/messages`,
    {
      body,
      method: "POST",
    },
  )

export const useCreateQuoteMessage = (
  id: string,
  options?: UseMutationOptions<
    AdminQuoteResponse,
    FetchError,
    AdminCreateQuoteMessage
  >,
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body) => await createQuoteMessage(id, body),
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: quoteQueryKey.details(),
      })

      await options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
