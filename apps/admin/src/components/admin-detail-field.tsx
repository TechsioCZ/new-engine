import type { ReactNode } from "react"

export function AdminDetailFields({ children }: { children: ReactNode }) {
  return <div className="admin-detail-fields">{children}</div>
}

export function AdminDetailField({
  fallback = "-",
  label,
  value,
}: {
  fallback?: ReactNode
  label: ReactNode
  value: ReactNode
}) {
  const displayValue =
    value === null || value === undefined || value === "" ? fallback : value

  return (
    <div className="admin-detail-field">
      <span>{label}</span>
      <strong>{displayValue}</strong>
    </div>
  )
}
