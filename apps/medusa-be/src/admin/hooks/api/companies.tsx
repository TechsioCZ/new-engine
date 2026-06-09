import type { FetchError } from "@medusajs/js-sdk"
import {
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import type {
  AdminCompaniesResponse,
  AdminCompanyResponse,
  AdminCreateCompaniesResponse,
  AdminCreateCompany,
  AdminUpdateCompany,
} from "../../../types"
import { queryKeysFactory } from "../../lib/query-key-factory"
import { sdk } from "../../lib/sdk"
import { customerQueryKey } from "./customers"

export const companyQueryKey = queryKeysFactory("company")

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, FetchError, TData, QueryKey>,
  "queryFn" | "queryKey"
>

export const useCompanies = (
  query?: Record<string, string>,
  options?: QueryOptions<AdminCompaniesResponse>
) => {
  const filterQuery = new URLSearchParams(query).toString()

  const fetchCompanies = async () =>
    sdk.client.fetch<AdminCompaniesResponse>(
      `/admin/companies${filterQuery ? `?${filterQuery}` : ""}`,
      {
        method: "GET",
      }
    )

  return useQuery({
    queryKey: companyQueryKey.list(query),
    queryFn: fetchCompanies,
    ...options,
  })
}

export const useCompany = (
  companyId: string,
  query?: Record<string, string>,
  options?: QueryOptions<AdminCompanyResponse>
) => {
  const filterQuery = new URLSearchParams(query).toString()

  const fetchCompany = async () =>
    sdk.client.fetch<AdminCompanyResponse>(
      `/admin/companies/${companyId}${filterQuery ? `?${filterQuery}` : ""}`,
      {
        method: "GET",
      }
    )

  return useQuery({
    queryKey: companyQueryKey.detail(companyId, query),
    queryFn: fetchCompany,
    ...options,
  })
}

export const useCreateCompany = (
  options?: UseMutationOptions<
    AdminCreateCompaniesResponse,
    FetchError,
    AdminCreateCompany
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (company: AdminCreateCompany) =>
      sdk.client.fetch<AdminCreateCompaniesResponse>("/admin/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: company,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      })
      for (const company of data.companies) {
        queryClient.invalidateQueries({
          queryKey: companyQueryKey.detail(company.id),
        })
      }
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdateCompany = (
  companyId: string,
  options?: UseMutationOptions<
    AdminCompanyResponse,
    FetchError,
    AdminUpdateCompany
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (company: AdminUpdateCompany) =>
      sdk.client.fetch<AdminCompanyResponse>(`/admin/companies/${companyId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: company,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.details(),
      })
      queryClient.invalidateQueries({
        queryKey: customerQueryKey.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDeleteCompany = (
  companyId: string,
  options?: UseMutationOptions<void, FetchError>
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      sdk.client.fetch<void>(`/admin/companies/${companyId}`, {
        method: "DELETE",
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.details(),
      })
      queryClient.invalidateQueries({
        queryKey: customerQueryKey.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useRestoreCompany = (
  companyId: string,
  options?: UseMutationOptions<AdminCompanyResponse, FetchError>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      sdk.client.fetch<AdminCompanyResponse>(
        `/admin/companies/${companyId}/restore`,
        {
          method: "POST",
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.details(),
      })
      queryClient.invalidateQueries({
        queryKey: customerQueryKey.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useAddCompanyToCustomerGroup = (
  companyId: string,
  options?: UseMutationOptions<void, FetchError, string>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (groupId: string) => {
      await sdk.client.fetch(`/admin/companies/${companyId}/customer-group`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: { group_id: groupId },
      })
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.details(),
      })
      queryClient.invalidateQueries({
        queryKey: customerQueryKey.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useRemoveCompanyFromCustomerGroup = (
  companyId: string,
  options?: UseMutationOptions<void, FetchError, string>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (groupId: string) => {
      await sdk.client.fetch(
        `/admin/companies/${companyId}/customer-group/${groupId}`,
        {
          method: "DELETE",
          headers: {
            Accept: "text/plain",
          },
        }
      )
    },
    onSuccess: (_, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.details(),
      })
      queryClient.invalidateQueries({
        queryKey: customerQueryKey.lists(),
      })
      options?.onSuccess?.(undefined, variables, context)
    },
    ...options,
  })
}
