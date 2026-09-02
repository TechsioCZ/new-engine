// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-13220
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/atoms/image.tsx
// component=Image

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
  full: "full",
})

export default {
  id: "Image",
  imports: ['import { Image } from "@techsio/ui-kit/atoms/image"'],
  example: figma.tsx`<Image alt="Description"${figma.helpers.react.renderProp(
    "size",
    size,
  )} src="/image.jpg"/>`,
  metadata: { nestable: true },
}
