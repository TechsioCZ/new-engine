import type { ReactNode } from "react"
import { cx } from "../utils/cx"

export function AdminPanelHeader({
  actions,
  className,
  stacked = false,
  subtitle,
  title,
}: {
  actions?: ReactNode
  className?: string
  stacked?: boolean
  subtitle?: ReactNode
  title: ReactNode
}) {
  const headerClassName = cx(
    "flex items-center justify-between gap-6 border-border-primary border-b px-8 py-7",
    stacked ? "items-end max-admin-layout:items-start" : null,
    className
  )

  return (
    <div className={headerClassName}>
      <div>
        <h2 className="m-0 font-bold text-fg-primary text-md leading-tight">
          {title}
        </h2>
        {subtitle !== null && subtitle !== undefined && (
          <span className="text-fg-secondary text-sm leading-normal">
            {subtitle}
          </span>
        )}
      </div>
      {actions}
    </div>
  )
}
