import figma from "@figma/code-connect"
import { LinkButton } from "./link-button"

figma.connect(
  LinkButton,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1358-1944",
  {
    imports: ['import { LinkButton } from "@techsio/ui-kit/atoms/link-button"'],
    props: {
      variant: figma.enum("variant", {
        primary: "primary",
        secondary: "secondary",
        tertiary: "tertiary",
        warning: "warning",
        danger: "danger",
      }),
      theme: figma.enum("theme", {
        solid: "solid",
        light: "light",
        outlined: "outlined",
        borderless: "borderless",
      }),
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
      children: figma.string("children"),
      disabled: figma.enum("state", {
        default: false,
        hover: false,
        disabled: true,
      }),
    },
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
  }
)
