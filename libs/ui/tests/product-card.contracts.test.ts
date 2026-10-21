import { type ComponentProps, createElement, createRef, type Ref } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, expectTypeOf, it } from "vitest"
import type { Image } from "../src/atoms/image"
import { ProductCard } from "../src/molecules/product-card"
import { ProductCardTemplate } from "../src/templates/product-card"

function Adapter(_props: {
  src: string
  alt: string
  assetId: string
  ref?: Ref<HTMLImageElement>
}) {
  return null
}

// These calls are intentionally never rendered: TypeScript enforces the public adapter contract.
function imageTypeCases() {
  ProductCard.Image({
    src: "photo.jpg",
    alt: "Photo",
    ref: createRef<HTMLImageElement>(),
  })
  ProductCard.Image({ src: "photo.jpg", alt: "" })
  ProductCard.Image({
    as: Adapter,
    src: "photo.jpg",
    alt: "Photo",
    assetId: "asset-1",
    ref: createRef<HTMLImageElement>(),
  })
  ProductCard.Image({
    src: "photo.jpg",
    alt: "Photo",
    // @ts-expect-error A native image cannot receive an unrelated element ref.
    ref: createRef<HTMLDivElement>(),
  })
  // @ts-expect-error Default image requires both content and accessibility props.
  ProductCard.Image({})
  // @ts-expect-error Missing source.
  ProductCard.Image({ alt: "Photo" })
  // @ts-expect-error Missing alternative text.
  ProductCard.Image({ src: "photo.jpg" })
  // @ts-expect-error Adapter-specific requirements must survive the wrapper.
  ProductCard.Image({ as: Adapter, src: "photo.jpg", alt: "Photo" })
}

describe("ProductCard public contracts", () => {
  it("preserves required default and adapter image props", () => {
    expectTypeOf(imageTypeCases).toBeFunction()
    type NativeProps = ComponentProps<typeof ProductCard.Image<typeof Image>>
    expectTypeOf<NativeProps["alt"]>().toEqualTypeOf<string>()
    expectTypeOf<NativeProps["src"]>().toEqualTypeOf<string>()
  })
  it("inherits Button loading, native events, attributes and ref", () => {
    const props: ComponentProps<typeof ProductCard.Button> = {
      isLoading: true,
      loadingText: "Adding product",
      disabled: true,
      type: "button",
      "aria-label": "Add product",
      ref: createRef<HTMLButtonElement>(),
      onClick: (event) => {
        event.preventDefault()
        event.stopPropagation()
      },
    }
    const html = renderToStaticMarkup(createElement(ProductCard.Button, props))
    expect(html).toContain('disabled=""')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain("Adding product")
  })
  it("forwards ordinary and dynamic badge attributes and styles", () => {
    const html = renderToStaticMarkup(
      createElement(ProductCardTemplate, {
        badges: [
          {
            variant: "info",
            size: "lg",
            children: "Available",
            title: "Stock",
            "aria-label": "In stock",
            className: "standard-badge",
            style: { opacity: 0.9 },
          },
          {
            variant: "dynamic",
            size: "lg",
            children: "Offer",
            title: "Sale",
            "aria-label": "Special offer",
            className: "dynamic-badge",
            style: { opacity: 0.8, color: "ignored" },
            bgColor: "gold",
            fgColor: "black",
            borderColor: "black",
          },
        ],
      })
    )
    expect(html).toContain('title="Stock"')
    expect(html).toContain('aria-label="In stock"')
    expect(html).toContain("standard-badge")
    expect(html).toContain("dynamic-badge")
    expect(html).toContain("opacity:0.9")
    expect(html).toContain("opacity:0.8")
    expect(html).toContain("color:black")
    expect(html).not.toContain("ignored")
    expect(html).toContain("text-badge-lg")
  })
  it("forwards router adapter props to the name link", () => {
    function RouterLink({
      href,
      trackingId,
      children,
    }: {
      href?: string
      trackingId: string
      children: React.ReactNode
    }) {
      return createElement("a", { href, "data-tracking": trackingId }, children)
    }
    const html = renderToStaticMarkup(
      createElement(ProductCardTemplate<typeof RouterLink>, {
        name: "M8 kit",
        href: "/products/m8",
        linkAs: RouterLink,
        linkProps: { trackingId: "related-item" },
        showActions: false,
      })
    )
    expect(html).toContain('href="/products/m8"')
    expect(html).toContain('data-tracking="related-item"')
  })
  it("keeps localized price meanings and name navigation without actions", () => {
    const html = renderToStaticMarkup(
      createElement(ProductCardTemplate, {
        name: "M8 kit",
        href: "/products/m8",
        showActions: false,
        price: "249 Kč",
        originalPrice: "299 Kč",
        originalPriceLabel: "Původní cena",
        currentPriceLabel: "Aktuální cena",
      })
    )
    expect(html).toContain('href="/products/m8"')
    expect(html).toContain("<h3")
    expect(html).toContain("<del>")
    expect(html.indexOf("Původní cena")).toBeLessThan(html.indexOf("299 Kč"))
    expect(html.indexOf("Aktuální cena")).toBeLessThan(html.indexOf("249 Kč"))
    expect(html).not.toContain("<button")
    const unlinked = renderToStaticMarkup(
      createElement(ProductCardTemplate, { name: "M8 kit" })
    )
    expect(unlinked).not.toContain("<a ")
  })
})
