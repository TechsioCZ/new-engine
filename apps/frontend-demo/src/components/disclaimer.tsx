import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon"
import { tv } from "@techsio/ui-kit/utils"
import type { HTMLAttributes } from "react"
import type { VariantProps } from "tailwind-variants"

const disclaimerVariants = tv({
  slots: {
    root: [
      "flex items-start",
      "p-disclaimer",
      //'border border-disclaimer-border',
      "shadow-disclaimer",
    ],
    icon: "mt-disclaimer-icon-offset flex-shrink-0",
    content: "flex-1 text-disclaimer",
  },
  variants: {
    variant: {
      default: {
        root: "bg-disclaimer-default-bg text-disclaimer-default-fg",
        icon: "text-disclaimer-default-fg",
      },
      info: {
        root: "bg-disclaimer-info-bg text-disclaimer-info-fg",
        icon: "text-disclaimer-info-fg",
      },
      warning: {
        root: "bg-disclaimer-warning-bg text-disclaimer-warning-fg",
        icon: "text-disclaimer-warning-fg",
      },
      error: {
        root: "bg-disclaimer-error-bg text-disclaimer-error-fg",
        icon: "text-disclaimer-error-fg",
      },
      success: {
        root: "bg-disclaimer-success-bg text-disclaimer-success-fg",
        icon: "text-disclaimer-success-fg",
      },
    },
    size: {
      sm: {
        root: "gap-disclaimer-gap-sm",
        content: "text-disclaimer-sm",
      },
      md: {
        root: "gap-disclaimer-gap-md",
        content: "text-disclaimer-md",
      },
      lg: {
        root: "gap-disclaimer-gap-lg",
        content: "text-disclaimer-lg",
      },
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
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
  info: "token-icon-info",
  warning: "token-icon-warning",
  error: "token-icon-error",
  success: "token-icon-success",
}

export function Disclaimer({
  variant = "info",
  size = "md",
  icon,
  hideIcon = false,
  children,
  className,
  ...props
}: DisclaimerProps) {
  const {
    root,
    icon: iconClass,
    content,
  } = disclaimerVariants({ variant, size })
  const displayIcon = icon || defaultIcons[variant]

  return (
    <div className={root({ className })} {...props}>
      {!hideIcon && displayIcon && (
        <Icon className={iconClass()} icon={displayIcon} size={size} />
      )}
      <div className={content()}>{children}</div>
    </div>
  )
}
