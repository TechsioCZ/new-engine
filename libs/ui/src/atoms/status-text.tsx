/**
 * StatusText — @techsio/ui-kit atom.
 *
 * @component StatusText
 * @componentVersion v1.0.0
 * @skill status-text-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the status-text-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { HTMLAttributes, ReactNode, Ref } from "react"
import type { VariantProps } from "tailwind-variants"

import { tv } from "../utils"
import { Icon } from "./icon"
import type { IconType } from "./icon"

const statusTextVariants = tv({
  defaultVariants: {
    align: "center",
    size: "md",
    status: "default",
  },
  slots: {
    base: "flex items-center",
    icon: "",
  },
  variants: {
    status: {
      error: "text-status-text-fg-error",
      success: "text-status-text-fg-success",
      warning: "text-status-text-fg-warning",
      default: "text-status-text-fg",
    },
    /* for long text */
    align: {
      start: {
        icon: "mt-status-text-icon-offset-long-text self-start",
      },
      center: {},
    },
    size: {
      sm: {
        base: "gap-status-text-sm text-status-text-sm",
      },
      md: {
        base: "gap-status-text-md text-status-text-md",
      },
      lg: {
        base: "items-start gap-status-text-lg text-status-text-lg",
        icon: "mt-status-text-icon-offset",
      },
    },
  },
})

const ICON_MAP = {
  default: undefined,
  error: "token-icon-status-text-error",
  success: "token-icon-status-text-success",
  warning: "token-icon-status-text-warning",
} as const

export type StatusTextProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof statusTextVariants> & {
    ref?: Ref<HTMLDivElement> | undefined
    icon?: IconType | undefined
    showIcon?: boolean | undefined
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
    align,
    className,
    size,
    status,
  })

  return (
    <div
      className={base({
        className,
        size,
        status,
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
