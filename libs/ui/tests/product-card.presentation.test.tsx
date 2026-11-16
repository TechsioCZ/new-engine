import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  ProductCard,
  type ProductCardProps,
} from "../src/molecules/product-card"

function card(props: Partial<ProductCardProps> = {}) {
  return renderToStaticMarkup(
    <ProductCard {...props}>
      <ProductCard.Image alt="Shoe" src="shoe.jpg" />
      <ProductCard.Name>Trail shoe</ProductCard.Name>
      <ProductCard.Stock status="in-stock">In stock</ProductCard.Stock>
    </ProductCard>
  )
}

describe("ProductCard shadow", () => {
  it("keeps the default surface shadow", () => {
    const html = card()
    expect(html).toContain("shadow-sm")
    expect(html).not.toContain("shadow-none")
  })

  it("disables the surface shadow for flat catalogues", () => {
    const html = card({ shadow: false })
    expect(html).toContain("shadow-none")
    expect(html).not.toContain("shadow-sm")
  })
})

describe("ProductCard presentation", () => {
  it("keeps the default presentation on the original component tokens", () => {
    const html = card()
    expect(html).toContain("rounded-product-card")
    expect(html).toContain("p-product-card-padding")
    expect(html).toContain("bg-product-card-bg")
    expect(html).toContain("gap-product-card-col-layout")
    expect(html).toContain("font-product-card-name")
    expect(html).toContain("font-product-card-stock")
    expect(html).not.toContain("featured")
  })

  it("applies the featured surface, media, name and stock roles", () => {
    const html = card({ presentation: "featured" })
    expect(html).toContain("rounded-product-card-featured")
    expect(html).toContain("p-product-card-featured-padding")
    expect(html).toContain(
      "border-(length:--border-product-card-featured-width)"
    )
    expect(html).toContain("bg-product-card-featured-bg")
    expect(html).toContain("rounded-product-card-featured-image")
    expect(html).toContain("font-product-card-featured-name")
    expect(html).toContain("text-product-card-featured-name-size")
    expect(html).toContain("font-product-card-featured-stock")
    expect(html).toContain("text-product-card-featured-stock-size")
    expect(html).toContain("gap-product-card-featured-col-layout")
    expect(html).not.toContain("rounded-product-card p-")
    expect(html).not.toContain("gap-product-card-col-layout")
  })

  it("keeps featured spacing off the row layout gap", () => {
    const html = card({ presentation: "featured", layout: "row" })
    expect(html).not.toContain("gap-product-card-featured-col-layout")
  })
})

describe("ProductCard.Image objectFit", () => {
  it("defaults the media slot to object-cover", () => {
    const html = card()
    expect(html).toContain("object-cover")
    expect(html).not.toContain("object-contain")
  })

  it("applies object-contain and drops the cover crop", () => {
    const html = renderToStaticMarkup(
      <ProductCard>
        <ProductCard.Image alt="Shoe" objectFit="contain" src="shoe.jpg" />
      </ProductCard>
    )
    expect(html).toContain("object-contain")
    expect(html).not.toContain("object-cover")
  })

  it("follows the featured presentation for the media slot", () => {
    const html = renderToStaticMarkup(
      <ProductCard presentation="featured">
        <ProductCard.Image alt="Shoe" src="shoe.jpg" />
      </ProductCard>
    )
    expect(html).toContain("rounded-product-card-featured-image")
    expect(html).toContain("object-cover")
  })
})
