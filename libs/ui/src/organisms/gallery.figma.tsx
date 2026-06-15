import figma from "@figma/code-connect"
import { Gallery } from "./gallery"

figma.connect(
  Gallery,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1392-68",
  {
    imports: ['import { Gallery } from "@libs/ui/organisms/gallery"'],
    props: {
      orientation: figma.enum("orientation", {
        vertical: "vertical",
        horizontal: "horizontal",
      }),
    },
    example: ({ orientation }) => (
      <Gallery
        items={[
          { id: "1", src: "/product-1.jpg", alt: "Product front" },
          { id: "2", src: "/product-2.jpg", alt: "Product side" },
          { id: "3", src: "/product-3.jpg", alt: "Product detail" },
        ]}
        orientation={orientation}
      />
    ),
  }
)
