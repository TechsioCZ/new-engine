import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import type { CustomerAddress } from "./account-address-model"

vi.mock("next-intl", () => ({
  useLocale: () => "sk-SK",
  useTranslations: () => (key: string) => key,
}))
vi.mock("@techsio/ui-kit/atoms/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}))

import { AccountAddressCard } from "./account-address-card"

const ADDRESS: CustomerAddress = {
  id: "addr_ro",
  first_name: "Ana",
  last_name: "Popescu",
  company: null,
  address_1: "Strada Florilor 10",
  city: "București",
  postal_code: "010101",
  country_code: "ro",
  phone: null,
  is_default_shipping: true,
  is_default_billing: false,
}

const renderCard = (canEdit: boolean) =>
  renderToStaticMarkup(
    <AccountAddressCard
      address={ADDRESS}
      canEdit={canEdit}
      onDelete={vi.fn()}
      onEdit={vi.fn()}
    />
  )

describe("AccountAddressCard market boundary", () => {
  it("keeps a cross-market address visible and globally deletable while hiding edit", () => {
    const html = renderCard(false)

    expect(html).toContain("Ana Popescu")
    expect(html).toContain("account.addresses.default_shipping")
    expect(html).not.toContain("account.addresses.edit")
    expect(html).toContain("account.addresses.delete")
  })

  it("shows edit for an address managed by the active market", () => {
    expect(renderCard(true)).toContain("account.addresses.edit")
  })
})
