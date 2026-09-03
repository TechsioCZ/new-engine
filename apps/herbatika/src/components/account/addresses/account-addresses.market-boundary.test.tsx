// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { CustomerAddress } from "./account-address-model"

const mocks = vi.hoisted(() => ({
  addresses: [
    {
      id: "addr_ro",
      first_name: "Ana",
      last_name: "Popescu",
      country_code: "ro",
    },
    {
      id: "addr_sk",
      first_name: "Ján",
      last_name: "Novák",
      country_code: "sk",
    },
  ] as CustomerAddress[],
}))

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))
vi.mock("@techsio/ui-kit/atoms/button", () => ({
  Button: ({
    children,
    onClick,
    type,
  }: {
    children: ReactNode
    onClick?: () => void
    type?: "button" | "submit"
  }) => (
    <button onClick={onClick} type={type ?? "button"}>
      {children}
    </button>
  ),
}))
vi.mock("@techsio/ui-kit/atoms/status-text", () => ({
  StatusText: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}))
vi.mock("@/components/account/account-surface", () => ({
  AccountSkeletonSurface: () => <p>loading</p>,
  AccountSurface: ({ children }: { children: ReactNode }) => (
    <section>{children}</section>
  ),
}))
vi.mock("@/lib/storefront/customers", () => ({
  useCustomerAddresses: () => ({
    addresses: mocks.addresses,
    error: null,
    isLoading: false,
    query: { refetch: vi.fn() },
  }),
}))
vi.mock("@/lib/storefront/market-context-provider", () => ({
  useMarketContext: () => ({ countryCode: "sk" }),
}))
vi.mock("./account-address-card", () => ({
  AccountAddressCard: ({
    address,
    canEdit,
    onEdit,
  }: {
    address: CustomerAddress
    canEdit: boolean
    onEdit: (address: CustomerAddress) => void
  }) => (
    <article>
      <span>{address.first_name}</span>
      <span>{canEdit ? "editable" : "locked"}</span>
      <button onClick={() => onEdit(address)} type="button">
        force-edit-{address.id}
      </button>
    </article>
  ),
}))
vi.mock("./account-address-form-dialog", () => ({
  AccountAddressFormDialog: ({
    address,
  }: {
    address: CustomerAddress | null
  }) => <p>editor-{address?.id ?? "new"}</p>,
}))
vi.mock("./account-address-delete-dialog", () => ({
  AccountAddressDeleteDialog: () => <p>delete-dialog</p>,
}))

import { AccountAddresses } from "./account-addresses"

describe("AccountAddresses market boundary", () => {
  afterEach(cleanup)

  it("displays foreign addresses but rejects a bypassed cross-market edit", () => {
    render(<AccountAddresses />)

    expect(screen.getByText("Ana")).toBeTruthy()
    expect(screen.getByText("locked")).toBeTruthy()
    fireEvent.click(screen.getByText("force-edit-addr_ro"))
    expect(screen.queryByText("editor-addr_ro")).toBeNull()
  })

  it("opens the editor for an address in the active market", () => {
    render(<AccountAddresses />)

    expect(screen.getByText("Ján")).toBeTruthy()
    expect(screen.getByText("editable")).toBeTruthy()
    fireEvent.click(screen.getByText("force-edit-addr_sk"))
    expect(screen.getByText("editor-addr_sk")).toBeTruthy()
  })
})
