import type { ReactNode } from "react"

export function AdminPageHeader({
  children,
  eyebrow,
  title,
}: {
  children?: ReactNode
  eyebrow: ReactNode
  title: ReactNode
}) {
  return (
    <header className="admin-page-header">
      <div>
        <span className="admin-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      {children}
    </header>
  )
}

export function AdminPageCount({
  label,
  value,
}: {
  label: ReactNode
  value: ReactNode
}) {
  return (
    <div className="admin-page-count">
      <span>{value}</span>
      <small>{label}</small>
    </div>
  )
}

export function AdminPageHeaderActions({ children }: { children: ReactNode }) {
  return <div className="admin-header-actions">{children}</div>
}

export function AdminStatusRow({ children }: { children: ReactNode }) {
  return <div className="admin-status-row">{children}</div>
}
