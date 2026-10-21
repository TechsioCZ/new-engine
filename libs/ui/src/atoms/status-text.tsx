/**
 * StatusText — @techsio/ui-kit atom.
 *
 * @component StatusText
 * @componentVersion v1.1.0
 * @skill status-text-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the status-text-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { HTMLAttributes, ReactNode, Ref } from "react"
import type { VariantProps } from "tailwind-variants"
import { tv } from "../utils"
import { Icon, type IconType } from "./icon"

const statusTextVariants = tv({
  slots: {
    base: "flex",
    icon: "inline-flex h-status-text-icon-line shrink-0 items-center",
    message: "min-w-0 break-words",
  },
  variants: {
    status: {
      error: "text-status-text-fg-error",
      success: "text-status-text-fg-success",
      warning: "text-status-text-fg-warning",
      default: "text-status-text-fg",
    },
    align: {
      start: { base: "items-start" },
      center: { base: "items-center" },
    },
    size: {
      sm: {
        base: "gap-status-text-sm text-status-text-sm",
      },
      md: {
        base: "gap-status-text-md text-status-text-md",
      },
      lg: {
        base: "gap-status-text-lg text-status-text-lg",
      },
    },
  },
  defaultVariants: {
    status: "default",
    size: "md",
    align: "start",
  },
})

const ICON_MAP = {
  error: "token-icon-status-text-error",
  success: "token-icon-status-text-success",
  warning: "token-icon-status-text-warning",
  default: undefined,
} as const

const LIVE_ROLE_MAP = {
  error: "alert",
  success: "status",
  warning: "status",
  default: undefined,
} as const

export type StatusTextProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof statusTextVariants> & {
    ref?: Ref<HTMLDivElement>
    /** Decorative override; neutral helper text has no default icon. */
    icon?: IconType
    /** Defaults to true. Keep enabled for error/warning/success field feedback. */
    showIcon?: boolean
    children: ReactNode
  }

export function StatusText({
  className,
  showIcon = true,
  status = "default",
  size = "md",
  align = "start",
  icon,
  children,
  ref,
  ...props
}: StatusTextProps) {
  const resolvedIcon = icon ?? ICON_MAP[status]
  // Validation feedback must reach assistive tech when it appears: errors
  // interrupt (alert), warning/success are polite (status). Plain helper text
  // stays silent — it is read through the control's aria-describedby.
  const liveRole = LIVE_ROLE_MAP[status]

  const {
    base,
    icon: iconSlot,
    message,
  } = statusTextVariants({
    status,
    size,
    align,
  })

  return (
    <div
      className={base({
        status,
        size,
        className,
      })}
      data-status={status}
      ref={ref}
      role={liveRole}
      {...props}
    >
      {showIcon && resolvedIcon && (
        <span aria-hidden="true" className={iconSlot()}>
          <Icon aria-hidden="true" icon={resolvedIcon} size="current" />
        </span>
      )}
      <span className={message()}>{children}</span>
    </div>
  )
}
