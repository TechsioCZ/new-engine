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
import { sdk } from "../../lib/client"
import { queryKeysFactory } from "../../lib/query-key-factory"

export const customerQueryKey = queryKeysFactory("customer")

export const useAdminCustomerGroups = (
  options?: UseQueryOptions<
    { customer_groups: HttpTypes.AdminCustomerGroup[] },
    FetchError,
    HttpTypes.AdminCustomerGroup[],
    QueryKey
  >
) =>
  useQuery({
    queryKey: customerQueryKey.list("groups"),
    queryFn: () => sdk.admin.customerGroup.list(),
    select: (data) => data.customer_groups,
    ...options,
  })

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
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: customerQueryKey.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
