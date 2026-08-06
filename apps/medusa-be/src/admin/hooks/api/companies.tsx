import type { FetchError } from "@medusajs/js-sdk"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { UseMutationOptions, UseQueryOptions } from "@tanstack/react-query"

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
  UseQueryOptions<TData, FetchError, TData>,
  "queryFn" | "queryKey"
>

export const useCompanies = (
  query?: Record<string, string>,
  options?: QueryOptions<AdminCompaniesResponse>,
) => {
  const filterQuery = new URLSearchParams(query).toString()

  const fetchCompanies = async () =>
    await sdk.client.fetch<AdminCompaniesResponse>(
      filterQuery.length > 0
        ? `/admin/companies?${filterQuery}`
        : "/admin/companies",
      {
        method: "GET",
      },
    )

  return useQuery({
    queryFn: fetchCompanies,
    queryKey: companyQueryKey.list(query),
    ...options,
  })
}

export const useCompany = (
  companyId: string,
  query?: Record<string, string>,
  options?: QueryOptions<AdminCompanyResponse>,
) => {
  const filterQuery = new URLSearchParams(query).toString()

  const fetchCompany = async () =>
    await sdk.client.fetch<AdminCompanyResponse>(
      filterQuery.length > 0
        ? `/admin/companies/${companyId}?${filterQuery}`
        : `/admin/companies/${companyId}`,
      {
        method: "GET",
      },
    )

  return useQuery({
    queryFn: fetchCompany,
    queryKey: companyQueryKey.detail(companyId, query),
    ...options,
  })
}

export const useCreateCompany = (
  options?: UseMutationOptions<
    AdminCreateCompaniesResponse,
    FetchError,
    AdminCreateCompany
  >,
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (company: AdminCreateCompany) =>
      await sdk.client.fetch<AdminCreateCompaniesResponse>("/admin/companies", {
        body: company,
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      })
      await Promise.all(
        data.companies.map(async (company) => {
          await queryClient.invalidateQueries({
            queryKey: companyQueryKey.detail(company.id),
          })
        }),
      )
      await options?.onSuccess?.(data, variables, context)
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
  >,
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (company: AdminUpdateCompany) =>
      await sdk.client.fetch<AdminCompanyResponse>(
        `/admin/companies/${companyId}`,
        {
          body: company,
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      ),
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      })
      await queryClient.invalidateQueries({
        queryKey: companyQueryKey.details(),
      })
      await queryClient.invalidateQueries({
        queryKey: customerQueryKey.lists(),
      })
      await options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDeleteCompany = (
  companyId: string,
  options?: UseMutationOptions<void, FetchError>,
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await sdk.client.fetch<unknown>(`/admin/companies/${companyId}`, {
        method: "DELETE",
      })
    },
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      })
      await queryClient.invalidateQueries({
        queryKey: companyQueryKey.details(),
      })
      await queryClient.invalidateQueries({
        queryKey: customerQueryKey.lists(),
      })
      await options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useRestoreCompany = (
  companyId: string,
  options?: UseMutationOptions<AdminCompanyResponse, FetchError>,
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () =>
      await sdk.client.fetch<AdminCompanyResponse>(
        `/admin/companies/${companyId}/restore`,
        {
          method: "POST",
        },
      ),
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      })
      await queryClient.invalidateQueries({
        queryKey: companyQueryKey.details(),
      })
      await queryClient.invalidateQueries({
        queryKey: customerQueryKey.lists(),
      })
      await options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useAddCompanyToCustomerGroup = (
  companyId: string,
  options?: UseMutationOptions<void, FetchError, string>,
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (groupId: string) => {
      await sdk.client.fetch(`/admin/companies/${companyId}/customer-group`, {
        body: { group_id: groupId },
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      })
    },
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      })
      await queryClient.invalidateQueries({
        queryKey: companyQueryKey.details(),
      })
      await queryClient.invalidateQueries({
        queryKey: customerQueryKey.lists(),
      })
      await options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useRemoveCompanyFromCustomerGroup = (
  companyId: string,
  options?: UseMutationOptions<void, FetchError, string>,
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (groupId: string) => {
      await sdk.client.fetch(
        `/admin/companies/${companyId}/customer-group/${groupId}`,
        {
          headers: {
            Accept: "text/plain",
          },
          method: "DELETE",
        },
      )
    },
    onSuccess: async (_, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      })
      await queryClient.invalidateQueries({
        queryKey: companyQueryKey.details(),
      })
      await queryClient.invalidateQueries({
        queryKey: customerQueryKey.lists(),
      })
      await options?.onSuccess?.(undefined, variables, context)
    },
    ...options,
  })
}
