import figma from "@figma/code-connect"
import { ProductCard } from "../product-card"

figma.connect(
  ProductCard,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1182-51",
  {
    imports: ['import { ProductCard } from "@techsio/ui-kit/molecules/product-card"'],
    props: {
      layout: figma.enum("layout", {
        column: "column",
        row: "row",
      }),
    },
    example: ({ layout }) => (
      <ProductCard layout={layout}>
        <ProductCard.Image src="/product.jpg" alt="Product" />
        <ProductCard.Name>Product Name</ProductCard.Name>
        <ProductCard.Price>$99.00</ProductCard.Price>
        <ProductCard.Actions>
          <ProductCard.Button>Add to cart</ProductCard.Button>
        </ProductCard.Actions>
      </ProductCard>
    ),
  }
)
