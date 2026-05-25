import type { ReactNode } from "react"
import { Link } from "react-router-dom"

export function AdminLinkCardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(var(--container-3xs),100%),1fr))] gap-250">
      {children}
    </div>
  )
}

export function AdminLinkCard({
  children,
  to,
}: {
  children: ReactNode
  to: string
}) {
  return (
    <Link
      className="hover:-translate-y-50 focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width) focus-visible:outline-offset-(length:--default-ring-offset) grid min-h-48 content-start gap-200 rounded-md border border-border-primary bg-fill-base p-400 text-fg-primary transition-all duration-200 hover:bg-float hover:shadow-sm focus-visible:outline-ring motion-reduce:transition-none"
      to={to}
    >
      {children}
    </Link>
  )
}

export function AdminLinkCardTitle({ children }: { children: ReactNode }) {
  return (
    <strong className="font-bold text-fg-primary text-sm leading-tight">
      {children}
    </strong>
  )
}

export function AdminLinkCardDescription({
  children,
}: {
  children: ReactNode
}) {
  return (
    <span className="text-fg-secondary text-xs leading-normal">{children}</span>
  )
}
