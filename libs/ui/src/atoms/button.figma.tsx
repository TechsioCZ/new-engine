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
        active: false,
        default: false,
        disabled: true,
        focus: false,
        hover: false,
        loading: false,
      }),
      iconLeft: figma.instance<IconType | undefined>("iconLeft"),
      iconRight: figma.instance<IconType | undefined>("iconRight"),
      isLoading: figma.enum("state", {
        active: false,
        default: false,
        disabled: false,
        focus: false,
        hover: false,
        loading: true,
      }),
      loadingText: figma.string("loadingText"),
      showLeftIcon: figma.boolean("showLeftIcon"),
      showRightIcon: figma.boolean("showRightIcon"),
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
