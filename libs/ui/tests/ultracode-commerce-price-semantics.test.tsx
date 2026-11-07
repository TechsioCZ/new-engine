// @vitest-environment happy-dom
import { act, createRef, type ReactElement } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  AvailabilityStatus,
  type AvailabilityStatusProps,
} from "../src/molecules/availability-status"
import { PriceBlock, type PriceBlockProps } from "../src/molecules/price-block"
import { ProductCard } from "../src/molecules/product-card"
import { TotalsSummary } from "../src/molecules/totals-summary"
import { LineItem } from "../src/organisms/line-item"
import { ProductCardTemplate } from "../src/templates/product-card"

function canvas(element: ReactElement) {
  const host = document.createElement("div")
  host.innerHTML = renderToStaticMarkup(element)
  return host
}

function query<T extends HTMLElement = HTMLElement>(
  parent: ParentNode,
  selector: string
) {
  const element = parent.querySelector<T>(selector)
  if (!element) {
    throw new Error(`Missing commerce element: ${selector}`)
  }
  return element
}

const currencies = [
  { name: "zero CZK", amount: "0 Kč", original: "249,50 Kč" },
  {
    name: "EUR with narrow nonbreaking grouping",
    amount: "1 234 567,89 €",
    original: "1 999 999,99 €",
  },
  { name: "zero-decimal JPY", amount: "￥1,234", original: "￥2,345" },
  {
    name: "Arabic digits and direction marks",
    amount: "‏١٬٢٣٤٫٥٠ ر.س.‏",
    original: "‏٢٬٣٤٥٫٧٥ ر.س.‏",
  },
]

function buyingDetails(
  composition: "card" | "cart",
  price: PriceBlockProps,
  availability: AvailabilityStatusProps
) {
  const details = (
    <>
      <PriceBlock {...price} id="price" />
      <AvailabilityStatus {...availability} id="availability" />
    </>
  )
  if (composition === "card") {
    // PriceBlock has a div root, so compose it directly rather than nesting it
    // inside ProductCard.Price's paragraph.
    return (
      <ProductCard dir="rtl" layout="row">
        <ProductCard.Name>Montážní sada M8</ProductCard.Name>
        {details}
      </ProductCard>
    )
  }
  return (
    <LineItem dir="rtl" readOnly title="Montážní sada M8">
      <LineItem.Body>
        <LineItem.Heading>
          <LineItem.Title />
          <LineItem.Price>{details}</LineItem.Price>
        </LineItem.Heading>
        <LineItem.Quantity readOnlyLabel="2 balení" />
      </LineItem.Body>
    </LineItem>
  )
}

const priceStates: PriceBlockProps[] = [
  { state: "known", amountLabel: "0 Kč" },
  { state: "from", prefix: "Od", amountLabel: "249 Kč" },
  {
    state: "on-request",
    label: "Cena na dotaz",
    detail: "Cenu potvrdíme před objednáním.",
  },
  {
    state: "discounted",
    amountLabel: "249 Kč",
    originalLabel: "299 Kč",
    originalSrLabel: "Původní cena",
  },
  { state: "pending", pendingLabel: "Ověřujeme vaši cenu" },
]

const availabilityStates: AvailabilityStatusProps[] = [
  { status: "available", label: "Skladem", detail: "Odesíláme dnes." },
  { status: "limited", label: "Zbývají 2 balení" },
  { status: "preorder", label: "Předobjednávka" },
  { status: "unavailable", label: "Nedostupné" },
  { status: "unknown", label: "Dostupnost zatím neznáme" },
  { status: "pending", pendingLabel: "Ověřujeme dostupnost" },
]

