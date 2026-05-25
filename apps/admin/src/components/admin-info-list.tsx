import type { ReactNode } from "react"

export function AdminInfoList({ children }: { children: ReactNode }) {
  return <div className="grid gap-200 p-400">{children}</div>
}

export function AdminInfoItem({
  children,
  title,
}: {
  children: ReactNode
  title: ReactNode
}) {
  return (
    <article className="grid gap-100 rounded-md border border-border-primary bg-fill-base px-300 py-250">
      <strong className="font-bold text-fg-primary text-xs">{title}</strong>
      <span className="text-fg-secondary text-xs leading-normal">
        {children}
      </span>
    </article>
  )
}
