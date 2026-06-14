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
  AdminCreateEmployee,
  AdminEmployeeResponse,
  AdminEmployeesResponse,
  AdminUpdateEmployee,
} from "../../../types"
import { queryKeysFactory } from "../../lib/query-key-factory"
import { sdk } from "../../lib/sdk"
import { companyQueryKey } from "./companies"

export const employeeQueryKey = queryKeysFactory("employee")

type AdminCreateEmployeeBody = Omit<AdminCreateEmployee, "company_id">

export const useEmployees = (
  companyId: string,
  query?: Record<string, string>,
  options?: UseQueryOptions<
    AdminEmployeesResponse,
    FetchError,
    AdminEmployeesResponse,
    QueryKey
  >
) => {
  const filterQuery = new URLSearchParams(query).toString()

  const fetchEmployees = async () =>
    sdk.client.fetch<AdminEmployeesResponse>(
      `/admin/companies/${companyId}/employees${
        filterQuery ? `?${filterQuery}` : ""
      }`,
      {
        method: "GET",
      }
    )

  return useQuery({
    queryKey: employeeQueryKey.list({ companyId, query }),
    queryFn: fetchEmployees,
    ...options,
  })
}

export const useCreateEmployee = (
  companyId: string,
  options?: UseMutationOptions<
    AdminEmployeeResponse,
    FetchError,
    AdminCreateEmployeeBody
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (employee: AdminCreateEmployeeBody) =>
      sdk.client.fetch<AdminEmployeeResponse>(
        `/admin/companies/${companyId}/employees`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: employee,
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: employeeQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.details(),
      })
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdateEmployee = (
  companyId: string,
  employeeId: string,
  options?: UseMutationOptions<
    AdminEmployeeResponse,
    FetchError,
    AdminUpdateEmployee
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (employee: AdminUpdateEmployee) =>
      sdk.client.fetch<AdminEmployeeResponse>(
        `/admin/companies/${companyId}/employees/${employeeId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: employee,
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: employeeQueryKey.detail(employeeId),
      })
      queryClient.invalidateQueries({
        queryKey: employeeQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.details(),
      })
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDeleteEmployee = (
  companyId: string,
  options?: UseMutationOptions<void, FetchError, string>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (employeeId: string) =>
      sdk.client.fetch<void>(
        `/admin/companies/${companyId}/employees/${employeeId}`,
        {
          method: "DELETE",
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: employeeQueryKey.detail(variables),
      })
      queryClient.invalidateQueries({
        queryKey: employeeQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.details(),
      })
      queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
