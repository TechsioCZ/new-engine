import figma from "@figma/code-connect"
import { Image } from "./image"

figma.connect(
  Image,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=484-19",
  {
    imports: ['import { Image } from "@techsio/ui-kit/atoms/image"'],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
        full: "full",
      }),
    },
    example: ({ size }) => (
      <Image alt="Description" size={size} src="/image.jpg" />
    ),
  }
)
