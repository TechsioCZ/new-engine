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
    "flex items-center justify-between gap-300 border-border-primary border-b px-400 py-350",
    stacked ? "items-end max-admin-layout:items-start" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ")

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
