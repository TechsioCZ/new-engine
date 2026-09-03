// @vitest-environment jsdom

import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import { Header, HeaderContext } from "@techsio/ui-kit/organisms/header"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { useContext } from "react"
import { afterEach, describe, expect, it } from "vitest"

function ControlledMobileDialog() {
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useContext(HeaderContext)

  return (
    <Dialog
      customTrigger
      onOpenChange={({ open }) => setIsMobileMenuOpen(open)}
      open={isMobileMenuOpen}
      portal={false}
      title="Mobile navigation"
    >
      <p>Mobile menu content</p>
    </Dialog>
  )
}

function MobileHeaderHarness() {
  return (
    <Header>
      <Header.Hamburger />
      <Header.Mobile data-testid="mobile-menu">
        <ControlledMobileDialog />
      </Header.Mobile>
    </Header>
  )
}

afterEach(cleanup)

describe("mobile hamburger provider and dialog integration", () => {
  it("opens and closes through the actual button, second click, and Escape", async () => {
    render(<MobileHeaderHarness />)

    const button = screen.getByRole("button", { name: "Toggle mobile menu" })
    const mobileMenu = screen.getByTestId("mobile-menu")

    expect(button.getAttribute("aria-expanded")).toBe("false")
    expect(mobileMenu.getAttribute("data-open")).toBe("false")

    fireEvent.click(button)

    expect(button.getAttribute("aria-expanded")).toBe("true")
    expect(mobileMenu.getAttribute("data-open")).toBe("true")

    fireEvent.click(button)

    expect(button.getAttribute("aria-expanded")).toBe("false")
    expect(mobileMenu.getAttribute("data-open")).toBe("false")

    fireEvent.click(button)
    expect(button.getAttribute("aria-expanded")).toBe("true")

    fireEvent.keyDown(await screen.findByRole("dialog"), {
      code: "Escape",
      key: "Escape",
    })

    await waitFor(() => {
      expect(button.getAttribute("aria-expanded")).toBe("false")
      expect(mobileMenu.getAttribute("data-open")).toBe("false")
    })
  })
})
