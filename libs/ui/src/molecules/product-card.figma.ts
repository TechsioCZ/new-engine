// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-36053
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/product-card.tsx
// component=ProductCard

import figma from "figma"

const layout = figma.selectedInstance.getEnum("layout", {
  column: "column",
  row: "row",
})

export default {
  id: "ProductCard",
  imports: ['import { ProductCard } from "@techsio/ui-kit/molecules/product-card"'],
  example: figma.tsx`<ProductCard${figma.helpers.react.renderProp(
    "layout",
    layout,
  )}>
        <ProductCard.Image alt="Product" src="/product.jpg"/>
        <ProductCard.Name>Product Name</ProductCard.Name>
        <ProductCard.Price>$99.00</ProductCard.Price>
        <ProductCard.Actions>
          <ProductCard.Button>Add to cart</ProductCard.Button>
        </ProductCard.Actions>
      </ProductCard>`,
  metadata: { nestable: true },
}
