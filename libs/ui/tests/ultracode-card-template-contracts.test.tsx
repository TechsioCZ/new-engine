// @vitest-environment happy-dom
import { strictEqual } from "node:assert/strict"
import { act, type ComponentProps, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { within } from "storybook/test"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  ProductCardTemplate,
  type ProductCardTemplateProps,
} from "../src/templates/product-card"
import akrosMeta, {
  AvailabilityStates,
  PriceStates,
  States,
} from "../stories/templates/akros-product-card.stories"
import templateMeta, {
  LinkedSaleCard,
  OutOfStock,
  Playground,
} from "../stories/templates/product-card.stories"

type TemplateFixture = { args?: Partial<ProductCardTemplateProps> }
type AkrosProps = ComponentProps<typeof akrosMeta.component>
type AkrosFixture = { args?: Partial<AkrosProps>; render?: unknown }

const DIGIT_PATTERN = /\d/

function template(
  story: TemplateFixture,
  overrides: Partial<ProductCardTemplateProps> = {}
) {
  return (
    <ProductCardTemplate
      {...templateMeta.args}
      {...story.args}
      {...overrides}
    />
  )
}

function akros(story: AkrosFixture, overrides: Partial<AkrosProps> = {}) {
  if (typeof story.render !== "function") {
    throw new Error("Expected an Akros composition story render")
  }
  const render = story.render as (
    args: AkrosProps,
    context: unknown
  ) => ReactNode
  return render({ ...akrosMeta.args, ...story.args, ...overrides }, {})
}

async function withCanvas(
  content: ReactNode,
  dir: "ltr" | "rtl",
  check: (host: HTMLElement) => void | Promise<void>
) {
  const host = document.createElement("div")
  host.dir = dir
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(() => root.render(content))
    await check(host)
  } finally {
    await act(() => root.unmount())
    host.remove()
  }
}

function required<T extends Element = HTMLElement>(
  parent: ParentNode,
  selector: string
) {
  const element = parent.querySelector<T>(selector)
  if (!element) {
    throw new Error(`Missing card element: ${selector}`)
  }
  return element
}

function getButton(parent: HTMLElement, name: string) {
  return within(parent).getByRole<HTMLButtonElement>("button", { name })
}

function card(host: HTMLElement, name: string) {
  const heading = within(host).getByRole("heading", { name, level: 3 })
  const article = heading.closest("article")
  if (!article) {
    throw new Error(`Missing product article: ${name}`)
  }
  return article
}

// These token names identify the requested glyph, not incidental layout classes.
const expectDecorativeIcon = (parent: HTMLElement, token: string) => {
  const icon = required(parent, `.${token}`)
  strictEqual(icon.getAttribute("aria-hidden"), "true")
  strictEqual(icon.hasAttribute("tabindex"), false)
  strictEqual(icon.hasAttribute("aria-label"), false)
}

beforeEach(() => vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true))
afterEach(() => vi.unstubAllGlobals())

