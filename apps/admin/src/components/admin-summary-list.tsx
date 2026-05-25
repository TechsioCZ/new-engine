import type { ReactNode } from "react"
import { cx } from "../utils/cx"

export function AdminSummaryList({ children }: { children: ReactNode }) {
  return <dl className="grid px-400 py-200">{children}</dl>
}

export function AdminSummaryRow({
  children,
  emphasized = false,
  label,
}: {
  children: ReactNode
  emphasized?: boolean
  label: ReactNode
}) {
  return (
    <div
      className={cx(
        "flex items-center justify-between gap-450 border-border-secondary border-b border-dashed py-250 text-sm last:border-b-0",
        emphasized ? "font-bold text-fg-primary" : "text-fg-secondary"
      )}
    >
      <dt>{label}</dt>
      <dd className="m-0 font-semibold text-fg-primary">{children}</dd>
    </div>
  )
}
