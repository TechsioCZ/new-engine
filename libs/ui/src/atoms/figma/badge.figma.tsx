import figma from "@figma/code-connect"
import { Badge } from "../badge"

figma.connect(
  Badge,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1-7735",
  {
    imports: ['import { Badge } from "@techsio/ui-kit/atoms/badge"'],
    props: {
      variant: figma.enum("variant", {
        primary: "primary",
        secondary: "secondary",
        tertiary: "tertiary",
        discount: "discount",
        info: "info",
        success: "success",
        warning: "warning",
        danger: "danger",
        outline: "outline",
      }),
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
        xl: "xl",
      }),
      children: figma.string("children"),
    },
    example: ({ variant, size, children }) => (
      <Badge size={size} variant={variant}>
        {children}
      </Badge>
    ),
  }
)
