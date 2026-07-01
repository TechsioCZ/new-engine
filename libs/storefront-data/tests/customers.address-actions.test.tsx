import { QueryClient } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { StorefrontDataProvider } from "../src/client/provider"
import { createCustomerHooks } from "../src/customers/hooks"
import type { CustomerService } from "../src/customers/types"

type Customer = { id: string }
type Address = { id: string; address_1?: string }
type ListInput = { enabled?: boolean }
type ListParams = Record<string, never>
type CreateParams = { address_1?: string }
type UpdateInput = { addressId?: string; address_1?: string }
type UpdateParams = { address_1?: string }
type UpdateCustomerParams = { metadata?: Record<string, unknown> }

const createWrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <StorefrontDataProvider client={client}>{children}</StorefrontDataProvider>
  )

describe("customer address mutation actions", () => {
  it("exposes named actions wired to the TanStack mutation actions", async () => {
    let createInput: CreateParams | null = null
    let updateAddressId: string | null = null
    let updateInput: UpdateParams | null = null

    const service: CustomerService<
      Customer,
      Address,
      ListParams,
      CreateParams,
      UpdateParams,
      UpdateCustomerParams
    > = {
      getAddresses: () => Promise.resolve({ addresses: [] }),
      createAddress: (params) => {
        createInput = params
        return Promise.resolve({ id: "addr_created", ...params })
      },
      updateAddress: (addressId, params) => {
        updateAddressId = addressId
        updateInput = params
        return Promise.resolve({ id: addressId, ...params })
      },
      deleteAddress: () => Promise.resolve(),
    }

    const { useCreateCustomerAddress, useUpdateCustomerAddress } =
      createCustomerHooks<
        Customer,
        Address,
        ListInput,
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
        queryKeyNamespace: "customer-address-actions",
      })

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const wrapper = createWrapper(queryClient)

    const createHook = renderHook(() => useCreateCustomerAddress(), { wrapper })
    const updateHook = renderHook(() => useUpdateCustomerAddress(), { wrapper })

    expect(createHook.result.current.createAddress).toBe(
      createHook.result.current.mutate
    )
    expect(createHook.result.current.createAddressAsync).toBe(
      createHook.result.current.mutateAsync
    )
    expect(updateHook.result.current.updateAddress).toBe(
      updateHook.result.current.mutate
    )
    expect(updateHook.result.current.updateAddressAsync).toBe(
      updateHook.result.current.mutateAsync
    )

    await act(async () => {
      const created = await createHook.result.current.createAddressAsync({
        address_1: "New",
      })
      expect(created).toEqual({ id: "addr_created", address_1: "New" })
    })

    await act(async () => {
      const updated = await updateHook.result.current.updateAddressAsync({
        addressId: "addr_1",
        address_1: "Updated",
      })
      expect(updated).toEqual({ id: "addr_1", address_1: "Updated" })
    })

    expect(createInput).toEqual({ address_1: "New" })
    expect(updateAddressId).toBe("addr_1")
    expect(updateInput).toEqual({ address_1: "Updated" })

    queryClient.clear()
  })
})