describe("commerce price, currency and stock semantics", () => {
  it.each(currencies)(
    "preserves $name verbatim across the card, cart and subtotal",
    ({ amount, original }) => {
      for (const layout of ["column", "row"] as const) {
        for (const dir of ["ltr", "rtl"] as const) {
          const host = canvas(
            <div dir={dir}>
              <section id="card">
                <ProductCardTemplate
                  currentPriceLabel="Aktuální cena"
                  href="/products/m8"
                  layout={layout}
                  name="Montážní sada M8"
                  originalPrice={original}
                  originalPriceLabel="Původní cena"
                  price={amount}
                  showActions={false}
                  stock={{ status: "in-stock", label: "Skladem 2 balení" }}
                />
              </section>
              <LineItem readOnly title="Montážní sada M8">
                <LineItem.Body>
                  <LineItem.Price>
                    <PriceBlock
                      amountLabel={amount}
                      id="cart-price"
                      state="known"
                      taxLabel="Včetně DPH"
                      unitLabel="za balení"
                    />
                  </LineItem.Price>
                  <LineItem.Quantity readOnlyLabel="2 balení" />
                </LineItem.Body>
              </LineItem>
              <TotalsSummary
                rows={[
                  { id: "goods", label: "Zboží", value: amount },
                  { id: "shipping", label: "Doprava", value: "Zvolte dopravu" },
                ]}
                totalLabel="Mezisoučet včetně DPH"
                totalValue={amount}
              />
            </div>
          )
          const card = query(host, "#card")
          expect(query(card, "del").textContent).toBe(
            `Původní cena: ${original}`
          )
          expect(query(card, "p").textContent).toBe(`Aktuální cena: ${amount}`)
          expect(query(card, "h3 > a").getAttribute("href")).toBe(
            "/products/m8"
          )
          expect(query(card, '[data-stock="in-stock"]').textContent).toBe(
            "Skladem 2 balení"
          )
          const price = query(host, "#cart-price")
          expect(query(price, ":scope > div > span").textContent).toBe(amount)
          expect(
            [...price.querySelectorAll(":scope > div:last-child > span")].map(
              (span) => span.textContent
            )
          ).toEqual(["Včetně DPH", "za balení"])
          expect(query(host, '[data-part="quantity"]').textContent).toBe(
            "2 balení"
          )
          const summary = query(host, '[data-scope="totals-summary"] dl')
          expect(
            [...summary.querySelectorAll("dt")].map((node) => node.textContent)
          ).toEqual(["Zboží", "Doprava", "Mezisoučet včetně DPH"])
          expect(
            [...summary.querySelectorAll("dd")].map((node) => node.textContent)
          ).toEqual([amount, "Zvolte dopravu", amount])
          expect(host.querySelector("button, input, [aria-live]")).toBeNull()
        }
      }
    }
  )

  it.each(["card", "cart"] as const)(
    "keeps every price state independent of stock in the %s composition",
    (composition) => {
      for (const price of priceStates) {
        for (const availability of availabilityStates) {
          const host = canvas(buyingDetails(composition, price, availability))
          const priceElement = query(host, "#price")
          const stockElement = query(host, "#availability")
          expect(priceElement.dataset.state).toBe(price.state)
          expect(stockElement.dataset.status).toBe(availability.status)
          if (price.state === "pending") {
            expect(priceElement.textContent).toBe(price.pendingLabel)
            expect(query(priceElement, ".sr-only").textContent).toBe(
              price.pendingLabel
            )
            expect(
              query(priceElement, '[aria-busy="true"]').getAttribute(
                "aria-hidden"
              )
            ).toBe("true")
          } else if (price.state === "on-request") {
            expect(priceElement.textContent).toBe(
              `${price.label}${price.detail}`
            )
            expect(priceElement.querySelector("del")).toBeNull()
          } else {
            expect(
              query(priceElement, ".text-price-block-amount-size").textContent
            ).toBe(price.amountLabel)
            if (price.state === "from") {
              expect(
                query(priceElement, ".text-price-block-prefix-size").textContent
              ).toBe(price.prefix)
            }
            if (price.state === "discounted") {
              expect(query(priceElement, "del").textContent).toBe(
                `${price.originalSrLabel} ${price.originalLabel}`
              )
            } else {
              expect(priceElement.querySelector("del")).toBeNull()
            }
          }
          if (availability.status === "pending") {
            expect(stockElement.textContent).toBe(availability.pendingLabel)
            expect(
              query(stockElement, '[aria-busy="true"]').getAttribute(
                "aria-hidden"
              )
            ).toBe("true")
          } else {
            expect(stockElement.textContent).toBe(
              `${availability.label}${availability.detail ?? ""}`
            )
            const icon = query(stockElement, '[aria-hidden="true"]')
            expect(
              icon.classList.contains(
                `token-icon-availability-status-${availability.status}`
              )
            ).toBe(true)
            expect(
              query(
                stockElement,
                ".text-availability-status-label-size"
              ).closest('[aria-hidden="true"], [hidden], .sr-only')
            ).toBeNull()
          }
          expect(
            host.querySelector(
              '[role="status"], [aria-live], [tabindex], input, button'
            )
          ).toBeNull()
        }
      }
    }
  )

  it.each(["in-stock", "limited-stock", "out-of-stock"] as const)(
    "preserves caller stock copy for %s even when the card price is zero",
    (status) => {
      const host = canvas(
        <ProductCardTemplate
          name="Montážní sada M8"
          price="0 Kč"
          showActions={false}
          stock={{
            status,
            label: "Dostupnost potvrzuje dodavatel – zavolejte nám.",
          }}
        />
      )
      const stock = query(host, `[data-stock="${status}"]`)
      expect(stock.textContent).toBe(
        "Dostupnost potvrzuje dodavatel – zavolejte nám."
      )
      expect(
        stock.closest('[aria-hidden="true"], [hidden], .sr-only')
      ).toBeNull()
      expect(stock.getAttribute("role")).toBeNull()
    }
  )

  it.each(["card", "cart"] as const)(
    "replaces stale sale and stock content without replacing caller refs in the %s",
    async (composition) => {
      const host = document.createElement("div")
      document.body.append(host)
      const root = createRoot(host)
      const priceRef = createRef<HTMLDivElement>()
      const stockRef = createRef<HTMLDivElement>()
      let priceNode: HTMLDivElement | undefined
      let stockNode: HTMLDivElement | undefined
      try {
        // Two passes cover both sale -> pending and pending -> known without
        // remounting either composition or its price/availability root.
        for (const price of [...priceStates, ...priceStates]) {
          const pending = price.state === "pending"
          const availability: AvailabilityStatusProps = pending
            ? { status: "pending", pendingLabel: "Ověřujeme dostupnost" }
            : { status: "unknown", label: "Dodavatel dostupnost nepotvrdil" }
          await act(() =>
            root.render(
              <>
                <p id="price-help">Ceny za jedno balení.</p>
                {buyingDetails(
                  composition,
                  {
                    ...price,
                    ref: priceRef,
                    className: "caller-price",
                    "aria-describedby": "price-help",
                    style: { textAlign: "start" },
                  },
                  { ...availability, ref: stockRef, className: "caller-stock" }
                )}
              </>
            )
          )
          priceNode ??= query<HTMLDivElement>(host, "#price")
          stockNode ??= query<HTMLDivElement>(host, "#availability")
          expect(priceRef.current).toBe(priceNode)
          expect(stockRef.current).toBe(stockNode)
          expect(priceNode.classList.contains("caller-price")).toBe(true)
          expect(stockNode.classList.contains("caller-stock")).toBe(true)
          expect(priceNode.getAttribute("aria-describedby")).toBe("price-help")
          expect(query(host, "#price-help").textContent).toBe(
            "Ceny za jedno balení."
          )
          expect(priceNode.style.textAlign).toBe("start")
          expect(host.querySelectorAll("del")).toHaveLength(
            price.state === "discounted" ? 1 : 0
          )
          let expectedScreenReaderLabels = 0
          if (pending) {
            expectedScreenReaderLabels = 2
          } else if (price.state === "discounted") {
            expectedScreenReaderLabels = 1
          }
          expect(host.querySelectorAll(".sr-only")).toHaveLength(
            expectedScreenReaderLabels
          )
          if (price.state === "pending") {
            expect(priceNode.textContent).toBe(price.pendingLabel)
          } else if (price.state === "on-request") {
            expect(priceNode.textContent).toBe(`${price.label}${price.detail}`)
          } else if (price.state === "discounted") {
            expect(priceNode.textContent).toBe(
              `${price.amountLabel}${price.originalSrLabel} ${price.originalLabel}`
            )
          } else {
            expect(priceNode.textContent).toBe(
              `${price.state === "from" ? price.prefix : ""}${price.amountLabel}`
            )
          }
          expect(stockNode.textContent).toBe(
            pending ? "Ověřujeme dostupnost" : "Dodavatel dostupnost nepotvrdil"
          )
        }
      } finally {
        await act(() => root.unmount())
        host.remove()
      }
      expect(priceRef.current).toBeNull()
      expect(stockRef.current).toBeNull()
    }
  )
})
