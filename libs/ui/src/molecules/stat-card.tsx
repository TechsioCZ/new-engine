/**
 * StatCard — @techsio/ui-kit molecule.
 *
 * @component StatCard
 * @componentVersion v1.0.0
 * @skill stat-card-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the stat-card-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { HTMLAttributes, ReactNode, Ref } from "react"
import { Badge } from "../atoms/badge"
import { Icon, type IconType } from "../atoms/icon"
import { hasContent } from "../internal/has-content"
import { useUIDefaults } from "../theme/ui-provider"
import { tv } from "../utils"

const statCardVariants = tv({
  slots: {
    root: "surface-tile flex min-w-0 flex-col gap-stat-card p-stat-card",
    label:
      "flex min-w-0 items-center gap-stat-card-label text-stat-card-label-fg text-stat-card-label-size",
    valueRow: "flex flex-wrap items-baseline gap-stat-card-value-row",
    value: "font-stat-card-value text-stat-card-value-fg tabular-nums",
    hint: "text-stat-card-hint-fg text-stat-card-hint-size",
    action: "mt-auto flex pt-stat-card-action",
  },
  variants: {
    size: {
      sm: { value: "text-stat-card-value-sm" },
      md: { value: "text-stat-card-value-md" },
    },
  },
  defaultVariants: { size: "md" },
})

const statRowVariants = tv({
  base: "grid grid-cols-1 gap-stat-row sm:grid-cols-2 xl:grid-cols-4",
})

export type StatTrend = "up" | "down" | "flat"

const trendSeverity = {
  up: "success",
  down: "danger",
  flat: "neutral",
} as const satisfies Record<StatTrend, string>

export type StatCardProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode
  /** Already formatted, e.g. with `Intl.NumberFormat`. */
  value: ReactNode
  /** The change against the previous period, already formatted (`+12 %`). */
  delta?: string
  /** Colours the delta: up is good, down is bad, flat is neutral. */
  trend?: StatTrend
  /** One quiet line under the value, such as what the number counts. */
  hint?: ReactNode
  icon?: IconType
  /** A quiet follow-up, such as a link to the records behind the number. */
  action?: ReactNode
  /** `sm` for dense rows and long values. */
  size?: "sm" | "md"
  ref?: Ref<HTMLDivElement>
}

/** KPI tile: label, dominant value, optional trend badge. Tinted, never outlined. */
export function StatCard({
  label,
  value,
  delta,
  trend = "flat",
  hint,
  icon,
  action,
  size: sizeProp,
  className,
  ref,
  ...props
}: StatCardProps) {
  const { size } = useUIDefaults(
    "StatCard",
    { size: sizeProp },
    statCardVariants
  )
  const styles = statCardVariants({ size })
  return (
    <div className={styles.root({ className })} ref={ref} {...props}>
      <span className={styles.label()}>
        {icon && <Icon aria-hidden="true" icon={icon} size="current" />}
        {label}
      </span>
      <div className={styles.valueRow()}>
        <span className={styles.value()}>{value}</span>
        {delta && (
          <Badge severity={trendSeverity[trend]} size="sm">
            {delta}
          </Badge>
        )}
      </div>
      {hasContent(hint) && <span className={styles.hint()}>{hint}</span>}
      {hasContent(action) && <div className={styles.action()}>{action}</div>}
    </div>
  )
}

StatCard.displayName = "StatCard"

export type StatRowProps = HTMLAttributes<HTMLDivElement> & {
  ref?: Ref<HTMLDivElement>
}

/** Responsive KPI grid: one column on phones, two from `sm`, four from `xl`. */
export function StatRow({ className, ref, ...props }: StatRowProps) {
  return <div className={statRowVariants({ className })} ref={ref} {...props} />
}

StatRow.displayName = "StatRow"
