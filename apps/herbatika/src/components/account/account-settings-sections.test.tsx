import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { AccountSettingsSections } from "./account-settings-sections"

vi.mock("@/components/account-settings", () => ({
  AccountSettings: () => <section data-account-section="profile" />,
}))

vi.mock("./addresses/account-addresses", () => ({
  AccountAddresses: () => <section data-account-section="addresses" />,
}))

vi.mock("./account-deactivation-section", () => ({
  AccountDeactivationSection: () => (
    <section data-account-section="deactivation" />
  ),
}))

describe("account settings sections", () => {
  it("keeps saved-address management inside the approved settings section", () => {
    const html = renderToStaticMarkup(<AccountSettingsSections />)

    expect(html).toContain('data-account-section="profile"')
    expect(html).toContain('data-account-section="addresses"')
    expect(html).toContain('data-account-section="deactivation"')
    expect(html.indexOf("profile")).toBeLessThan(html.indexOf("addresses"))
    expect(html.indexOf("addresses")).toBeLessThan(html.indexOf("deactivation"))
  })
})
