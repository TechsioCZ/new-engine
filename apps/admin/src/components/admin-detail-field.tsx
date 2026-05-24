import type { ReactNode } from "react"

export function AdminDetailFields({ children }: { children: ReactNode }) {
  return <div className="grid gap-250 px-400 py-350">{children}</div>
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
    <div className="grid grid-cols-[var(--spacing-56)_minmax(0,1fr)] items-start gap-300">
      <span className="font-bold text-fg-secondary text-xs">{label}</span>
      <strong className="font-semibold text-fg-primary text-sm [overflow-wrap:anywhere]">
        {displayValue}
      </strong>
    </div>
  )
}
