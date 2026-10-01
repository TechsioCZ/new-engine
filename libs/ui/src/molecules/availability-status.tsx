/**
 * AvailabilityStatus — @techsio/ui-kit molecule.
 *
 * @component AvailabilityStatus
 * @componentVersion v1.0.0
 * @skill availability-status-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the availability-status-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { HTMLAttributes, Ref } from "react"
import { Icon, type IconType } from "../atoms/icon"
import { Skeleton } from "../atoms/skeleton"
import { tv } from "../utils"

const availabilityStatusVariants = tv({
  slots: {
    root: "flex min-w-0 flex-col gap-availability-status",
    summary: "flex min-w-0 items-start gap-availability-status-summary",
    icon: "size-availability-status-icon shrink-0",
    content: "flex min-w-0 flex-col gap-availability-status-content",
    label:
      "break-words font-availability-status-label text-availability-status-label",
    detail:
      "break-words text-availability-status-detail text-availability-status-detail-fg",
    pending:
      "w-availability-status-pending max-w-full gap-availability-status-pending",
    pendingLine: "h-availability-status-pending-line",
  },
  variants: {
    status: {
      available: {
        icon: "text-availability-status-fg-available",
        label: "text-availability-status-fg-available",
      },
      limited: {
        icon: "text-availability-status-fg-limited",
        label: "text-availability-status-fg-limited",
      },
      preorder: {
        icon: "text-availability-status-fg-preorder",
        label: "text-availability-status-fg-preorder",
      },
      unavailable: {
        icon: "text-availability-status-fg-unavailable",
        label: "text-availability-status-fg-unavailable",
      },
      unknown: {
        icon: "text-availability-status-fg-unknown",
        label: "text-availability-status-fg-unknown",
      },
      pending: {},
    },
  },
})

const defaultIcons = {
  available: "token-icon-availability-status-available",
  limited: "token-icon-availability-status-limited",
  preorder: "token-icon-availability-status-preorder",
  unavailable: "token-icon-availability-status-unavailable",
  unknown: "token-icon-availability-status-unknown",
} satisfies Record<SettledAvailability, IconType>

type AvailabilityStatusNativeProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  ref?: Ref<HTMLDivElement>
}

type SettledAvailability =
  | "available"
  | "limited"
  | "preorder"
  | "unavailable"
  | "unknown"

type SettledAvailabilityProps = {
  status: SettledAvailability
  label: string
  detail?: string
  icon?: IconType
  showIcon?: boolean
  pendingLabel?: never
}

type PendingAvailabilityProps = {
  status: "pending"
  pendingLabel: string
  label?: never
  detail?: never
  icon?: never
  showIcon?: never
}

export type AvailabilityStatusProps = AvailabilityStatusNativeProps &
  (SettledAvailabilityProps | PendingAvailabilityProps)

export function AvailabilityStatus({
  status,
  label,
  detail,
  icon,
  showIcon = true,
  pendingLabel,
  className,
  ref,
  ...props
}: AvailabilityStatusProps) {
  const styles = availabilityStatusVariants({ status })

  return (
    <div
      className={styles.root({ className })}
      {...props}
      data-status={status}
      ref={ref}
    >
      {status === "pending" ? (
        <Skeleton.Text
          aria-label={pendingLabel}
          className={styles.pendingLine()}
          containerClassName={styles.pending()}
          isLoaded={false}
          noOfLines={2}
          size="sm"
        />
      ) : (
        <div className={styles.summary()}>
          {showIcon ? (
            <Icon
              className={styles.icon()}
              icon={icon ?? defaultIcons[status]}
            />
          ) : null}
          <div className={styles.content()}>
            <span className={styles.label()}>{label}</span>
            {detail ? <span className={styles.detail()}>{detail}</span> : null}
          </div>
        </div>
      )}
    </div>
  )
}
