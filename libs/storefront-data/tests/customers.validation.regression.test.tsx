import { QueryClient } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { vi, describe, expect, it } from "vitest"

import { createCheckoutCustomerAddressAdapter } from "../src/checkout/address"
import { StorefrontDataProvider } from "../src/client/provider"
import { createCustomerHooks } from "../src/customers/hooks"
import type { CustomerAddressAdapter } from "../src/customers/types"
import { StorefrontAddressValidationError } from "../src/shared/address"
import type { StorefrontAddressValidationIssue } from "../src/shared/address"

const createWrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <StorefrontDataProvider client={client}>{children}</StorefrontDataProvider>
  )

type DefaultCustomerAddressAdapter = CustomerAddressAdapter<{
  city?: string
}>

type DefaultCustomerUpdateInput = Parameters<
  NonNullable<DefaultCustomerAddressAdapter["validateUpdate"]>
>[0]

describe("customer validation regression", () => {
  interface Customer {
    id: string
  }
  interface Address {
    id: string
    address_1?: string
    city?: string
  }
  type ListParams = Record<string, never>
  interface CreateParams {
    address_1?: string
    city?: string
  }
  interface UpdateParams {
    address_1?: string
    city?: string
  }
  interface UpdateCustomerParams {
    metadata?: Record<string, unknown>
  }

  const createService = () => ({
    createAddress: vi.fn(async (params: CreateParams) => ({
      id: "addr_1",
      ...params,
    })),
    deleteAddress: vi.fn(async () => {}),
    getAddresses: vi.fn(async () => ({ addresses: [] as Address[] })),
    updateAddress: vi.fn(async (id: string, params: UpdateParams) => ({
      id,
      ...params,
    })),
    updateCustomer: vi.fn(async () => ({ id: "cus_1" })),
  })

  it("keeps addressId in the default customer adapter update input type", () => {
    const updateInput: DefaultCustomerUpdateInput = {
      addressId: "addr_1",
      city: "Prague",
    }

    expect(updateInput.addressId).toBe("addr_1")
  })

  it("passes addressId through to custom update adapters", async () => {
    interface UpdateInput {
      addressId?: string
      city?: string
    }

    const service = createService()
    const toUpdateParams = vi.fn((input: UpdateInput) =>
      input.city ? { city: input.city } : {}
    )
    const { useUpdateCustomerAddress } = createCustomerHooks<
      Customer,
      Address,
      { enabled?: boolean },
      ListParams,
      CreateParams,
      CreateParams,
      UpdateInput,
      UpdateParams,
      UpdateCustomerParams,
      UpdateCustomerParams
    >({
      addressAdapter: {
        toUpdateParams,
      },
      buildListParams: () => ({}),
      queryKeyNamespace: "customers-update-address-id",
      service,
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)
    const { result } = renderHook(() => useUpdateCustomerAddress(), {
      wrapper,
    })

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          addressId: "addr_1",
          city: "Prague",
        })
      ).resolves.toMatchObject({ city: "Prague", id: "addr_1" })
    })

    expect(toUpdateParams).toHaveBeenCalledWith(
      expect.objectContaining({
        addressId: "addr_1",
        city: "Prague",
      }),
      { mode: "update" }
    )
    expect(service.updateAddress).toHaveBeenCalledWith("addr_1", {
      city: "Prague",
    })
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
      buildListParams: () => ({}),
      queryKeyNamespace: "customers-validation-errors",
      service,
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)
    const { result } = renderHook(() => useCreateCustomerAddress(), {
      wrapper,
    })

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
      addressAdapter: {
        validateCreate: () => null,
      },
      buildListParams: () => ({}),
      queryKeyNamespace: "customers-validation-ok",
      service,
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)
    const { result } = renderHook(() => useCreateCustomerAddress(), {
      wrapper,
    })

    await act(async () => {
      const created = await result.current.mutateAsync({
        address_1: "Main street",
        city: "Prague",
      })
      expect(created.id).toBe("addr_1")
    })

    expect(service.createAddress).toHaveBeenCalledOnce()
  })

  it("allows partial update payloads for shared checkout customer adapters", async () => {
    interface CheckoutAddress {
      firstName?: string
      lastName?: string
      street?: string
      city?: string
      postalCode?: string
      country?: string
      phone?: string
      isDefaultShipping?: boolean
    }
    type UpdateInput = CheckoutAddress & { addressId?: string }
    interface SharedUpdateParams {
      first_name?: string
      last_name?: string
      address_1?: string
      city?: string
      postal_code?: string
      country_code?: string
      phone?: string
      is_default_shipping?: boolean
    }

    const service = createService()
    const updateAddress = vi.fn(
      async (id: string, params: SharedUpdateParams) => ({
        id,
        ...(params.address_1 ? { address_1: params.address_1 } : {}),
        ...(params.city ? { city: params.city } : {}),
      })
    )
    const { useUpdateCustomerAddress } = createCustomerHooks<
      Customer,
      Address,
      { enabled?: boolean },
      ListParams,
      CheckoutAddress,
      CheckoutAddress,
      UpdateInput,
      SharedUpdateParams,
      UpdateCustomerParams,
      UpdateCustomerParams
    >({
      addressAdapter: createCheckoutCustomerAddressAdapter<
        CheckoutAddress,
        UpdateInput
      >({
        defaultCountryCode: "CZ",
      }),
      buildListParams: () => ({}),
      queryKeyNamespace: "customers-validation-partial-update",
      service: {
        ...service,
        updateAddress,
      },
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)
    const { result } = renderHook(() => useUpdateCustomerAddress(), {
      wrapper,
    })

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          addressId: "addr_1",
          phone: " +420123456789 ",
        })
      ).resolves.toMatchObject({ id: "addr_1" })
    })

    expect(updateAddress).toHaveBeenCalledWith(
      "addr_1",
      expect.objectContaining({
        phone: "+420123456789",
      })
    )
  })
})
