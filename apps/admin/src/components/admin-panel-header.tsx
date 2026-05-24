import type { ReactNode } from "react"

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
  const headerClassName = [
    "admin-panel-header",
    stacked ? "admin-panel-header-stacked" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={headerClassName}>
      <div>
        <h2>{title}</h2>
        {subtitle !== null && subtitle !== undefined && <span>{subtitle}</span>}
      </div>
      {actions}
    </div>
  )
}
