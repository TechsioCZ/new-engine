import type { HttpTypes } from "@medusajs/framework/types"
import type { FetchError } from "@medusajs/js-sdk"
import type { AdminCreateCustomer, AdminCustomer } from "@medusajs/types"
import {
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { queryKeysFactory } from "../../lib/query-key-factory"
import { sdk } from "../../lib/sdk"

export const customerQueryKey = queryKeysFactory("customer")

type CustomerGroupCompanyOwner = {
  customer_group_id: string
  company: {
    deleted_at?: string | null
    id: string
    name: string
  }
}

type CustomerGroupCompanyOwnersResponse = {
  customer_group_links: CustomerGroupCompanyOwner[]
}

type CustomerGroupCompanyOwnersQueryOptions = Omit<
  UseQueryOptions<
    CustomerGroupCompanyOwnersResponse,
    FetchError,
    CustomerGroupCompanyOwnersResponse,
    QueryKey
  >,
  "enabled" | "queryFn" | "queryKey"
> & {
  enabled?: boolean
}

type AdminCustomerGroupsQueryOptions = Omit<
  UseQueryOptions<
    HttpTypes.AdminCustomerGroupListResponse,
    FetchError,
    HttpTypes.AdminCustomerGroupListResponse,
    QueryKey
  >,
  "queryFn" | "queryKey"
>

type AdminCustomerSearchResponse = Awaited<
  ReturnType<typeof sdk.admin.customer.list>
>

type AdminCustomerSearchQueryOptions = Omit<
  UseQueryOptions<
    AdminCustomerSearchResponse,
    FetchError,
    AdminCustomerSearchResponse,
    QueryKey
  >,
  "enabled" | "queryFn" | "queryKey"
> & {
  enabled?: boolean
}

export const useAdminCustomerGroups = (
  query?: HttpTypes.AdminGetCustomerGroupsParams,
  options?: AdminCustomerGroupsQueryOptions
) =>
  useQuery({
    queryKey: customerQueryKey.list({ scope: "groups", ...query }),
    queryFn: () =>
      sdk.admin.customerGroup.list({
        ...query,
        fields: query?.fields ?? "id,name",
      }),
    ...options,
  })

export const useCustomerGroupCompanyOwners = (
  groupIds: string[],
  options?: CustomerGroupCompanyOwnersQueryOptions
) => {
  const { enabled, ...queryOptions } = options ?? {}

  return useQuery({
    ...queryOptions,
    enabled: Boolean(groupIds.length) && (enabled ?? true),
    queryKey: customerQueryKey.list({
      groupIds,
      scope: "group-company-owners",
    }),
    queryFn: () => {
      const searchParams = new URLSearchParams()

      for (const groupId of groupIds) {
        searchParams.append("group_id", groupId)
      }

      return sdk.client.fetch<CustomerGroupCompanyOwnersResponse>(
        `/admin/company-customer-group-links?${searchParams.toString()}`
      )
    },
  })
}

export const useAdminCustomerSearch = (
  email: string,
  options?: AdminCustomerSearchQueryOptions
) => {
  const { enabled, ...queryOptions } = options ?? {}
  const normalizedEmail = email.trim().toLowerCase()

  return useQuery({
    ...queryOptions,
    enabled: Boolean(normalizedEmail) && (enabled ?? true),
    queryKey: customerQueryKey.list({
      email: normalizedEmail,
      scope: "email-search",
    }),
    queryFn: () =>
      sdk.admin.customer.list({
        fields: "id,email,first_name,last_name,phone",
        limit: 5,
        q: normalizedEmail,
      }),
  })
}

export const useAdminCreateCustomer = (
  options?: UseMutationOptions<
    { customer: AdminCustomer },
    FetchError,
    AdminCreateCustomer
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (customer: AdminCreateCustomer) =>
      sdk.admin.customer.create(customer),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: customerQueryKey.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useAdminFindCustomerByEmail = (
  options?: UseMutationOptions<
    HttpTypes.AdminCustomer | null,
    FetchError,
    string
  >
) =>
  useMutation({
    mutationFn: async (email: string) => {
      const normalizedEmail = email.trim().toLowerCase()
      const { customers } = await sdk.admin.customer.list({
        email: normalizedEmail,
        fields: "id,email,first_name,last_name,phone",
        limit: 2,
      })

      return (
        customers.find(
          (customer) => customer.email?.toLowerCase() === normalizedEmail
        ) ?? null
      )
    },
    ...options,
  })
