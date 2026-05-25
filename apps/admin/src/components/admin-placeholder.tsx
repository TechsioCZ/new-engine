import type { ReactNode } from "react"

export function AdminPlaceholder({
  children,
  title,
}: {
  children: ReactNode
  title: ReactNode
}) {
  return (
    <div className="grid gap-3 rounded-md border border-border-primary border-dashed bg-surface p-9 text-fg-secondary">
      <strong className="font-bold text-fg-primary text-sm">{title}</strong>
      <span className="max-w-3xl text-xs leading-normal">{children}</span>
    </div>
  )
}
