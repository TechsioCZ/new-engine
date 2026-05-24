import type { ReactNode } from "react"

export function AdminPage({
  children,
  className,
  width = "default",
}: {
  children: ReactNode
  className?: string
  width?: "default" | "full" | "wide"
}) {
  const widthClassName = {
    default: "w-[min(var(--container-admin-page),100%)]",
    full: "w-full",
    wide: "w-[min(var(--container-admin-page-wide),100%)]",
  }[width]

  return (
    <section
      className={["flex flex-col gap-450", widthClassName, className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </section>
  )
}

export function AdminPageHeader({
  children,
  eyebrow,
  title,
}: {
  children?: ReactNode
  eyebrow: ReactNode
  title: ReactNode
}) {
  return (
    <header className="grid items-start justify-between gap-450 border-border-primary border-b pb-450 min-[861px]:flex min-[861px]:items-end">
      <div>
        <span className="font-bold text-fg-secondary text-xs uppercase tracking-normal">
          {eyebrow}
        </span>
        <h1 className="mt-250 mb-0 font-bold text-admin-page-title-sm text-fg-primary leading-none tracking-normal min-[861px]:text-admin-page-title">
          {title}
        </h1>
      </div>
      {children}
    </header>
  )
}

export function AdminPageCount({
  label,
  value,
}: {
  label: ReactNode
  value: ReactNode
}) {
  return (
    <div className="grid min-w-46 justify-items-start gap-50 min-[861px]:justify-items-end">
      <span className="font-bold text-admin-page-count leading-none">
        {value}
      </span>
      <small className="font-semibold text-fg-secondary text-xs">{label}</small>
    </div>
  )
}

export function AdminPageHeaderActions({ children }: { children: ReactNode }) {
  return (
    <div className="grid justify-items-start gap-200 min-[861px]:justify-items-end">
      {children}
    </div>
  )
}

export function AdminStatusRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-start gap-150 min-[861px]:justify-end">
      {children}
    </div>
  )
}
