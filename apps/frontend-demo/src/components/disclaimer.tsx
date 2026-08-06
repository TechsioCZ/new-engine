import { Icon } from "@techsio/ui-kit/atoms/icon"
import type { IconType } from "@techsio/ui-kit/atoms/icon"
import { tv } from "@techsio/ui-kit/utils"
import type { HTMLAttributes } from "react"
import type { VariantProps } from "tailwind-variants"

const disclaimerVariants = tv({
  defaultVariants: {
    size: "md",
    variant: "default",
  },
  slots: {
    content: "flex-1 text-disclaimer",
    icon: "mt-disclaimer-icon-offset flex-shrink-0",
    root: [
      "flex items-start",
      "p-disclaimer",
      //'border border-disclaimer-border',
      "shadow-disclaimer",
    ],
  },
  variants: {
    size: {
      lg: {
        content: "text-disclaimer-lg",
        root: "gap-disclaimer-gap-lg",
      },
      md: {
        content: "text-disclaimer-md",
        root: "gap-disclaimer-gap-md",
      },
      sm: {
        content: "text-disclaimer-sm",
        root: "gap-disclaimer-gap-sm",
      },
    },
    variant: {
      default: {
        icon: "text-disclaimer-default-fg",
        root: "bg-disclaimer-default-bg text-disclaimer-default-fg",
      },
      error: {
        icon: "text-disclaimer-error-fg",
        root: "bg-disclaimer-error-bg text-disclaimer-error-fg",
      },
      info: {
        icon: "text-disclaimer-info-fg",
        root: "bg-disclaimer-info-bg text-disclaimer-info-fg",
      },
      success: {
        icon: "text-disclaimer-success-fg",
        root: "bg-disclaimer-success-bg text-disclaimer-success-fg",
      },
      warning: {
        icon: "text-disclaimer-warning-fg",
        root: "bg-disclaimer-warning-bg text-disclaimer-warning-fg",
      },
    },
  },
})

type DisclaimerVariant = VariantProps<typeof disclaimerVariants>

export interface DisclaimerProps
  extends HTMLAttributes<HTMLDivElement>, DisclaimerVariant {
  icon?: IconType
  hideIcon?: boolean
}

const defaultIcons: Record<string, IconType> = {
  default: "token-icon-info",
  error: "token-icon-error",
  info: "token-icon-info",
  success: "token-icon-success",
  warning: "token-icon-warning",
}

export const Disclaimer = ({
  variant = "info",
  size = "md",
  icon,
  hideIcon = false,
  children,
  className,
  ...props
}: DisclaimerProps) => {
  const {
    root,
    icon: iconClass,
    content,
  } = disclaimerVariants({ size, variant })
  const displayIcon = icon ?? defaultIcons[variant]

  return (
    <div className={root({ className })} {...props}>
      {!hideIcon && displayIcon && (
        <Icon className={iconClass()} icon={displayIcon} size={size} />
      )}
      <div className={content()}>{children}</div>
    </div>
  )
}
