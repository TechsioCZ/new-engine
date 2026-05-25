import type { ReactNode } from "react"

export function AdminInfoList({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 p-8">{children}</div>
}

export function AdminInfoItem({
  children,
  title,
}: {
  children: ReactNode
  title: ReactNode
}) {
  return (
    <article className="grid gap-2 rounded-md border border-border-primary bg-fill-base px-6 py-5">
      <strong className="font-bold text-fg-primary text-xs">{title}</strong>
      <span className="text-fg-secondary text-xs leading-normal">
        {children}
      </span>
    </article>
  )
}
