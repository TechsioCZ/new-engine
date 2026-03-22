import type { HTMLAttributes, ReactNode, Ref } from "react"
import type { VariantProps } from "tailwind-variants"
import { tv } from "../utils"
import { Icon, type IconType } from "./icon"

const statusTextVariants = tv({
  slots: {
    base: "flex items-center",
    icon: "",
  },
  variants: {
    status: {
      error: "text-status-text-fg-error",
      success: "text-status-text-fg-success",
      warning: "text-status-text-fg-warning",
      default: "text-status-text-fg-default",
    },
    /* for long text */
    align: {
      start: {
        icon: "mt-status-text-icon-long-text self-start",
      },
      center: {},
    },
    size: {
      sm: {
        base: "gap-status-text-icon-gap-sm text-status-text-sm",
      },
      md: {
        base: "gap-status-text-icon-gap-md text-status-text-md",
      },
      lg: {
        base: "items-start gap-status-text-icon-gap-lg text-status-text-lg",
        icon: "mt-status-text-icon",
      },
    },
  },
  defaultVariants: {
    status: "default",
    size: "md",
    align: "center",
  },
})

const ICON_MAP = {
  error: "token-icon-status-text-error",
  success: "token-icon-status-text-success",
  warning: "token-icon-status-text-warning",
  default: undefined,
} as const

export type StatusTextProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof statusTextVariants> & {
  ref?: Ref<HTMLDivElement>
  icon?: IconType
  showIcon?: boolean
  children: ReactNode
}

export function StatusText({
  className,
  showIcon = false,
  status = "default",
  size = "md",
  align = "center",
  icon,
  children,
  ref,
  ...props
}: StatusTextProps) {
  const resolvedIcon = icon ?? ICON_MAP[status]

  const { base, icon: iconSlot } = statusTextVariants({
    status,
    size,
    align,
    className,
  })

  return (
    <div
      className={base({
        status,
        size,
        className,
      })}
      ref={ref}
      {...props}
    >
      {showIcon && resolvedIcon && (
        <Icon className={iconSlot()} icon={resolvedIcon} size={size} />
      )}
      <span>{children}</span>
    </div>
  )
}
