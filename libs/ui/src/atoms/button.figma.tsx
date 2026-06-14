import figma from "@figma/code-connect"
import { Button } from "./button"
import type { IconType } from "./icon"

figma.connect(
  Button,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1-5627",
  {
    imports: ['import { Button } from "@techsio/ui-kit/atoms/button"'],
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
      loadingText: figma.string("loadingText"),
      showLeftIcon: figma.boolean("showLeftIcon"),
      iconLeft: figma.instance<IconType | undefined>("iconLeft"),
      showRightIcon: figma.boolean("showRightIcon"),
      iconRight: figma.instance<IconType | undefined>("iconRight"),
      disabled: figma.enum("state", {
        default: false,
        hover: false,
        active: false,
        focus: false,
        disabled: true,
        loading: false,
      }),
      isLoading: figma.enum("state", {
        default: false,
        hover: false,
        active: false,
        focus: false,
        disabled: false,
        loading: true,
      }),
    },
    example: ({
      children,
      disabled,
      iconLeft,
      iconRight,
      showLeftIcon,
      showRightIcon,
      isLoading,
      loadingText,
      size,
      theme,
      variant,
    }) => {
      const sharedProps = {
        disabled,
        isLoading,
        loadingText,
        size,
        theme,
        variant,
      }

      if (showRightIcon) {
        return (
          <Button {...sharedProps} icon={iconRight} iconPosition="right">
            {children}
          </Button>
        )
      }

      if (showLeftIcon) {
        return (
          <Button {...sharedProps} icon={iconLeft} iconPosition="left">
            {children}
          </Button>
        )
      }

      return <Button {...sharedProps}>{children}</Button>
    },
  }
)
