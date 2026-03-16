import { QueryClient } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { createCheckoutCustomerAddressAdapter } from "../src/checkout/address"
import { StorefrontDataProvider } from "../src/client/provider"
import { createCustomerHooks } from "../src/customers/hooks"
import type { CustomerAddressAdapter } from "../src/customers/types"
import type { ReactNode } from "react"
import {
  StorefrontAddressValidationError,
  type StorefrontAddressValidationIssue,
} from "../src/shared/address"

const createWrapper = (client: QueryClient) =>
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

  it("keeps addressId in the default customer adapter update input type", () => {
    const updateInput: DefaultCustomerUpdateInput = {
      addressId: "addr_1",
      city: "Prague",
    }

    expect(updateInput.addressId).toBe("addr_1")
  })

  it("passes addressId through to custom update adapters", async () => {
    type UpdateInput = { addressId?: string; city?: string }

    const service = createService()
    const toUpdateParams = vi.fn((input: UpdateInput) => ({
      city: input.city,
    }))
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
      service,
      buildListParams: () => ({}),
      queryKeyNamespace: "customers-update-address-id",
      addressAdapter: {
        toUpdateParams,
      },
    })

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)
    const { result } = renderHook(() => useUpdateCustomerAddress(), { wrapper })

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          addressId: "addr_1",
          city: "Prague",
        })
      ).resolves.toMatchObject({ id: "addr_1", city: "Prague" })
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

  it("allows partial update payloads for shared checkout customer adapters", async () => {
    type CheckoutAddress = {
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
    type SharedUpdateParams = {
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
    const updateAddress = vi.fn(async (id: string, params: SharedUpdateParams) => ({
      id,
      address_1: params.address_1,
      city: params.city,
    }))
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
      service: {
        ...service,
        updateAddress,
      },
      buildListParams: () => ({}),
      queryKeyNamespace: "customers-validation-partial-update",
      addressAdapter: createCheckoutCustomerAddressAdapter<
        CheckoutAddress,
        UpdateInput
      >({
        defaultCountryCode: "CZ",
      }),
    })

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })
    const wrapper = createWrapper(queryClient)
    const { result } = renderHook(() => useUpdateCustomerAddress(), { wrapper })

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
