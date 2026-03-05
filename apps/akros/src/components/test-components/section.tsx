import type { ReactNode } from "react"

export function TestComponentsSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-md border border-border-primary bg-surface p-400">
      <header className="mb-300 flex flex-col gap-100">
        <h2 className="text-xl font-semibold">{title}</h2>
        {description ? <p className="text-md text-fg-secondary">{description}</p> : null}
      </header>
      {children}
    </section>
  )
}
