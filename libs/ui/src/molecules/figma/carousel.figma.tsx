import figma from "@figma/code-connect"
import { Carousel } from "../carousel"

figma.connect(
  Carousel,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1190-50",
  {
    imports: ['import { Carousel } from "@techsio/ui-kit/molecules/carousel"'],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
      orientation: figma.enum("orientation", {
        horizontal: "horizontal",
        vertical: "vertical",
      }),
    },
    example: ({ size, orientation }) => (
      <Carousel size={size} orientation={orientation} slideCount={2}>
        <Carousel.Slide index={0}>Slide 1</Carousel.Slide>
        <Carousel.Slide index={1}>Slide 2</Carousel.Slide>
      </Carousel>
    ),
  }
)
