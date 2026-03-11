import { QueryClient } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { StorefrontDataProvider } from "../src/client/provider"
import { createCustomerHooks } from "../src/customers/hooks"
import {
  StorefrontAddressValidationError,
  type StorefrontAddressValidationIssue,
} from "../src/shared/address"

const createWrapper = (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <StorefrontDataProvider client={client}>{children}</StorefrontDataProvider>
  )

describe("customer validation regression", () => {
  type Customer = { id: string }
  type Address = { id: string; address_1?: string; city?: string }
  type ListParams = Record<string, never>
  type CreateParams = { address_1?: string; city?: string }
  type UpdateParams = { address_1?: string; city?: string }
  type UpdateCustomerParams = { metadata?: Record<string, unknown> }

  const createService = () => ({
    getAddresses: vi.fn(async () => ({ addresses: [] as Address[] })),
    createAddress: vi.fn(async (params: CreateParams) => ({
      id: "addr_1",
      ...params,
    })),
    updateAddress: vi.fn(async (id: string, params: UpdateParams) => ({
      id,
      ...params,
    })),
    deleteAddress: vi.fn(async () => {}),
    updateCustomer: vi.fn(async () => ({ id: "cus_1" } as Customer)),
  })

  it("throws structured validation errors and skips createAddress call", async () => {
    const service = createService()
    const { useCreateCustomerAddress } = createCustomerHooks<
      Customer,
      Address,
      { enabled?: boolean },
      ListParams,
      CreateParams,
      CreateParams,
      { addressId?: string; address_1?: string; city?: string },
      UpdateParams,
      UpdateCustomerParams,
      UpdateCustomerParams
    >({
      service,
      buildListParams: () => ({}),
      queryKeyNamespace: "customers-validation-errors",
      addressAdapter: {
        validateCreate: (input) => {
          const issues: StorefrontAddressValidationIssue[] = []
          if (!input.address_1) {
            issues.push({
              scope: "customer",
              field: "address_1",
              code: "required",
              message: "address_1 is required",
            })
          }
          if (!input.city) {
            issues.push({
              scope: "customer",
              field: "city",
              code: "required",
              message: "city is required",
            })
          }
          return issues.length ? issues : null
        },
      },
    })

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)
    const { result } = renderHook(() => useCreateCustomerAddress(), { wrapper })

    await act(async () => {
      await expect(
        result.current.mutateAsync({ address_1: "Main street" })
      ).rejects.toBeInstanceOf(StorefrontAddressValidationError)
    })

    expect(service.createAddress).not.toHaveBeenCalled()
  })

  it("accepts null validation result and continues to createAddress", async () => {
    const service = createService()
    const { useCreateCustomerAddress } = createCustomerHooks<
      Customer,
      Address,
      { enabled?: boolean },
      ListParams,
      CreateParams,
      CreateParams,
      { addressId?: string; address_1?: string; city?: string },
      UpdateParams,
      UpdateCustomerParams,
      UpdateCustomerParams
    >({
      service,
      buildListParams: () => ({}),
      queryKeyNamespace: "customers-validation-ok",
      addressAdapter: {
        validateCreate: () => null,
      },
    })

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)
    const { result } = renderHook(() => useCreateCustomerAddress(), { wrapper })

    await act(async () => {
      const created = await result.current.mutateAsync({
        address_1: "Main street",
        city: "Prague",
      })
      expect(created.id).toBe("addr_1")
    })

    expect(service.createAddress).toHaveBeenCalledTimes(1)
  })
})
