// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-35761
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/carousel.tsx
// component=Carousel

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})
const align = figma.selectedInstance.getEnum("Alignment", {
  Left: "start",
  Center: "center",
})

export default {
  id: "Carousel",
  imports: ['import { Carousel } from "@libs/ui/molecules/carousel"'],
  example: figma.tsx`<Carousel${figma.helpers.react.renderProp(
    "align",
    align
  )}${figma.helpers.react.renderProp("size", size)} slideCount={2}>
        <Carousel.Slide index={0}>Slide 1</Carousel.Slide>
        <Carousel.Slide index={1}>Slide 2</Carousel.Slide>
      </Carousel>`,
  metadata: { nestable: true },
}
