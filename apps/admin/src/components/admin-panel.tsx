import type { ReactNode } from "react"

type AdminPanelElement = "aside" | "div" | "section"

export function AdminPanel({
  as: Component = "section",
  children,
  className,
  ...props
}: {
  "aria-busy"?: boolean
  as?: AdminPanelElement
  children: ReactNode
  className?: string
}) {
  return (
    <Component
      className={[
        "overflow-hidden rounded-md border border-border-primary bg-surface",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </Component>
  )
}

export function AdminSplitLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(var(--container-sm),0.75fr)] items-start gap-400 max-admin-layout:grid-cols-1">
      {children}
    </div>
  )
}

export function AdminDetailLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(var(--container-xs),0.7fr)] items-start gap-400 max-admin-layout:grid-cols-1">
      {children}
    </div>
  )
}

export function AdminDetailStack({
  as: Component = "div",
  children,
}: {
  as?: "aside" | "div"
  children: ReactNode
}) {
  return <Component className="grid gap-400">{children}</Component>
}

export function AdminAddressGrid({ children }: { children: ReactNode }) {
  return (
    <section className="grid grid-cols-2 gap-400 max-admin-layout:grid-cols-1">
      {children}
    </section>
  )
}
