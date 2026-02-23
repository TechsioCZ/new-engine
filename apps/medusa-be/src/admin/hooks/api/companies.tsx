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
  AdminCreateCompany,
  AdminUpdateCompany,
} from "../../../types"
import { sdk } from "../../lib/client"
import { queryKeysFactory } from "../../lib/query-key-factory"
import {
  normalizeCompanyCheckCzAddressCountQuery,
  normalizeCompanyCheckCzInfoQuery,
  normalizeCompanyCheckCzTaxReliabilityQuery,
  normalizeCompanyCheckViesQuery,
} from "../../utils"

export const companyQueryKey = queryKeysFactory("company")
export const companyCheckQueryKey = queryKeysFactory("company-check")

export type CompanyCheckCzInfoQuery = {
  vat_identification_number?: string | null
  company_identification_number?: string | null
  company_name?: string | null
}

export type CompanyCheckCzInfoResult = {
  company_name: string
  company_identification_number: string
  vat_identification_number?: string | null
  street: string
  city: string
  country: string
  postal_code: string
}

export type CompanyCheckCzAddressCountQuery = {
  street?: string | null
  city?: string | null
}

export type CompanyCheckCzAddressCountResult = {
  count: number
}

export type CompanyCheckCzTaxReliabilityQuery = {
  vat_identification_number?: string | null
}

export type CompanyCheckCzTaxReliabilityResult = {
  reliable: boolean | null
  unreliable_published_at: string | null
  subject_type: string | null
}

export type CompanyCheckViesQuery = {
  vat_identification_number?: string | null
}

export type CompanyCheckViesResult = {
  valid: boolean
  name: string | null
  address: string | null
  is_group_registration: boolean
  request_date: string | null
  request_identifier: string | null
  trader_name_match: string | null
  trader_address_match: string | null
  trader_company_type_match: string | null
  trader_street_match: string | null
  trader_postal_code_match: string | null
  trader_city_match: string | null
}

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, FetchError, TData, QueryKey>,
  "queryFn" | "queryKey"
>

export const useCompanyCheckCzInfo = (
  query?: CompanyCheckCzInfoQuery,
  options?: QueryOptions<CompanyCheckCzInfoResult[]>
) => {
  const normalizedQuery = normalizeCompanyCheckCzInfoQuery(query)
  const filterQuery = normalizedQuery
    ? new URLSearchParams(normalizedQuery).toString()
    : ""

  const fetchCompanyCheckCzInfo = async () =>
    sdk.client.fetch<CompanyCheckCzInfoResult[]>(
      `/admin/companies/check/cz/info${filterQuery ? `?${filterQuery}` : ""}`,
      {
        method: "GET",
      }
    )

  return useQuery({
    queryKey: companyCheckQueryKey.list({
      endpoint: "cz-info",
      query: normalizedQuery,
    }),
    queryFn: fetchCompanyCheckCzInfo,
    ...options,
    enabled: Boolean(normalizedQuery) && (options?.enabled ?? true),
  })
}

export const useCompanyCheckCzAddressCount = (
  query?: CompanyCheckCzAddressCountQuery,
  options?: QueryOptions<CompanyCheckCzAddressCountResult>
) => {
  const normalizedQuery = normalizeCompanyCheckCzAddressCountQuery(query)
  const filterQuery = normalizedQuery
    ? new URLSearchParams(normalizedQuery).toString()
    : ""

  const fetchCompanyCheckCzAddressCount = async () =>
    sdk.client.fetch<CompanyCheckCzAddressCountResult>(
      `/admin/companies/check/cz/address-count${filterQuery ? `?${filterQuery}` : ""}`,
      {
        method: "GET",
      }
    )

  return useQuery({
    queryKey: companyCheckQueryKey.list({
      endpoint: "cz-address-count",
      query: normalizedQuery,
    }),
    queryFn: fetchCompanyCheckCzAddressCount,
    ...options,
    enabled: Boolean(normalizedQuery) && (options?.enabled ?? true),
  })
}

export const useCompanyCheckCzTaxReliability = (
  query?: CompanyCheckCzTaxReliabilityQuery,
  options?: QueryOptions<CompanyCheckCzTaxReliabilityResult>
) => {
  const normalizedQuery = normalizeCompanyCheckCzTaxReliabilityQuery(query)
  const filterQuery = normalizedQuery
    ? new URLSearchParams(normalizedQuery).toString()
    : ""

  const fetchCompanyCheckCzTaxReliability = async () =>
    sdk.client.fetch<CompanyCheckCzTaxReliabilityResult>(
      `/admin/companies/check/cz/tax-reliability${filterQuery ? `?${filterQuery}` : ""}`,
      {
        method: "GET",
      }
    )

  return useQuery({
    queryKey: companyCheckQueryKey.list({
      endpoint: "cz-tax-reliability",
      query: normalizedQuery,
    }),
    queryFn: fetchCompanyCheckCzTaxReliability,
    ...options,
    enabled: Boolean(normalizedQuery) && (options?.enabled ?? true),
  })
}

export const useCompanyCheckVies = (
  query?: CompanyCheckViesQuery,
  options?: QueryOptions<CompanyCheckViesResult>
) => {
  const normalizedQuery = normalizeCompanyCheckViesQuery(query)
  const filterQuery = normalizedQuery
    ? new URLSearchParams(normalizedQuery).toString()
    : ""

  const fetchCompanyCheckVies = async () =>
    sdk.client.fetch<CompanyCheckViesResult>(
      `/admin/companies/check/vies${filterQuery ? `?${filterQuery}` : ""}`,
      {
        method: "GET",
      }
    )

  return useQuery({
    queryKey: companyCheckQueryKey.list({
      endpoint: "vies",
      query: normalizedQuery,
    }),
    queryFn: fetchCompanyCheckVies,
    ...options,
    enabled: Boolean(normalizedQuery) && (options?.enabled ?? true),
  })
}

export const useCompanies = (
  query?: Record<string, any>,
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
  query?: Record<string, any>,
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
    queryKey: companyQueryKey.detail(companyId),
    queryFn: fetchCompany,
    ...options,
  })
}

export const useCreateCompany = (
  options?: UseMutationOptions<
    AdminCompanyResponse,
    FetchError,
    AdminCreateCompany
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (company: AdminCreateCompany) =>
      sdk.client.fetch<AdminCompanyResponse>("/admin/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: company,
      }),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.detail(data.id),
      })
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
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.detail(companyId),
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
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
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
    mutationFn: (groupId: string) =>
      sdk.client.fetch<void>(`/admin/companies/${companyId}/customer-group`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: { group_id: groupId },
      }),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.detail(companyId),
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
    mutationFn: (groupId: string) =>
      sdk.client.fetch<void>(
        `/admin/companies/${companyId}/customer-group/${groupId}`,
        {
          method: "DELETE",
          headers: {
            Accept: "text/plain",
          },
        }
      ),
    onSuccess: (_, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.detail(companyId),
      })
      options?.onSuccess?.(undefined, variables, context)
    },
    ...options,
  })
}
