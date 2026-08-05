import figma from "@figma/code-connect"

import { Button } from "./button"
import type { IconType } from "./icon"

figma.connect(
  Button,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1-5627",
  {
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
    imports: ['import { Button } from "@techsio/ui-kit/atoms/button"'],
    props: {
      children: figma.string("children"),
      disabled: figma.enum("state", {
        default: false,
        hover: false,
        active: false,
        focus: false,
        disabled: true,
        loading: false,
      }),
      iconLeft: figma.instance<IconType | undefined>("iconLeft"),
      iconRight: figma.instance<IconType | undefined>("iconRight"),
      isLoading: figma.enum("state", {
        default: false,
        hover: false,
        active: false,
        focus: false,
        disabled: false,
        loading: true,
      }),
      loadingText: figma.string("loadingText"),
      showLeftIcon: figma.boolean("showLeftIcon"),
      showRightIcon: figma.boolean("showRightIcon"),
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
      theme: figma.enum("theme", {
        solid: "solid",
        light: "light",
        outlined: "outlined",
        borderless: "borderless",
      }),
      variant: figma.enum("variant", {
        primary: "primary",
        secondary: "secondary",
        tertiary: "tertiary",
        warning: "warning",
        danger: "danger",
      }),
    },
  },
)
