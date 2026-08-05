import figma from "@figma/code-connect"

import { Badge } from "./badge"

figma.connect(
  Badge,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1-7735",
  {
    example: ({ variant, size, children }) => (
      <Badge size={size} variant={variant}>
        {children}
      </Badge>
    ),
    imports: ['import { Badge } from "@techsio/ui-kit/atoms/badge"'],
    props: {
      children: figma.string("children"),
      size: figma.enum("size", {
        lg: "lg",
        md: "md",
        sm: "sm",
        xl: "xl",
      }),
      variant: figma.enum("variant", {
        danger: "danger",
        discount: "discount",
        info: "info",
        outline: "outline",
        primary: "primary",
        secondary: "secondary",
        success: "success",
        tertiary: "tertiary",
        warning: "warning",
      }),
    },
  },
)
