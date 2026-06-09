import type { FetchError } from "@medusajs/js-sdk"
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import type {
  AdminApproval,
  AdminApprovalSettings,
  AdminApprovalSettingsResponse,
  AdminApprovalsResponse,
  AdminUpdateApproval,
  AdminUpdateApprovalSettings,
} from "../../../types"
import { queryKeysFactory } from "../../lib/query-key-factory"
import { sdk } from "../../lib/sdk"
import { companyQueryKey } from "./companies"

export const approvalSettingsQueryKey = queryKeysFactory("approvalSettings")

export const useUpdateApprovalSettings = (
  companyId: string,
  options?: UseMutationOptions<
    AdminApprovalSettings,
    FetchError,
    AdminUpdateApprovalSettings
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: AdminUpdateApprovalSettings) => {
      const data = await sdk.client.fetch<AdminApprovalSettingsResponse>(
        `/admin/companies/${companyId}/approval-settings`,
        {
          body: payload,
          method: "POST",
        }
      )

      const approvalSettings = data.approvalSettings[0]

      if (!approvalSettings) {
        throw new Error("Approval settings update returned no data")
      }

      return approvalSettings
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: approvalSettingsQueryKey.detail(companyId),
      })

      queryClient.invalidateQueries({
        queryKey: companyQueryKey.details(),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

const approvalQueryKey = queryKeysFactory("approval")

export const useApprovals = (
  query?: Record<string, unknown>,
  options?: UseQueryOptions<AdminApprovalsResponse, FetchError>
) => {
  const fetchApprovals = async () =>
    sdk.client.fetch<AdminApprovalsResponse>("/admin/approvals", {
      method: "GET",
      query,
    })

  return useQuery({
    queryKey: approvalQueryKey.list(query),
    queryFn: fetchApprovals,
    ...options,
  })
}

export const useUpdateApproval = (
  approvalId: string,
  options?: UseMutationOptions<AdminApproval, FetchError, AdminUpdateApproval>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AdminUpdateApproval) =>
      sdk.client.fetch<AdminApproval>(`/admin/approvals/${approvalId}`, {
        body: payload,
        method: "POST",
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: approvalQueryKey.lists(),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
