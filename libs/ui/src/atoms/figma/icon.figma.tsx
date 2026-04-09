import figma from "@figma/code-connect"
import { Icon } from "../icon"

figma.connect(
  Icon,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=365-170",
  {
    imports: ['import { Icon } from "@techsio/ui-kit/atoms/icon"'],
    props: {
      size: figma.enum("size", {
        current: "current",
        xs: "xs",
        sm: "sm",
        md: "md",
        lg: "lg",
        xl: "xl",
        "2xl": "2xl",
      }),
      color: figma.enum("color", {
        current: "current",
        primary: "primary",
        secondary: "secondary",
        danger: "danger",
        success: "success",
        warning: "warning",
      }),
      icon: figma.instance("icon"),
    },
    example: ({ color, size }) => (
      <Icon icon="token-icon-plus" size={size} color={color} />
    ),
  },
)
