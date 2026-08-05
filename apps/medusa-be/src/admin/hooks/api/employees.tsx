import type { FetchError } from "@medusajs/js-sdk"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  QueryKey,
  UseMutationOptions,
  UseQueryOptions,
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
    AdminEmployeesResponse
  >
) => {
  const filterQuery = new URLSearchParams(query).toString()

  const fetchEmployees = async () =>
    await sdk.client.fetch<AdminEmployeesResponse>(
      `/admin/companies/${companyId}/employees${
        filterQuery ? `?${filterQuery}` : ""
      }`,
      {
        method: "GET",
      }
    )

  return useQuery({
    queryFn: fetchEmployees,
    queryKey: employeeQueryKey.list({ companyId, query }),
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
    mutationFn: async (employee: AdminCreateEmployeeBody) =>
      sdk.client.fetch<AdminEmployeeResponse>(
        `/admin/companies/${companyId}/employees`,
        {
          body: employee,
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        }
      ),
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: employeeQueryKey.lists(),
      })
      await queryClient.invalidateQueries({
        queryKey: companyQueryKey.details(),
      })
      await queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      })
      await options?.onSuccess?.(data, variables, context)
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
    mutationFn: async (employee: AdminUpdateEmployee) =>
      sdk.client.fetch<AdminEmployeeResponse>(
        `/admin/companies/${companyId}/employees/${employeeId}`,
        {
          body: employee,
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        }
      ),
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: employeeQueryKey.detail(employeeId),
      })
      await queryClient.invalidateQueries({
        queryKey: employeeQueryKey.lists(),
      })
      await queryClient.invalidateQueries({
        queryKey: companyQueryKey.details(),
      })
      await queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      })
      await options?.onSuccess?.(data, variables, context)
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
    mutationFn: async (employeeId: string) =>
      sdk.client.fetch<void>(
        `/admin/companies/${companyId}/employees/${employeeId}`,
        {
          method: "DELETE",
        }
      ),
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: employeeQueryKey.detail(variables),
      })
      await queryClient.invalidateQueries({
        queryKey: employeeQueryKey.lists(),
      })
      await queryClient.invalidateQueries({
        queryKey: companyQueryKey.details(),
      })
      await queryClient.invalidateQueries({
        queryKey: companyQueryKey.lists(),
      })
      await options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
