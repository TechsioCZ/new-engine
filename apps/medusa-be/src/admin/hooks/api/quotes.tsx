import type { HttpTypes } from "@medusajs/framework/types"
import type { ClientHeaders, FetchError } from "@medusajs/js-sdk"
import {
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
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
  UseQueryOptions<TData, FetchError, TData, QueryKey>,
  "queryFn" | "queryKey"
>

export const useQuotes = (
  quoteQuery: QuoteFilterParams,
  options?: QueryOptions<StoreQuotesResponse>
) => {
  const fetchQuotes = (filters: QuoteFilterParams, headers?: ClientHeaders) =>
    sdk.client.fetch<StoreQuotesResponse>("/admin/quotes", {
      query: filters,
      headers,
    })

  const { data, ...rest } = useQuery({
    ...options,
    queryFn: () => fetchQuotes(quoteQuery),
    queryKey: quoteQueryKey.list(quoteQuery),
  })

  return { ...data, ...rest }
}

export const useQuote = (
  id: string,
  quoteQuery?: QuoteFilterParams,
  options?: QueryOptions<StoreQuoteResponse>
) => {
  const fetchQuote = (
    quoteId: string,
    filters?: QuoteFilterParams,
    headers?: ClientHeaders
  ) =>
    sdk.client.fetch<StoreQuoteResponse>(`/admin/quotes/${quoteId}`, {
      query: filters,
      headers,
    })

  const { data, ...rest } = useQuery({
    queryFn: () => fetchQuote(id, quoteQuery),
    queryKey: quoteQueryKey.detail(id, quoteQuery),
    ...options,
  })

  return { ...data, ...rest }
}

export const useAddItemsToQuote = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderEditPreviewResponse,
    FetchError,
    HttpTypes.AdminAddOrderEditItems
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: HttpTypes.AdminAddOrderEditItems) =>
      sdk.admin.orderEdit.addItems(id, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: orderPreviewQueryKey.detail(id),
      })

      options?.onSuccess?.(data, variables, context)
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
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      itemId,
      ...payload
    }: UpdateQuoteItemPayload & { itemId: string }) =>
      sdk.admin.orderEdit.updateOriginalItem(id, itemId, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: orderPreviewQueryKey.detail(id),
      })

      options?.onSuccess?.(data, variables, context)
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
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (actionId: string) =>
      sdk.admin.orderEdit.removeAddedItem(id, actionId),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: orderPreviewQueryKey.detail(id),
      })
      options?.onSuccess?.(data, variables, context)
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
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      actionId,
      ...payload
    }: UpdateQuoteItemPayload & { actionId: string }) =>
      sdk.admin.orderEdit.updateAddedItem(id, actionId, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: orderPreviewQueryKey.detail(id),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useConfirmQuote = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderEditPreviewResponse,
    FetchError,
    void
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => sdk.admin.orderEdit.request(id),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: orderPreviewQueryKey.details(),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useSendQuote = (
  id: string,
  options?: UseMutationOptions<AdminQuoteResponse, FetchError, void>
) => {
  const queryClient = useQueryClient()

  const sendQuote = async (quoteId: string) =>
    sdk.client.fetch<AdminQuoteResponse>(`/admin/quotes/${quoteId}/send`, {
      method: "POST",
    })

  return useMutation({
    mutationFn: () => sendQuote(id),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: orderPreviewQueryKey.details(),
      })

      queryClient.invalidateQueries({
        queryKey: quoteQueryKey.details(),
      })

      queryClient.invalidateQueries({
        queryKey: quoteQueryKey.lists(),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useRejectQuote = (
  id: string,
  options?: UseMutationOptions<AdminQuoteResponse, FetchError, void>
) => {
  const queryClient = useQueryClient()

  const rejectQuote = async (quoteId: string) =>
    sdk.client.fetch<AdminQuoteResponse>(`/admin/quotes/${quoteId}/reject`, {
      method: "POST",
    })

  return useMutation({
    mutationFn: () => rejectQuote(id),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: orderPreviewQueryKey.details(),
      })

      queryClient.invalidateQueries({
        queryKey: quoteQueryKey.details(),
      })

      queryClient.invalidateQueries({
        queryKey: quoteQueryKey.lists(),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useCreateQuoteMessage = (
  id: string,
  options?: UseMutationOptions<
    AdminQuoteResponse,
    FetchError,
    AdminCreateQuoteMessage
  >
) => {
  const queryClient = useQueryClient()

  const sendQuote = async (quoteId: string, body: AdminCreateQuoteMessage) =>
    sdk.client.fetch<AdminQuoteResponse>(`/admin/quotes/${quoteId}/messages`, {
      body,
      method: "POST",
    })

  return useMutation({
    mutationFn: (body) => sendQuote(id, body),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: quoteQueryKey.details(),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
