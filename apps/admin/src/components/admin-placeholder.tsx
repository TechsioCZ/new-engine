import type { ReactNode } from "react"

export function AdminPlaceholder({
  children,
  title,
}: {
  children: ReactNode
  title: ReactNode
}) {
  return (
    <div className="grid gap-150 rounded-md border border-border-primary border-dashed bg-surface p-450 text-fg-secondary">
      <strong className="font-bold text-fg-primary text-sm">{title}</strong>
      <span className="max-w-3xl text-xs leading-normal">{children}</span>
    </div>
  )
}
