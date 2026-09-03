// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-38963
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/organisms/gallery.tsx
// component=Gallery

import figma from "figma"

const orientation = figma.selectedInstance.getEnum("orientation", {
  vertical: "vertical",
  horizontal: "horizontal",
})

export default {
  id: "Gallery",
  imports: ['import { Gallery } from "@techsio/ui-kit/organisms/gallery"'],
  example: figma.code`<Gallery items={[
        { id: "1", src: "/product-1.jpg", alt: "Product front" },
        { id: "2", src: "/product-2.jpg", alt: "Product side" },
        { id: "3", src: "/product-3.jpg", alt: "Product detail" },
    ]}${figma.helpers.react.renderProp("orientation", orientation)}/>`,
  metadata: { nestable: true },
}
