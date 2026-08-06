import figma from "@figma/code-connect"

import type { IconType } from "./icon"
import { Icon } from "./icon"

figma.connect(
  Icon,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=365-170",
  {
    example: ({ color, size, icon }) => (
      <Icon color={color} icon={icon ?? "token-icon-plus"} size={size} />
    ),
    imports: ['import { Icon } from "@techsio/ui-kit/atoms/icon"'],
    props: {
      color: figma.enum("color", {
        current: "current",
        danger: "danger",
        primary: "primary",
        secondary: "secondary",
        success: "success",
        warning: "warning",
      }),
      icon: figma.instance<IconType | undefined>("icon"),
      size: figma.enum("size", {
        "2xl": "2xl",
        current: "current",
        lg: "lg",
        md: "md",
        sm: "sm",
        xl: "xl",
        xs: "xs",
      }),
    },
  },
)