// happy-dom can verify semantics and native click guards in either direction;
// it cannot establish responsive geometry or whether a CSS icon mask paints.
describe.each(["ltr", "rtl"] as const)(
  "card composition contracts (%s)",
  (dir) => {
    describe("ProductCardTemplate", () => {
      it("keeps cart, details and wishlist actions independently named and routed", async () => {
        const onAddToCart = vi.fn()
        const onViewDetails = vi.fn()
        const onAddToWishlist = vi.fn()
        await withCanvas(
          template(Playground, { onAddToCart, onViewDetails, onAddToWishlist }),
          dir,
          async (host) => {
            const canvas = within(host)
            const actions = [
              ["Add to Cart", "token-icon-cart-button", onAddToCart],
              ["View Details", "token-icon-detail-button", onViewDetails],
              [
                "Add to Wishlist",
                "token-icon-wishlist-button",
                onAddToWishlist,
              ],
            ] as const
            expect(canvas.getAllByRole("button")).toHaveLength(3)
            for (const [name, icon, callback] of actions) {
              const button = canvas.getByRole("button", { name })
              expect(button.getAttribute("type")).toBe("button")
              expectDecorativeIcon(button, icon)
              await act(() => button.click())
              expect(callback).toHaveBeenCalledTimes(1)
            }
            expect(onAddToCart).toHaveBeenCalledTimes(1)
            expect(onViewDetails).toHaveBeenCalledTimes(1)
            expect(onAddToWishlist).toHaveBeenCalledTimes(1)
            expect(
              canvas.getByRole("img", { name: "4.5 out of 5" })
            ).toBeDefined()
            expect(canvas.queryByRole("radiogroup")).toBeNull()
          }
        )
      })

      it("uses notification rather than cart imagery for the supplied unavailable-stock action", async () => {
        const notify = vi.fn()
        const details = vi.fn()
        await withCanvas(
          template(OutOfStock, {
            onAddToCart: notify,
            onViewDetails: details,
            onAddToWishlist: undefined,
          }),
          dir,
          async (host) => {
            const canvas = within(host)
            expect(canvas.getByText("Out of Stock")).toBeDefined()
            const button = canvas.getByRole("button", { name: "Notify Me" })
            expectDecorativeIcon(button, "token-icon-product-card-notify")
            expect(button.querySelector(".token-icon-cart-button")).toBeNull()
            expect(
              canvas.queryByRole("button", { name: "Add to Cart" })
            ).toBeNull()
            await act(() => button.click())
            expect(notify).toHaveBeenCalledTimes(1)
            expect(details).not.toHaveBeenCalled()
          }
        )
      })

      it("keeps localized sale-price meanings and a focusable heading link when actions are hidden", async () => {
        const onAddToCart = vi.fn()
        await withCanvas(
          template(LinkedSaleCard, { onAddToCart }),
          dir,
          (host) => {
            const canvas = within(host)
            const heading = canvas.getByRole("heading", {
              name: "Montážní sada M8",
            })
            const link = within(heading).getByRole("link", {
              name: "Montážní sada M8",
            })
            expect(link.getAttribute("href")).toBe("#montazni-sada-m8")
            link.focus()
            expect(document.activeElement).toBe(link)
            expect(canvas.queryByRole("button")).toBeNull()
            expect(required(host, "del").textContent).toBe(
              "Původní cena: 299 Kč"
            )
            const current = canvas.getByText("Aktuální cena:").parentElement
            if (!current) {
              throw new Error("Missing current-price container")
            }
            expect(current.textContent).toBe("Aktuální cena: 249 Kč")
            expect(current.closest("del")).toBeNull()
            expect(onAddToCart).not.toHaveBeenCalled()
          }
        )
      })

      it("does not manufacture missing actions or a deleted price for a current-only card", async () => {
        await withCanvas(
          <ProductCardTemplate name="Current price only" price="0 Kč" />,
          dir,
          (host) => {
            const canvas = within(host)
            expect(canvas.queryByRole("button")).toBeNull()
            expect(host.querySelector("del")).toBeNull()
            expect(canvas.queryByText("Original price:")).toBeNull()
            expect(
              canvas.getByText("Current price:").parentElement?.textContent
            ).toBe("Current price: 0 Kč")
          }
        )
      })
    })

    describe("Akros ProductCard composition", () => {
      it("only dispatches settled enabled cart actions and retains pending/disabled meanings", async () => {
        const onAddToCart = vi.fn()
        await withCanvas(akros(States, { onAddToCart }), dir, async (host) => {
          // States also contains the discounted card with the same product name;
          // scope the ordinary card by its unique button name plus price state.
          const knownCard = [
            ...host.querySelectorAll<HTMLElement>("article"),
          ].find(
            (article) =>
              article.querySelector(
                '[data-akros-card-price][data-state="known"]'
              ) &&
              within(article).queryByRole("button", {
                name: "Do košíku: Montážní sada M8",
              })
          )
          if (!knownCard) {
            throw new Error("Missing ordinary purchasable Akros card")
          }
          const add = getButton(knownCard, "Do košíku: Montážní sada M8")
          expect(add.disabled).toBe(false)
          expectDecorativeIcon(add, "token-icon-cart-button")
          await act(() => add.click())
          expect(onAddToCart).toHaveBeenCalledTimes(1)

          const pendingCard = card(host, "Probíhající přidání")
          const pending = getButton(
            pendingCard,
            "Přidávám do košíku: Probíhající přidání"
          )
          expect(pending.getAttribute("aria-busy")).toBe("true")
          expect(pending.getAttribute("aria-disabled")).toBe("true")
          expect(pending.textContent).toContain("Přidávám…")
          expectDecorativeIcon(pending, "token-icon-button-spinner")
          expect(pending.querySelector(".token-icon-cart-button")).toBeNull()
          await act(() => pending.click())
          expect(onAddToCart).toHaveBeenCalledTimes(1)

          const disabled = getButton(
            card(host, "Nedostupný produkt"),
            "Do košíku: Nedostupný produkt"
          )
          expect(disabled.disabled).toBe(true)
          await act(() => disabled.click())
          expect(onAddToCart).toHaveBeenCalledTimes(1)
          const variants = card(host, "Produkt s variantami")
          const variantLink = within(variants).getByRole("link", {
            name: "Vybrat variantu",
          })
          expect(variantLink.getAttribute("href")).toBe("#product-preview")
          expect(within(variants).queryByRole("button")).toBeNull()
        })
      })

      it("preserves known, from, discounted, on-request and pending price semantics", async () => {
        await withCanvas(akros(PriceStates), dir, (host) => {
          const price = (name: string) =>
            required(card(host, name), "[data-akros-card-price]")
          const known = price("Známá cena")
          expect(within(known).getByText("249 Kč")).toBeDefined()
          expect(within(known).getByText("vč. DPH")).toBeDefined()
          expect(within(known).getByText("za balení")).toBeDefined()
          expect(known.querySelector("del")).toBeNull()
          const from = price("Cena od")
          expect(within(from).getByText("Od")).toBeDefined()
          expect(within(from).getByText("249 Kč")).toBeDefined()
          const discounted = price("Zlevněné balení")
          expect(required(discounted, "del").textContent).toBe(
            "Původní cena 311,25 Kč"
          )
          expect(
            within(discounted).getByText("249 Kč").closest("del")
          ).toBeNull()
          expect(within(discounted).getByText("−20 %")).toBeDefined()
          const request = price("Cena na dotaz")
          expect(within(request).getByText("Cena na dotaz")).toBeDefined()
          expect(
            within(request).getByText("Cenu upřesní obchodní zástupce.")
          ).toBeDefined()
          expect(
            within(card(host, "Cena na dotaz")).getByRole("link", {
              name: "Zobrazit detail",
            })
          ).toBeDefined()
          const pending = price("Cena se načítá")
          expect(
            within(pending).getByText("Načítání ceny produktu")
          ).toBeDefined()
          for (const unavailablePrice of [request, pending]) {
            expect(unavailablePrice.textContent).not.toMatch(DIGIT_PATTERN)
            expect(unavailablePrice.querySelector("del")).toBeNull()
            expect(within(unavailablePrice).queryByText("za balení")).toBeNull()
          }
        })
      })

      it("pairs readable stock labels with the matching decorative icon and next action", async () => {
        await withCanvas(akros(AvailabilityStates), dir, (host) => {
          const cases = [
            ["Dostupný produkt", "Skladem", "available", "cart"],
            ["Omezená dostupnost", "Poslední balení", "limited", "cart"],
            ["Produkt na objednávku", "Na objednávku", "preorder", "detail"],
            ["Nedostupný produkt", "Není skladem", "unavailable", "disabled"],
            ["Neznámá dostupnost", "Dostupnost neznámá", "unknown", "detail"],
          ] as const
          for (const [name, label, status, action] of cases) {
            const article = card(host, name)
            const availability = required(
              article,
              "[data-akros-card-availability]"
            )
            expect(within(availability).getByText(label)).toBeDefined()
            expectDecorativeIcon(
              availability,
              `token-icon-availability-status-${status}`
            )
            if (action === "detail") {
              const detail = within(article).getByRole("link", {
                name: "Zobrazit detail",
              })
              expect(detail.getAttribute("href")).toBe("#product-preview")
              expect(within(article).queryByRole("button")).toBeNull()
            } else {
              const button = getButton(article, `Do košíku: ${name}`)
              expect(button.disabled).toBe(action === "disabled")
              expectDecorativeIcon(button, "token-icon-cart-button")
            }
          }
          const pending = card(host, "Dostupnost se načítá")
          const pendingAvailability = required(
            pending,
            "[data-akros-card-availability]"
          )
          expect(
            within(pendingAvailability).getByText(
              "Načítání dostupnosti produktu"
            )
          ).toBeDefined()
          expect(
            getButton(pending, "Do košíku: Dostupnost se načítá").disabled
          ).toBe(true)
        })
      })
    })
  }
)
