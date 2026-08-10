import figma from "@figma/code-connect"

import { LinkButton } from "./link-button"

figma.connect(
  LinkButton,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1358-1944",
  {
    example: ({ variant, theme, size, children, disabled }) => (
      <LinkButton
        disabled={disabled}
        href="#"
        size={size}
        theme={theme}
        variant={variant}
      >
        {children}
      </LinkButton>
    ),
    imports: ['import { LinkButton } from "@techsio/ui-kit/atoms/link-button"'],
    props: {
      children: figma.string("children"),
      disabled: figma.enum("state", {
        default: false,
        disabled: true,
        hover: false,
      }),
      size: figma.enum("size", {
        lg: "lg",
        md: "md",
        sm: "sm",
      }),
      theme: figma.enum("theme", {
        borderless: "borderless",
        light: "light",
        outlined: "outlined",
        solid: "solid",
      }),
      variant: figma.enum("variant", {
        danger: "danger",
        primary: "primary",
        secondary: "secondary",
        tertiary: "tertiary",
        warning: "warning",
      }),
    },
  },
)
